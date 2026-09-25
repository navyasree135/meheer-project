from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    row_count = Column(Integer, default=0)
    s3_key = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    status = Column(String(32), default="PROCESSING") # PROCESSING, COMPLETED, FAILED
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    observations = relationship("Observation", back_populates="dataset", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "file_size_bytes": self.file_size_bytes,
            "row_count": self.row_count,
            "s3_key": self.s3_key,
            "is_active": self.is_active,
            "status": self.status,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
