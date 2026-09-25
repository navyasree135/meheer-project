import os
import uuid
import logging
import threading
from typing import Optional
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, SessionLocal
from app.core.redis_client import cache_manager
from app.models import Dataset
from app.services.storage import storage_service
from app.services.parser import load_and_parse_file
from app.services.kafka_producer import kafka_producer
from app.services.kafka_consumer import process_stream_batch

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Upload & Ingestion Pipeline"])

def run_ingestion_pipeline_task(file_path: str, dataset_id: str, job_id: str):
    """
    Background worker that runs the full pipeline:
    1. Parse file from S3 / local path
    2. Stream rows one by one through Kafka (or stream processor)
    3. Ingest and unpivot child actions into Postgres
    4. Update Redis progress and warm cache
    """
    try:
        cache_manager.set_job_status(job_id, "Parsing Excel/CSV Document", 0, 0, status="PROCESSING")
        
        # Parse document
        rows = load_and_parse_file(file_path, dataset_id)
        total_rows = len(rows)
        logger.info(f"Parsed {total_rows} rows from {file_path} for dataset {dataset_id}")

        cache_manager.set_job_status(job_id, "Publishing to Kafka Topic", 0, total_rows, status="PROCESSING")
        
        # Publish each row to Kafka if producer is connected
        if kafka_producer.is_connected:
            for r in rows:
                r["job_id"] = job_id
                kafka_producer.publish_observation_row(settings.KAFKA_TOPIC_RAW, r, key=r["observation_id"])
            kafka_producer.flush()

        # Ingest and unpivot actions row-by-row with live Redis tracking
        process_stream_batch(rows, job_id, dataset_id)

    except Exception as e:
        logger.error(f"Failed pipeline execution for job {job_id}: {e}", exc_info=True)
        cache_manager.set_job_status(job_id, "Failed", 0, 0, status="FAILED", error=str(e))


@router.post("/upload")
async def upload_observations_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload an observations file (.xlsx or .csv).
    Saves to S3/MinIO first, initiates Kafka streaming ingestion, and returns a job_id for live progress tracking.
    """
    if not (file.filename.endswith(".xlsx") or file.filename.endswith(".xls") or file.filename.endswith(".csv")):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel (.xlsx/.xls) or CSV file.")

    dataset_id = f"ds_{uuid.uuid4().hex[:12]}"
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    filename = f"{dataset_id}_{file.filename}"

    # 1. Store in S3 / MinIO
    try:
        s3_path = storage_service.upload_file(file.file, filename, content_type=file.content_type)
        local_path = storage_service.get_file_path(s3_path)
    except Exception as e:
        logger.error(f"Storage error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to store file in object storage: {str(e)}")

    # 2. Record dataset in DB
    new_dataset = Dataset(
        id=dataset_id,
        filename=file.filename,
        s3_key=s3_path,
        is_active=True,
        status="PROCESSING"
    )
    db.add(new_dataset)
    db.commit()

    # 3. Initialize Redis Job Tracker
    cache_manager.set_job_status(job_id, "Storing in S3 Object Storage", 0, 0, status="PROCESSING")

    # 4. Dispatch background ingestion worker
    threading.Thread(
        target=run_ingestion_pipeline_task,
        args=(local_path, dataset_id, job_id),
        daemon=True
    ).start()

    return {
        "success": True,
        "job_id": job_id,
        "dataset_id": dataset_id,
        "filename": file.filename,
        "message": "File uploaded and stored in S3. Streaming ingestion pipeline initiated."
    }


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """
    Polls live ingestion progress (stage, processed_count, total_count, percent, status).
    """
    status = cache_manager.get_job_status(job_id)
    return status


@router.post("/seed-sample")
async def seed_sample_dataset(db: Session = Depends(get_db)):
    """
    One-click demo action: loads the official Observations.xlsx sample (1,974 rows)
    through the S3 + Kafka + Redis streaming pipeline.
    """
    sample_file = "data/Observations.xlsx"
    if not os.path.exists(sample_file):
        from app.services.generator import generate_sample_observations_excel
        generate_sample_observations_excel(sample_file)

    dataset_id = f"ds_sample_{uuid.uuid4().hex[:8]}"
    job_id = f"job_sample_{uuid.uuid4().hex[:8]}"

    # Save to storage
    with open(sample_file, "rb") as f:
        s3_path = storage_service.upload_file(f, f"{dataset_id}_Observations.xlsx")
        local_path = storage_service.get_file_path(s3_path)

    new_dataset = Dataset(
        id=dataset_id,
        filename="Observations.xlsx (August 2026 Sample)",
        s3_key=s3_path,
        is_active=True,
        status="PROCESSING"
    )
    db.add(new_dataset)
    db.commit()

    cache_manager.set_job_status(job_id, "Initializing Sample Pipeline", 0, 1974, status="PROCESSING")

    threading.Thread(
        target=run_ingestion_pipeline_task,
        args=(local_path, dataset_id, job_id),
        daemon=True
    ).start()

    return {
        "success": True,
        "job_id": job_id,
        "dataset_id": dataset_id,
        "message": "Sample Observations.xlsx streaming ingestion started."
    }
