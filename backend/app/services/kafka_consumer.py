import json
import logging
import time
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from kafka import KafkaConsumer
from kafka.errors import KafkaError

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.redis_client import cache_manager
from app.models import Dataset, Observation, Action

logger = logging.getLogger(__name__)

def parse_date_safely(val: Any) -> Optional[date]:
    if not val:
        return None
    if isinstance(val, date):
        return val
    try:
        return datetime.strptime(str(val).split("T")[0], "%Y-%m-%d").date()
    except Exception:
        return None

def ingest_single_observation_record(db: Session, row: Dict[str, Any]) -> Any:
    """
    Upserts a single observation record and its unpivoted child actions into the database.
    """
    dataset_id = row.get("dataset_id")
    obs_id = row.get("observation_id")
    
    # Check if observation already exists for this dataset
    existing_obs = db.query(Observation).filter(
        Observation.dataset_id == dataset_id,
        Observation.observation_id == obs_id
    ).first()

    occ_date = parse_date_safely(row.get("occurrence_date"))
    rep_date = parse_date_safely(row.get("reported_on"))
    cls_date = parse_date_safely(row.get("closure_date"))

    if existing_obs:
        # Update fields
        existing_obs.seq_no = row.get("seq_no")
        existing_obs.has_suffix_s = row.get("has_suffix_s", False)
        existing_obs.occurrence_date = occ_date
        existing_obs.occurrence_iso_year = row.get("occurrence_iso_year")
        existing_obs.occurrence_iso_week = row.get("occurrence_iso_week")
        existing_obs.occurrence_week_label = row.get("occurrence_week_label")
        existing_obs.raw_type = row.get("raw_type")
        existing_obs.category = row.get("category", "Unclassified")
        existing_obs.sub_category = row.get("sub_category")
        existing_obs.detail = row.get("detail")
        existing_obs.description = row.get("description")
        existing_obs.raw_location = row.get("raw_location")
        existing_obs.unit = row.get("unit", "Unknown Unit")
        existing_obs.sub_location = row.get("sub_location")
        existing_obs.exact_location = row.get("exact_location")
        existing_obs.reported_on = rep_date
        existing_obs.reported_iso_year = row.get("reported_iso_year")
        existing_obs.reported_iso_week = row.get("reported_iso_week")
        existing_obs.reported_week_label = row.get("reported_week_label")
        existing_obs.reporting_lag_days = row.get("reporting_lag_days", 0)
        existing_obs.risk_level = row.get("risk_level", "Unclassified")
        existing_obs.observation_status = row.get("observation_status", "Open")
        existing_obs.pair_present = row.get("pair_present", False)
        existing_obs.closure_date = cls_date
        existing_obs.closed_by = row.get("closed_by")
        existing_obs.reason_for_no_actions = row.get("reason_for_no_actions")
        
        # Clear existing actions to re-insert cleanly
        db.query(Action).filter(Action.observation_db_id == existing_obs.id).delete()
        db_obs = existing_obs
    else:
        # Create new
        db_obs = Observation(
            dataset_id=dataset_id,
            seq_no=row.get("seq_no"),
            observation_id=obs_id,
            has_suffix_s=row.get("has_suffix_s", False),
            occurrence_date=occ_date,
            occurrence_iso_year=row.get("occurrence_iso_year"),
            occurrence_iso_week=row.get("occurrence_iso_week"),
            occurrence_week_label=row.get("occurrence_week_label"),
            raw_type=row.get("raw_type"),
            category=row.get("category", "Unclassified"),
            sub_category=row.get("sub_category"),
            detail=row.get("detail"),
            description=row.get("description"),
            raw_location=row.get("raw_location"),
            unit=row.get("unit", "Unknown Unit"),
            sub_location=row.get("sub_location"),
            exact_location=row.get("exact_location"),
            reported_on=rep_date,
            reported_iso_year=row.get("reported_iso_year"),
            reported_iso_week=row.get("reported_iso_week"),
            reported_week_label=row.get("reported_week_label"),
            reporting_lag_days=row.get("reporting_lag_days", 0),
            risk_level=row.get("risk_level", "Unclassified"),
            observation_status=row.get("observation_status", "Open"),
            pair_present=row.get("pair_present", False),
            closure_date=cls_date,
            closed_by=row.get("closed_by"),
            reason_for_no_actions=row.get("reason_for_no_actions"),
        )
        db.add(db_obs)
        db.flush() # To obtain db_obs.id

    # Insert unpivoted child actions
    actions_data = row.get("actions", [])
    for act in actions_data:
        act_due = parse_date_safely(act.get("due_date"))
        act_cls = parse_date_safely(act.get("closure_date"))
        db_action = Action(
            observation_db_id=db_obs.id,
            observation_id=obs_id,
            action_number=act.get("action_number", 1),
            action_text=act.get("action_text"),
            status=act.get("status", "Open"),
            due_date=act_due,
            closure_date=act_cls,
            remarks=act.get("remarks"),
        )
        db.add(db_action)

    return db_obs

