import json
import hashlib
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.redis_client import cache_manager
from app.models import Dataset, Observation, Action
from app.services.analytics import (
    get_summary_kpis,
    get_trend_analysis,
    get_categories_breakdown,
    get_locations_breakdown,
    get_actions_analysis,
    get_repeated_observations_analysis,
    get_severity_top_bottom
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard Analytics"])

def generate_cache_key(prefix: str, dataset_id: Optional[str], **kwargs) -> str:
    serialized = json.dumps(kwargs, sort_keys=True, default=str)
    hash_sig = hashlib.md5(serialized.encode("utf-8")).hexdigest()[:10]
    ds = dataset_id or "active"
    return f"dash:{ds}:{prefix}:{hash_sig}"

@router.get("/summary")
async def dashboard_summary(
    dataset_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    units: Optional[List[str]] = Query(None),
    categories: Optional[List[str]] = Query(None),
    risk_levels: Optional[List[str]] = Query(None),
    observation_statuses: Optional[List[str]] = Query(None),
    pair_present: Optional[bool] = None,
    date_mode: Optional[str] = "occurrence",
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    filters = {
        "start_date": start_date, "end_date": end_date, "units": units,
        "categories": categories, "risk_levels": risk_levels,
        "observation_statuses": observation_statuses, "pair_present": pair_present,
        "date_mode": date_mode, "search": search
    }
    cache_key = generate_cache_key("summary", dataset_id, **filters)
    cached = cache_manager.get_json(cache_key)
    if cached:
        return cached

    result = get_summary_kpis(db, dataset_id, filters)
    cache_manager.set_json(cache_key, result, ttl=1800)
    return result


@router.get("/trend")
async def dashboard_trend(
    dataset_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    units: Optional[List[str]] = Query(None),
    categories: Optional[List[str]] = Query(None),
    risk_levels: Optional[List[str]] = Query(None),
    observation_statuses: Optional[List[str]] = Query(None),
    pair_present: Optional[bool] = None,
    date_mode: Optional[str] = "occurrence",
    db: Session = Depends(get_db)
):
    filters = {
        "start_date": start_date, "end_date": end_date, "units": units,
        "categories": categories, "risk_levels": risk_levels,
        "observation_statuses": observation_statuses, "pair_present": pair_present,
        "date_mode": date_mode
    }
    cache_key = generate_cache_key("trend", dataset_id, **filters)
    cached = cache_manager.get_json(cache_key)
    if cached:
        return cached

    result = get_trend_analysis(db, dataset_id, filters)
    cache_manager.set_json(cache_key, result, ttl=1800)
    return result


@router.get("/categories")
async def dashboard_categories(
    dataset_id: Optional[str] = None,
    drill_category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    units: Optional[List[str]] = Query(None),
    risk_levels: Optional[List[str]] = Query(None),
    date_mode: Optional[str] = "occurrence",
    db: Session = Depends(get_db)
):
    filters = {
        "start_date": start_date, "end_date": end_date, "units": units,
        "risk_levels": risk_levels, "date_mode": date_mode
    }
    cache_key = generate_cache_key(f"categories:{drill_category or 'all'}", dataset_id, **filters)
    cached = cache_manager.get_json(cache_key)
    if cached:
        return cached

    result = get_categories_breakdown(db, dataset_id, filters, drill_category)
    cache_manager.set_json(cache_key, result, ttl=1800)
    return result


@router.get("/locations")
async def dashboard_locations(
    dataset_id: Optional[str] = None,
    drill_unit: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    categories: Optional[List[str]] = Query(None),
    risk_levels: Optional[List[str]] = Query(None),
    date_mode: Optional[str] = "occurrence",
    db: Session = Depends(get_db)
):
    filters = {
        "start_date": start_date, "end_date": end_date, "categories": categories,
        "risk_levels": risk_levels, "date_mode": date_mode
    }
    cache_key = generate_cache_key(f"locations:{drill_unit or 'all'}", dataset_id, **filters)
    cached = cache_manager.get_json(cache_key)
    if cached:
        return cached

    result = get_locations_breakdown(db, dataset_id, filters, drill_unit)
    cache_manager.set_json(cache_key, result, ttl=1800)
    return result


@router.get("/actions")
async def dashboard_actions(
    dataset_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    units: Optional[List[str]] = Query(None),
    categories: Optional[List[str]] = Query(None),
    risk_levels: Optional[List[str]] = Query(None),
    date_mode: Optional[str] = "occurrence",
    db: Session = Depends(get_db)
):
    filters = {
        "start_date": start_date, "end_date": end_date, "units": units,
        "categories": categories, "risk_levels": risk_levels, "date_mode": date_mode
    }
    cache_key = generate_cache_key("actions", dataset_id, **filters)
    cached = cache_manager.get_json(cache_key)
    if cached:
        return cached

    result = get_actions_analysis(db, dataset_id, filters)
    cache_manager.set_json(cache_key, result, ttl=1800)
    return result


@router.get("/repeats")
async def dashboard_repeats(
    dataset_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    units: Optional[List[str]] = Query(None),
    categories: Optional[List[str]] = Query(None),
    risk_levels: Optional[List[str]] = Query(None),
    date_mode: Optional[str] = "occurrence",
    db: Session = Depends(get_db)
):
    filters = {
        "start_date": start_date, "end_date": end_date, "units": units,
        "categories": categories, "risk_levels": risk_levels, "date_mode": date_mode
    }
    cache_key = generate_cache_key("repeats", dataset_id, **filters)
    cached = cache_manager.get_json(cache_key)
    if cached:
        return cached

    result = get_repeated_observations_analysis(db, dataset_id, filters)
    cache_manager.set_json(cache_key, result, ttl=1800)
    return result


@router.get("/severity")
async def dashboard_severity(
    dataset_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    units: Optional[List[str]] = Query(None),
    categories: Optional[List[str]] = Query(None),
    date_mode: Optional[str] = "occurrence",
    db: Session = Depends(get_db)
):
    filters = {
        "start_date": start_date, "end_date": end_date, "units": units,
        "categories": categories, "date_mode": date_mode
    }
    cache_key = generate_cache_key("severity", dataset_id, **filters)
    cached = cache_manager.get_json(cache_key)
    if cached:
        return cached

    result = get_severity_top_bottom(db, dataset_id, filters)
    cache_manager.set_json(cache_key, result, ttl=1800)
    return result


@router.get("/filter-options")
async def dashboard_filter_options(dataset_id: Optional[str] = None, db: Session = Depends(get_db)):
    if not dataset_id:
        active_ds = db.query(Dataset).filter(Dataset.is_active == True).first()
        dataset_id = active_ds.id if active_ds else None

    query = db.query(Observation)
    if dataset_id:
        query = query.filter(Observation.dataset_id == dataset_id)

    units = [r[0] for r in query.with_entities(Observation.unit).distinct().order_by(Observation.unit).all() if r[0]]
    categories = [r[0] for r in query.with_entities(Observation.category).distinct().order_by(Observation.category).all() if r[0]]
    risk_levels = [r[0] for r in query.with_entities(Observation.risk_level).distinct().order_by(Observation.risk_level).all() if r[0]]
    statuses = [r[0] for r in query.with_entities(Observation.observation_status).distinct().order_by(Observation.observation_status).all() if r[0]]
    
    # Min and max dates
    min_date = query.with_entities(func.min(Observation.occurrence_date)).scalar()
    max_date = query.with_entities(func.max(Observation.occurrence_date)).scalar()

    return {
        "units": units,
        "categories": categories,
        "risk_levels": ["Minor", "Serious", "Fatal", "Unclassified"] if not risk_levels else risk_levels,
        "statuses": statuses,
        "min_date": min_date.isoformat() if min_date else "2026-08-01",
        "max_date": max_date.isoformat() if max_date else "2026-08-31"
    }
