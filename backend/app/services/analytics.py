import logging
import math
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, case, and_, or_

from app.models import Dataset, Observation, Action

logger = logging.getLogger(__name__)

def build_filter_query(db: Session, dataset_id: Optional[str] = None, filters: Optional[Dict[str, Any]] = None):
    """
    Builds a base query with all dynamic filters applied:
    - dataset_id (or active dataset if None)
    - start_date / end_date (applies to occurrence_date or reported_on based on date_mode)
    - units (list)
    - categories (list)
    - risk_levels (list)
    - observation_statuses (list)
    - pair_present (bool)
    - has_actions (bool)
    - search (text search on description / detail / sub_location)
    """
    if not dataset_id:
        active_ds = db.query(Dataset).filter(Dataset.is_active == True).first()
        dataset_id = active_ds.id if active_ds else None

    query = db.query(Observation)
    if dataset_id:
        query = query.filter(Observation.dataset_id == dataset_id)

    if not filters:
        return query, dataset_id

    date_mode = filters.get("date_mode", "occurrence") # occurrence or reported
    date_col = Observation.reported_on if date_mode == "reported" else Observation.occurrence_date

    # Date Range
    if filters.get("start_date"):
        try:
            sd = datetime.strptime(filters["start_date"], "%Y-%m-%d").date()
            query = query.filter(date_col >= sd)
        except Exception:
            pass

    if filters.get("end_date"):
        try:
            ed = datetime.strptime(filters["end_date"], "%Y-%m-%d").date()
            query = query.filter(date_col <= ed)
        except Exception:
            pass

    # Units
    units = filters.get("units")
    if units and len(units) > 0:
        query = query.filter(Observation.unit.in_(units))

    # Categories
    categories = filters.get("categories")
    if categories and len(categories) > 0:
        query = query.filter(Observation.category.in_(categories))

    # Risk Levels
    risk_levels = filters.get("risk_levels")
    if risk_levels and len(risk_levels) > 0:
        query = query.filter(Observation.risk_level.in_(risk_levels))

    # Observation Statuses
    statuses = filters.get("observation_statuses")
    if statuses and len(statuses) > 0:
        query = query.filter(Observation.observation_status.in_(statuses))

    # Pair Present
    if filters.get("pair_present") is not None:
        val = str(filters["pair_present"]).lower() in ["true", "1", "yes"]
        query = query.filter(Observation.pair_present == val)

    # Search query
    search = filters.get("search")
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Observation.observation_id.ilike(search_term),
                Observation.description.ilike(search_term),
                Observation.detail.ilike(search_term),
                Observation.sub_category.ilike(search_term),
                Observation.sub_location.ilike(search_term),
                Observation.exact_location.ilike(search_term)
            )
        )

    return query, dataset_id


