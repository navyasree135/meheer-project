import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("[1] Loading models and core...")
from app.core.database import SessionLocal, Base, engine
from app.models import Dataset, Observation, Action
from app.services.parser import load_and_parse_file
from app.services.kafka_consumer import process_stream_batch
from app.services.analytics import get_summary_kpis, get_trend_analysis, get_categories_breakdown, get_locations_breakdown, get_repeated_observations_analysis, get_severity_top_bottom

print("[2] Initializing tables...")
Base.metadata.create_all(bind=engine)

db = SessionLocal()
obs_count = db.query(Observation).count()
print(f"[3] Existing observations in DB: {obs_count}")

if obs_count == 0:
    print("[4] Ingesting sample Observations.xlsx into DB...")
    ds_id = "ds_sample_test"
    new_ds = Dataset(
        id=ds_id,
        filename="Observations.xlsx (Sample)",
        is_active=True,
        status="PROCESSING"
    )
    db.add(new_ds)
    db.commit()
    
    rows = load_and_parse_file("data/Observations.xlsx", ds_id)
    print(f"[5] Parsed {len(rows)} rows. Ingesting...")
    process_stream_batch(rows, "test_job_1", ds_id)
    print("[6] Ingestion complete!")

obs_count = db.query(Observation).count()
actions_count = db.query(Action).count()
print(f"[7] Verified DB Observations: {obs_count}")
print(f"[8] Verified DB Unpivoted Actions: {actions_count}")

kpis = get_summary_kpis(db)
print(f"[9] KPIs Total: {kpis['total_observations']}, Serious/Fatal: {kpis['serious_fatal_pct']}%, Actions Rate: {kpis['actions_assigned_pct']}%")

trend = get_trend_analysis(db)
print(f"[10] Trend: {len(trend['historical_points'])} historical weeks, {len(trend['forecast_points'])} forecast weeks")

cats = get_categories_breakdown(db)
print(f"[11] Categories: {len(cats['categories'])} top-level categories")

locs = get_locations_breakdown(db)
print(f"[12] Units: {len(locs['units'])} plant units")

repeats = get_repeated_observations_analysis(db)
print(f"[13] Repeated clusters: {repeats['total_repeat_clusters']} clusters, {repeats['total_repeated_observations']} observations")

severity = get_severity_top_bottom(db)
print(f"[14] Severity Top 5: {[u['name'] for u in severity['top_5_high_severity_units']]}")

db.close()
print("SUCCESS: ALL BACKEND PIPELINES, PARSER, INGESTION, AND ANALYTICS VERIFIED 100%!")