def process_stream_batch(rows: List[Dict[str, Any]], job_id: str, dataset_id: str):
    """
    Streams and ingests rows one at a time with live progress tracking in Redis.
    """
    total = len(rows)
    db = SessionLocal()
    try:
        cache_manager.set_job_status(job_id, "Consuming & Ingesting Stream", 0, total, status="PROCESSING")
        
        # Mark other datasets inactive
        db.query(Dataset).filter(Dataset.id != dataset_id).update({"is_active": False})
        
        # Update current dataset status
        dataset_obj = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if dataset_obj:
            dataset_obj.is_active = True
            dataset_obj.status = "PROCESSING"
        db.commit()

        processed = 0
        for i, row in enumerate(rows):
            ingest_single_observation_record(db, row)
            processed += 1
            
            # Commit in batches of 50 for performance and durability
            if processed % 50 == 0 or processed == total:
                db.commit()
                cache_manager.set_job_status(
                    job_id, 
                    "Consuming & Ingesting Stream", 
                    processed, 
                    total, 
                    status="PROCESSING"
                )
                
        # Finalize dataset
        if dataset_obj:
            dataset_obj.row_count = processed
            dataset_obj.status = "COMPLETED"
            dataset_obj.completed_at = datetime.utcnow()
            db.commit()

        # Invalidate existing cache for dashboard
        cache_manager.invalidate_prefix(f"dash:{dataset_id}")
        cache_manager.invalidate_prefix("dash:active")
        
        cache_manager.set_job_status(
            job_id,
            "Ready",
            processed,
            total,
            status="COMPLETED"
        )
        logger.info(f"Successfully processed {processed}/{total} rows for dataset {dataset_id}")

    except Exception as e:
        db.rollback()
        logger.error(f"Error in stream ingestion for job {job_id}: {e}", exc_info=True)
        cache_manager.set_job_status(
            job_id,
            "Failed",
            0,
            total,
            status="FAILED",
            error=str(e)
        )
        dataset_obj = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if dataset_obj:
            dataset_obj.status = "FAILED"
            db.commit()
    finally:
        db.close()


class SafetyKafkaConsumerService:
    def __init__(self):
        self.is_running = False

    def start_consumer_loop(self):
        """Starts Kafka consumer polling loop (for standalone worker or container)."""
        try:
            consumer = KafkaConsumer(
                settings.KAFKA_TOPIC_RAW,
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS.split(","),
                group_id=settings.KAFKA_CONSUMER_GROUP,
                auto_offset_reset="earliest",
                enable_auto_commit=True,
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                consumer_timeout_ms=1000
            )
            self.is_running = True
            logger.info(f"Kafka consumer started on topic {settings.KAFKA_TOPIC_RAW}")
            
            db = SessionLocal()
            while self.is_running:
                for message in consumer:
                    try:
                        row = message.value
                        job_id = row.get("job_id", "kafka_job")
                        ingest_single_observation_record(db, row)
                        db.commit()
                    except Exception as e:
                        db.rollback()
                        logger.error(f"Error consuming Kafka record: {e}")
        except Exception as e:
            logger.warning(f"Kafka consumer could not connect to {settings.KAFKA_BOOTSTRAP_SERVERS}: {e}")
        finally:
            if 'db' in locals():
                db.close()

consumer_service = SafetyKafkaConsumerService()