def get_summary_kpis(db: Session, dataset_id: Optional[str] = None, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    query, resolved_ds_id = build_filter_query(db, dataset_id, filters)
    
    total_obs = query.count()
    if total_obs == 0:
        return {
            "total_observations": 0,
            "serious_fatal_count": 0,
            "serious_fatal_pct": 0.0,
            "fatal_count": 0,
            "serious_count": 0,
            "minor_count": 0,
            "unclassified_count": 0,
            "actions_assigned_count": 0,
            "actions_assigned_pct": 0.0,
            "total_unpivoted_actions": 0,
            "open_actions_count": 0,
            "overdue_actions_count": 0,
            "avg_reporting_lag_days": 0.0,
            "pair_present_count": 0,
            "pair_present_pct": 0.0,
            "open_obs_count": 0,
            "overdue_obs_count": 0,
            "in_progress_obs_count": 0
        }

    # Risk counts
    risk_stats = query.with_entities(
        Observation.risk_level, func.count(Observation.id)
    ).group_by(Observation.risk_level).all()
    
    risk_dict = {r[0]: r[1] for r in risk_stats}
    fatal_cnt = risk_dict.get("Fatal", 0)
    serious_cnt = risk_dict.get("Serious", 0)
    minor_cnt = risk_dict.get("Minor", 0)
    unclass_cnt = risk_dict.get("Unclassified", 0)
    serious_fatal_cnt = fatal_cnt + serious_cnt

    # Status counts
    status_stats = query.with_entities(
        Observation.observation_status, func.count(Observation.id)
    ).group_by(Observation.observation_status).all()
    status_dict = {s[0]: s[1] for s in status_stats}

    # Pair present
    pair_cnt = query.filter(Observation.pair_present == True).count()

    # Average reporting lag
    avg_lag = query.with_entities(func.avg(Observation.reporting_lag_days)).scalar() or 0.0

    # Observations with actions
    obs_ids_subquery = query.with_entities(Observation.id)
    actions_query = db.query(Action).filter(Action.observation_db_id.in_(obs_ids_subquery))
    
    total_actions = actions_query.count()
    obs_with_actions_cnt = actions_query.with_entities(func.count(func.distinct(Action.observation_db_id))).scalar() or 0
    
    # Action statuses
    action_stat_counts = actions_query.with_entities(
        Action.status, func.count(Action.id)
    ).group_by(Action.status).all()
    action_dict = {a[0]: a[1] for a in action_stat_counts}

    return {
        "total_observations": total_obs,
        "serious_fatal_count": serious_fatal_cnt,
        "serious_fatal_pct": round((serious_fatal_cnt / total_obs) * 100, 1),
        "fatal_count": fatal_cnt,
        "serious_count": serious_cnt,
        "minor_count": minor_cnt,
        "unclassified_count": unclass_cnt,
        "actions_assigned_count": obs_with_actions_cnt,
        "actions_assigned_pct": round((obs_with_actions_cnt / total_obs) * 100, 1),
        "total_unpivoted_actions": total_actions,
        "open_actions_count": action_dict.get("Open", 0),
        "overdue_actions_count": action_dict.get("Overdue", 0),
        "completed_actions_count": action_dict.get("Completed", 0) + action_dict.get("Closed", 0),
        "avg_reporting_lag_days": round(float(avg_lag), 1),
        "pair_present_count": pair_cnt,
        "pair_present_pct": round((pair_cnt / total_obs) * 100, 1),
        "open_obs_count": status_dict.get("Open", 0),
        "overdue_obs_count": status_dict.get("Overdue", 0),
        "in_progress_obs_count": status_dict.get("In Progress", 0)
    }


def get_trend_analysis(db: Session, dataset_id: Optional[str] = None, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    query, _ = build_filter_query(db, dataset_id, filters)
    date_mode = (filters or {}).get("date_mode", "occurrence")
    
    iso_year_col = Observation.reported_iso_year if date_mode == "reported" else Observation.occurrence_iso_year
    iso_week_col = Observation.reported_iso_week if date_mode == "reported" else Observation.occurrence_iso_week
    week_label_col = Observation.reported_week_label if date_mode == "reported" else Observation.occurrence_week_label

    # Group by iso_year, iso_week
    trend_rows = query.with_entities(
        iso_year_col,
        iso_week_col,
        week_label_col,
        func.count(Observation.id).label("count"),
        func.sum(case((Observation.risk_level.in_(["Serious", "Fatal"]), 1), else_=0)).label("serious_fatal_count")
    ).filter(
        iso_week_col.isnot(None)
    ).group_by(
        iso_year_col,
        iso_week_col,
        week_label_col
    ).order_by(
        iso_year_col,
        iso_week_col
    ).all()

    points = []
    prev_count = None

    for r in trend_rows:
        year, week, label, cnt, sf_cnt = r[0], r[1], r[2], r[3], r[4] or 0
        
        # Calculate WoW %
        if prev_count is not None and prev_count > 0:
            wow_pct = round(((cnt - prev_count) / prev_count) * 100, 1)
        else:
            wow_pct = None # First week baseline

        points.append({
            "iso_year": year,
            "iso_week": week,
            "week_key": f"{year}-W{week:02d}",
            "week_label": label or f"Week {week}",
            "count": cnt,
            "serious_fatal_count": sf_cnt,
            "wow_pct": wow_pct,
            "is_projection": False
        })
        prev_count = cnt

    # Predictive Trend for Next 2-3 Weeks (Insight 3)
    forecast_points = []
    if len(points) >= 2:
        # Fit Linear Regression + Simple Exponential Smoothing
        x_vals = np.array(range(len(points)))
        y_vals = np.array([p["count"] for p in points])

        # Slope and intercept
        slope, intercept = np.polyfit(x_vals, y_vals, 1)
        
        # Residual variance for confidence interval
        residuals = y_vals - (slope * x_vals + intercept)
        std_err = np.std(residuals) if len(residuals) > 1 else 5.0
        
        last_year = points[-1]["iso_year"]
        last_week = points[-1]["iso_week"]
        
        # Last actual point connects smoothly into projection
        points[-1]["projected_count"] = points[-1]["count"]
        points[-1]["lower_bound"] = points[-1]["count"]
        points[-1]["upper_bound"] = points[-1]["count"]

        for step in range(1, 4): # Next 3 weeks
            fut_x = len(points) - 1 + step
            # Linear trend with slight dampening
            pred_y = max(10, int(round(slope * fut_x + intercept)))
            
            fut_week = last_week + step
            fut_year = last_year
            if fut_week > 52:
                fut_week -= 52
                fut_year += 1

            # Approximate Monday date
            # Assuming 2026 week starting date
            monday_str = f"Week {fut_week} (Est)"
            try:
                # Approximate date from ISO week
                first_day_of_year = date(fut_year, 1, 1)
                monday_date = first_day_of_year + timedelta(days=(fut_week - 1) * 7 - first_day_of_year.weekday())
                monday_str = f"Week of {monday_date.strftime('%b %d')} (Est)"
            except Exception:
                pass

            margin = int(round(1.96 * std_err * (1 + 0.2 * step)))
            
            # Forecast WoW % vs previous point
            prev_val = points[-1]["count"] if step == 1 else forecast_points[-1]["projected_count"]
            fut_wow = round(((pred_y - prev_val) / prev_val) * 100, 1) if prev_val > 0 else 0.0

            forecast_item = {
                "iso_year": fut_year,
                "iso_week": fut_week,
                "week_key": f"{fut_year}-W{fut_week:02d}",
                "week_label": monday_str,
                "count": None, # No historical actuals
                "projected_count": pred_y,
                "lower_bound": max(0, pred_y - margin),
                "upper_bound": pred_y + margin,
                "wow_pct": fut_wow,
                "is_projection": True
            }
            forecast_points.append(forecast_item)

    combined_series = points + forecast_points

    return {
        "date_mode": date_mode,
        "historical_points": points,
        "forecast_points": forecast_points,
        "combined_series": combined_series,
        "forecast_disclaimer": "Projection is a statistical linear forecast with 95% confidence bands based on historical weekly velocity; intended for proactive safety planning, not an operational guarantee."
    }


def get_categories_breakdown(db: Session, dataset_id: Optional[str] = None, filters: Optional[Dict[str, Any]] = None, drill_category: Optional[str] = None) -> Dict[str, Any]:
    query, _ = build_filter_query(db, dataset_id, filters)
    
    if drill_category:
        # Drill down into specific category -> sub_categories & details
        drill_query = query.filter(Observation.category == drill_category)
        
        subcat_stats = drill_query.with_entities(
            Observation.sub_category,
            func.count(Observation.id).label("count"),
            func.sum(case((Observation.risk_level.in_(["Serious", "Fatal"]), 1), else_=0)).label("serious_fatal_count")
        ).group_by(Observation.sub_category).order_by(desc("count")).all()

        details_stats = drill_query.with_entities(
            Observation.sub_category,
            Observation.detail,
            func.count(Observation.id).label("count"),
            func.sum(case((Observation.risk_level == "Fatal", 1), else_=0)).label("fatal_count"),
            func.sum(case((Observation.risk_level == "Serious", 1), else_=0)).label("serious_count"),
            func.sum(case((Observation.risk_level == "Minor", 1), else_=0)).label("minor_count")
        ).group_by(Observation.sub_category, Observation.detail).order_by(desc("count")).limit(20).all()

        return {
            "is_drilldown": True,
            "category": drill_category,
            "total_in_category": drill_query.count(),
            "sub_categories": [
                {
                    "sub_category": s[0] or "Unspecified",
                    "count": s[1],
                    "serious_fatal_count": s[2] or 0
                }
                for s in subcat_stats
            ],
            "top_details": [
                {
                    "sub_category": d[0] or "Unspecified",
                    "detail": d[1] or "Unspecified Detail",
                    "count": d[2],
                    "fatal_count": d[3] or 0,
                    "serious_count": d[4] or 0,
                    "minor_count": d[5] or 0
                }
                for d in details_stats
            ]
        }

    # Top-level category rollup
    total_obs = query.count()
    cat_stats = query.with_entities(
        Observation.category,
        func.count(Observation.id).label("count"),
        func.sum(case((Observation.risk_level == "Fatal", 1), else_=0)).label("fatal_count"),
        func.sum(case((Observation.risk_level == "Serious", 1), else_=0)).label("serious_count"),
        func.sum(case((Observation.risk_level == "Minor", 1), else_=0)).label("minor_count"),
        func.sum(case((Observation.risk_level == "Unclassified", 1), else_=0)).label("unclassified_count")
    ).group_by(Observation.category).order_by(desc("count")).all()

    categories = []
    for c in cat_stats:
        cnt = c[1]
        pct = round((cnt / total_obs * 100), 1) if total_obs > 0 else 0.0
        categories.append({
            "category": c[0],
            "count": cnt,
            "percentage": pct,
            "fatal_count": c[2] or 0,
            "serious_count": c[3] or 0,
            "minor_count": c[4] or 0,
            "unclassified_count": c[5] or 0,
            "serious_fatal_count": (c[2] or 0) + (c[3] or 0)
        })

    return {
        "is_drilldown": False,
        "total_observations": total_obs,
        "categories": categories
    }


def get_locations_breakdown(db: Session, dataset_id: Optional[str] = None, filters: Optional[Dict[str, Any]] = None, drill_unit: Optional[str] = None) -> Dict[str, Any]:
    query, _ = build_filter_query(db, dataset_id, filters)

    if drill_unit:
        # Drill down into specific unit -> sub_locations & exact_locations
        unit_query = query.filter(Observation.unit == drill_unit)
        total_in_unit = unit_query.count()

        subloc_stats = unit_query.with_entities(
            Observation.sub_location,
            func.count(Observation.id).label("count"),
            func.sum(case((Observation.risk_level.in_(["Serious", "Fatal"]), 1), else_=0)).label("serious_fatal_count"),
            func.sum(case((Observation.observation_status == "Open", 1), else_=0)).label("open_count")
        ).group_by(Observation.sub_location).order_by(desc("count")).all()

        exact_loc_stats = unit_query.with_entities(
            Observation.sub_location,
            Observation.exact_location,
            func.count(Observation.id).label("count")
        ).filter(Observation.exact_location.isnot(None)).group_by(
            Observation.sub_location, Observation.exact_location
        ).order_by(desc("count")).limit(15).all()

        return {
            "is_drilldown": True,
            "unit": drill_unit,
            "total_in_unit": total_in_unit,
            "sub_locations": [
                {
                    "sub_location": sl[0] or "General Area",
                    "count": sl[1],
                    "percentage": round((sl[1] / total_in_unit * 100), 1) if total_in_unit > 0 else 0.0,
                    "serious_fatal_count": sl[2] or 0,
                    "open_count": sl[3] or 0
                }
                for sl in subloc_stats
            ],
            "exact_locations": [
                {
                    "sub_location": el[0] or "General Area",
                    "exact_location": el[1],
                    "count": el[2]
                }
                for el in exact_loc_stats
            ]
        }

    # Top-level unit rollup
    total_obs = query.count()
    unit_stats = query.with_entities(
        Observation.unit,
        func.count(Observation.id).label("count"),
        func.sum(case((Observation.risk_level == "Fatal", 1), else_=0)).label("fatal_count"),
        func.sum(case((Observation.risk_level == "Serious", 1), else_=0)).label("serious_count"),
        func.sum(case((Observation.risk_level == "Minor", 1), else_=0)).label("minor_count"),
        func.sum(case((Observation.observation_status == "Open", 1), else_=0)).label("open_count"),
        func.sum(case((Observation.observation_status == "Overdue", 1), else_=0)).label("overdue_count")
    ).group_by(Observation.unit).order_by(desc("count")).all()

    units = []
    for u in unit_stats:
        cnt = u[1]
        fatal = u[2] or 0
        serious = u[3] or 0
        minor = u[4] or 0
        # Risk score calculation: (Fatal*5 + Serious*3 + Minor*1) / count
        risk_score = round(((fatal * 5 + serious * 3 + minor * 1) / cnt), 2) if cnt > 0 else 0.0

        units.append({
            "unit": u[0],
            "count": cnt,
            "percentage": round((cnt / total_obs * 100), 1) if total_obs > 0 else 0.0,
            "fatal_count": fatal,
            "serious_count": serious,
            "minor_count": minor,
            "open_count": u[5] or 0,
            "overdue_count": u[6] or 0,
            "risk_score": risk_score
        })

    return {
        "is_drilldown": False,
        "total_observations": total_obs,
        "units": units
    }


def get_actions_analysis(db: Session, dataset_id: Optional[str] = None, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    query, _ = build_filter_query(db, dataset_id, filters)
    total_obs = query.count()
    if total_obs == 0:
        return {
            "total_observations": 0,
            "observations_with_actions": 0,
            "observations_without_actions": 0,
            "with_actions_pct": 0.0,
            "without_actions_pct": 0.0,
            "action_status_distribution": [],
            "action_sequence_distribution": [],
            "top_reasons_no_actions": []
        }

    obs_ids_subquery = query.with_entities(Observation.id)
    actions_query = db.query(Action).filter(Action.observation_db_id.in_(obs_ids_subquery))
    
    total_actions_count = actions_query.count()
    obs_with_actions_count = actions_query.with_entities(func.count(func.distinct(Action.observation_db_id))).scalar() or 0
    obs_without_actions_count = total_obs - obs_with_actions_count

    # Status distribution
    status_stats = actions_query.with_entities(
        Action.status, func.count(Action.id)
    ).group_by(Action.status).order_by(desc(func.count(Action.id))).all()

    status_dist = []
    for s in status_stats:
        cnt = s[1]
        pct = round((cnt / total_actions_count * 100), 1) if total_actions_count > 0 else 0.0
        status_dist.append({
            "status": s[0] or "Unknown",
            "count": cnt,
            "percentage": pct
        })

    # Distribution by action number (Action 1, 2, 3)
    num_stats = actions_query.with_entities(
        Action.action_number, func.count(Action.id)
    ).group_by(Action.action_number).order_by(Action.action_number).all()
    
    action_seq_dist = [
        {"action_number": n[0], "label": f"Action #{n[0]}", "count": n[1]}
        for n in num_stats
    ]

    # Top reasons for no actions
    no_act_reasons = query.filter(
        Observation.reason_for_no_actions.isnot(None)
    ).with_entities(
        Observation.reason_for_no_actions,
        func.count(Observation.id).label("count")
    ).group_by(Observation.reason_for_no_actions).order_by(desc("count")).limit(5).all()

    return {
        "total_observations": total_obs,
        "observations_with_actions": obs_with_actions_count,
        "observations_without_actions": obs_without_actions_count,
        "with_actions_pct": round((obs_with_actions_count / total_obs * 100), 1),
        "without_actions_pct": round((obs_without_actions_count / total_obs * 100), 1),
        "total_actions_logged": total_actions_count,
        "action_status_distribution": status_dist,
        "action_sequence_distribution": action_seq_dist,
        "top_reasons_no_actions": [
            {"reason": r[0], "count": r[1]} for r in no_act_reasons
        ]
    }


def get_repeated_observations_analysis(db: Session, dataset_id: Optional[str] = None, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Identifies systemic recurring hazards:
    Groups observations by (unit, sub_category, detail) with frequency >= 2.
    """
    query, _ = build_filter_query(db, dataset_id, filters)
    total_obs = query.count()

    repeat_stats = query.with_entities(
        Observation.unit,
        Observation.category,
        Observation.sub_category,
        Observation.detail,
        func.count(Observation.id).label("repeat_count"),
        func.sum(case((Observation.risk_level == "Fatal", 1), else_=0)).label("fatal_count"),
        func.sum(case((Observation.risk_level == "Serious", 1), else_=0)).label("serious_count"),
        func.sum(case((Observation.risk_level == "Minor", 1), else_=0)).label("minor_count"),
        func.min(Observation.occurrence_date).label("first_seen"),
        func.max(Observation.occurrence_date).label("last_seen")
    ).filter(
        Observation.detail.isnot(None)
    ).group_by(
        Observation.unit,
        Observation.category,
        Observation.sub_category,
        Observation.detail
    ).having(
        func.count(Observation.id) >= 2
    ).order_by(
        desc("repeat_count"),
        desc("serious_count")
    ).limit(15).all()

    total_repeats_sum = 0
    clusters = []

    for idx, r in enumerate(repeat_stats):
        unit, cat, subcat, detail, cnt, fatal, serious, minor, first_seen, last_seen = r
        total_repeats_sum += cnt
        
        # Priority score: repeat_count * (fatal*5 + serious*3 + minor*1)
        priority_score = cnt * (fatal * 5 + serious * 3 + minor * 1)
        
        clusters.append({
            "id": f"cluster-{idx+1}",
            "unit": unit,
            "category": cat,
            "sub_category": subcat or "General",
            "detail": detail,
            "repeat_count": cnt,
            "fatal_count": fatal or 0,
            "serious_count": serious or 0,
            "minor_count": minor or 0,
            "first_seen": first_seen.isoformat() if first_seen else None,
            "last_seen": last_seen.isoformat() if last_seen else None,
            "priority_score": priority_score,
            "recurrence_severity": "Critical" if fatal > 0 or serious >= 3 else ("High" if serious > 0 else "Moderate")
        })

    return {
        "total_repeat_clusters": len(clusters),
        "total_repeated_observations": total_repeats_sum,
        "repeated_obs_percentage": round((total_repeats_sum / total_obs * 100), 1) if total_obs > 0 else 0.0,
        "clusters": clusters,
        "detection_rule": "Aggregates observations sharing the same Unit, Sub-Category, and Detail with occurrence frequency ≥ 2 within the dataset period."
    }


def get_severity_top_bottom(db: Session, dataset_id: Optional[str] = None, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Ranks Top 5 highest severity clusters vs Bottom 5 lowest severity clusters across Units and Categories.
    """
    query, _ = build_filter_query(db, dataset_id, filters)

    # Unit ranking by severity
    unit_stats = query.with_entities(
        Observation.unit,
        func.count(Observation.id).label("total_count"),
        func.sum(case((Observation.risk_level == "Fatal", 1), else_=0)).label("fatal_count"),
        func.sum(case((Observation.risk_level == "Serious", 1), else_=0)).label("serious_count"),
        func.sum(case((Observation.risk_level == "Minor", 1), else_=0)).label("minor_count"),
        func.sum(case((Observation.risk_level == "Unclassified", 1), else_=0)).label("unclassified_count")
    ).group_by(Observation.unit).all()

    unit_scored = []
    for u in unit_stats:
        unit_name, total, fatal, serious, minor, unclass = u
        fatal = fatal or 0
        serious = serious or 0
        minor = minor or 0
        
        # Severity Index = (Fatal * 100 + Serious * 40 + Minor * 10) / total
        severity_index = round(((fatal * 100 + serious * 40 + minor * 10) / total), 1) if total > 0 else 0.0
        
        unit_scored.append({
            "name": unit_name,
            "type": "Unit",
            "total_observations": total,
            "fatal_count": fatal,
            "serious_count": serious,
            "minor_count": minor,
            "unclassified_count": unclass or 0,
            "serious_fatal_count": fatal + serious,
            "serious_fatal_pct": round(((fatal + serious) / total * 100), 1) if total > 0 else 0.0,
            "severity_index": severity_index
        })

    # Sort descending by severity index and serious_fatal_count for Top 5
    top_units = sorted(unit_scored, key=lambda x: (x["fatal_count"], x["serious_count"], x["severity_index"]), reverse=True)[:5]
    
    # Sort ascending for Bottom 5 (safest / lowest severity)
    bottom_units = sorted(unit_scored, key=lambda x: (x["fatal_count"], x["serious_count"], x["severity_index"]))[:5]

    # Category ranking by severity
    cat_stats = query.with_entities(
        Observation.category,
        func.count(Observation.id).label("total_count"),
        func.sum(case((Observation.risk_level == "Fatal", 1), else_=0)).label("fatal_count"),
        func.sum(case((Observation.risk_level == "Serious", 1), else_=0)).label("serious_count"),
        func.sum(case((Observation.risk_level == "Minor", 1), else_=0)).label("minor_count")
    ).group_by(Observation.category).all()

    cat_scored = []
    for c in cat_stats:
        cat_name, total, fatal, serious, minor = c
        fatal = fatal or 0
        serious = serious or 0
        minor = minor or 0
        severity_index = round(((fatal * 100 + serious * 40 + minor * 10) / total), 1) if total > 0 else 0.0
        cat_scored.append({
            "name": cat_name,
            "type": "Category",
            "total_observations": total,
            "fatal_count": fatal,
            "serious_count": serious,
            "minor_count": minor,
            "serious_fatal_count": fatal + serious,
            "serious_fatal_pct": round(((fatal + serious) / total * 100), 1) if total > 0 else 0.0,
            "severity_index": severity_index
        })

    top_categories = sorted(cat_scored, key=lambda x: (x["fatal_count"], x["serious_count"], x["severity_index"]), reverse=True)[:5]
    bottom_categories = sorted(cat_scored, key=lambda x: (x["fatal_count"], x["serious_count"], x["severity_index"]))[:5]

    return {
        "top_5_high_severity_units": top_units,
        "bottom_5_low_severity_units": bottom_units,
        "top_5_high_severity_categories": top_categories,
        "bottom_5_low_severity_categories": bottom_categories,
        "scoring_methodology": "Severity Index is calculated as (Fatal × 100 + Serious × 40 + Minor × 10) / Total Observations, weighting high-potential life-safety risks."
    }
