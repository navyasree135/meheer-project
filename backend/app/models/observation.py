from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Date, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base

class Observation(Base):
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(String(64), ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    seq_no = Column(Integer, nullable=True)
    
    # Natural key and suffix
    observation_id = Column(String(64), index=True, nullable=False)
    has_suffix_s = Column(Boolean, default=False, index=True)
    
    # Occurrence Date & Week Buckets
    occurrence_date = Column(Date, index=True, nullable=False)
    occurrence_iso_year = Column(Integer, index=True, nullable=False)
    occurrence_iso_week = Column(Integer, index=True, nullable=False)
    occurrence_week_label = Column(String(64), index=True, nullable=False) # e.g. "Week of Aug 3, 2026"
    
    # Hierarchy: Category, Sub-Category, Detail
    raw_type = Column(String(512), nullable=True)
    category = Column(String(128), index=True, nullable=False) # e.g. Unsafe Condition, Unsafe Act, Best Practices, QA - Observations, LSR Violation
    sub_category = Column(String(128), index=True, nullable=True)
    detail = Column(String(255), index=True, nullable=True)
    
    # Description
    description = Column(Text, nullable=True)
    
    # Location Hierarchy: Unit, Sub-Location, Exact Location
    raw_location = Column(String(512), nullable=True)
    unit = Column(String(64), index=True, nullable=False) # e.g. Unit 05, Unit 41, Unit 03, Unit 02, Unit 13, R&D
    sub_location = Column(String(128), index=True, nullable=True)
    exact_location = Column(String(255), nullable=True) # Normalized from '--' to NULL
    
    # Reported Date & Lag
    reported_on = Column(Date, index=True, nullable=True)
    reported_iso_year = Column(Integer, nullable=True)
    reported_iso_week = Column(Integer, nullable=True)
    reported_week_label = Column(String(64), nullable=True)
    reporting_lag_days = Column(Integer, default=0) # reported_on - occurrence_date
    
    # Severity & Status
    risk_level = Column(String(32), index=True, default="Unclassified") # Minor, Serious, Fatal, Unclassified
    observation_status = Column(String(64), index=True, default="Open") # Open, Overdue, In Progress
    pair_present = Column(Boolean, default=False, index=True)
    
    # Closure & Action metadata
    closure_date = Column(Date, nullable=True)
    closed_by = Column(String(128), nullable=True) # Normalized from '--' to NULL
    reason_for_no_actions = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    dataset = relationship("Dataset", back_populates="observations")
    actions = relationship("Action", back_populates="observation", cascade="all, delete-orphan", order_by="Action.action_number")

    __table_args__ = (
        Index("idx_dataset_obs_id", "dataset_id", "observation_id", unique=True),
        Index("idx_obs_unit_category", "dataset_id", "unit", "category"),
        Index("idx_obs_week_risk", "dataset_id", "occurrence_iso_week", "risk_level"),
    )

    def to_dict(self, include_actions: bool = True):
        data = {
            "id": self.id,
            "dataset_id": self.dataset_id,
            "seq_no": self.seq_no,
            "observation_id": self.observation_id,
            "has_suffix_s": self.has_suffix_s,
            "occurrence_date": self.occurrence_date.isoformat() if self.occurrence_date else None,
            "occurrence_iso_year": self.occurrence_iso_year,
            "occurrence_iso_week": self.occurrence_iso_week,
            "occurrence_week_label": self.occurrence_week_label,
            "raw_type": self.raw_type,
            "category": self.category,
            "sub_category": self.sub_category,
            "detail": self.detail,
            "description": self.description,
            "raw_location": self.raw_location,
            "unit": self.unit,
            "sub_location": self.sub_location,
            "exact_location": self.exact_location,
            "reported_on": self.reported_on.isoformat() if self.reported_on else None,
            "reported_iso_year": self.reported_iso_year,
            "reported_iso_week": self.reported_iso_week,
            "reported_week_label": self.reported_week_label,
            "reporting_lag_days": self.reporting_lag_days,
            "risk_level": self.risk_level,
            "observation_status": self.observation_status,
            "pair_present": self.pair_present,
            "closure_date": self.closure_date.isoformat() if self.closure_date else None,
            "closed_by": self.closed_by,
            "reason_for_no_actions": self.reason_for_no_actions,
            "actions_count": len(self.actions) if self.actions is not None else 0,
            "has_actions": bool(self.actions and len(self.actions) > 0),
        }
        if include_actions:
            data["actions"] = [a.to_dict() for a in self.actions] if self.actions else []
        return data
