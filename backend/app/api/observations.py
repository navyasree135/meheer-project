from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.core.database import get_db
from app.models import Observation, Action
from app.services.analytics import build_filter_query

router = APIRouter(prefix="/observations", tags=["Observations Data"])

@router.get("")
async def list_observations(
    dataset_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    units: Optional[List[str]] = Query(None),
    categories: Optional[List[str]] = Query(None),
    risk_levels: Optional[List[str]] = Query(None),
    observation_statuses: Optional[List[str]] = Query(None),
    pair_present: Optional[bool] = None,
    search: Optional[str] = None,
    has_actions: Optional[bool] = None,
    date_mode: Optional[str] = "occurrence",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    sort_by: str = "occurrence_date",
    sort_order: str = "desc",
    db: Session = Depends(get_db)
):
    filters = {
        "start_date": start_date, "end_date": end_date, "units": units,
        "categories": categories, "risk_levels": risk_levels,
        "observation_statuses": observation_statuses, "pair_present": pair_present,
        "date_mode": date_mode, "search": search
    }

    query, _ = build_filter_query(db, dataset_id, filters)

    if has_actions is not None:
        if has_actions:
            query = query.filter(Observation.actions.any())
        else:
            query = query.filter(~Observation.actions.any())

    total_count = query.count()

    # Dynamic sorting
    sort_col = getattr(Observation, sort_by, Observation.occurrence_date)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    offset = (page - 1) * page_size
    observations = query.offset(offset).limit(page_size).all()

    return {
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 1,
        "items": [obs.to_dict(include_actions=True) for obs in observations]
    }


@router.get("/{id}")
async def get_observation_detail(id: int, db: Session = Depends(get_db)):
    obs = db.query(Observation).filter(Observation.id == id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")
    return obs.to_dict(include_actions=True)
