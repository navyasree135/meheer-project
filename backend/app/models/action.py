from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base

class Action(Base):
    __tablename__ = "actions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_db_id = Column(Integer, ForeignKey("observations.id", ondelete="CASCADE"), index=True, nullable=False)
    observation_id = Column(String(64), index=True, nullable=False) # Natural key of parent observation
    action_number = Column(Integer, nullable=False) # 1, 2, or 3
    
    action_text = Column(Text, nullable=True)
    status = Column(String(64), index=True, default="Open") # Open, Overdue, Completed, Closed, In Progress
    due_date = Column(Date, nullable=True)
    closure_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to parent observation
    observation = relationship("Observation", back_populates="actions")

    __table_args__ = (
        Index("idx_action_obs_status", "observation_db_id", "status"),
        Index("idx_action_status_number", "status", "action_number"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "observation_db_id": self.observation_db_id,
            "observation_id": self.observation_id,
            "action_number": self.action_number,
            "action_text": self.action_text,
            "status": self.status,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "closure_date": self.closure_date.isoformat() if self.closure_date else None,
            "remarks": self.remarks,
        }
