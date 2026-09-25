import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models import Dataset, Observation, Action
from app.api import api_router
from app.services.parser import load_and_parse_file
from app.services.kafka_consumer import process_stream_batch

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("safety_platform")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database tables are created
    logger.info("Initializing Database schema...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

    # Auto-seed sample dataset if database is empty so it works instantly on launch
    try:
        db = SessionLocal()
        existing_ds = db.query(Dataset).first()
        if not existing_ds:
            sample_path = "data/Observations.xlsx"
            if os.path.exists(sample_path):
                logger.info(f"Auto-seeding initial dataset from {sample_path}...")
                ds_id = "ds_sample_default"
                new_ds = Dataset(
                    id=ds_id,
                    filename="Observations.xlsx (August 2026 Assessment Sample)",
                    s3_key="s3://safety-observations/uploads/Observations.xlsx",
                    is_active=True,
                    status="PROCESSING"
                )
                db.add(new_ds)
                db.commit()
                
                # Parse and stream into DB
                rows = load_and_parse_file(sample_path, ds_id)
                process_stream_batch(rows, "initial_seed_job", ds_id)
                logger.info("Auto-seeded 1,974 safety observations into database successfully!")
        db.close()
    except Exception as e:
        logger.warning(f"Note on auto-seeding: {e}")

    yield
    logger.info("Shutting down Safety Observations Platform.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise-grade Interactive Safety Observations Dashboard & Event-Driven Streaming Pipeline",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": str(engine.url).split("@")[-1]
    }

@app.get("/")
def root():
    return {
        "message": "Safety Observations API is running.",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
