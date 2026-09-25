import logging
import socket
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)
Base = declarative_base()

def is_service_reachable(host: str, port: int = 5432) -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.15):
            return True
    except Exception:
        return False

def get_engine():
    db_url = settings.DATABASE_URL
    if "postgres" in db_url:
        parsed = urlparse(db_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 5432
        if is_service_reachable(host, port):
            try:
                if db_url.startswith("postgresql://"):
                    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
                engine = create_engine(
                    db_url,
                    pool_pre_ping=True,
                    pool_size=10,
                    max_overflow=20
                )
                with engine.connect() as conn:
                    pass
                logger.info(f"Connected to PostgreSQL database at {host}:{port}")
                return engine
            except Exception as e:
                logger.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite.")
        else:
            logger.info("PostgreSQL service is offline. Using local SQLite database engine.")

    # SQLite Fallback
    engine = create_engine(
        settings.FALLBACK_SQLITE_URL,
        connect_args={"check_same_thread": False}
    )
    return engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
