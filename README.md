# SafeTrack EHS Intelligence — Safety Observations Analytics Platform

An enterprise-grade, event-driven, full-stack safety observations dashboard and real-time ingestion pipeline built for high-reliability EHS (Environment, Health, and Safety) monitoring.

---

## 📌 Architecture & Tech Stack

```
                                  ┌────────────────────────┐
                                  │   User File (.xlsx)    │
                                  └───────────┬────────────┘
                                              │ Multipart Upload
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FASTAPI BACKEND                                      │
│                                                                                        │
│  1. S3 / MinIO Storage          2. Kafka Producer            3. Redis Job State        │
│  ┌────────────────────┐         ┌────────────────────┐       ┌──────────────────────┐  │
│  │ Stores original raw│         │ Publishes 1 msg/row│       │ Live Progress Polling│  │
│  │ Excel/CSV document │         │ to safety.obs.raw  │       │ & Aggregation Cache  │  │
│  └────────────────────┘         └─────────┬──────────┘       └──────────────────────┘  │
│                                           │                                            │
│                                           ▼                                            │
│                               4. Kafka Consumer Worker                                 │
│                               ┌──────────────────────────────────────────────┐         │
│                               │ - Validates & normalizes 29 columns          │         │
│                               │ - Normalizes '--' null sentinels             │         │
│                               │ - Calculates reporting lag days              │         │
│                               │ - Unpivots Action1/2/3 into child records    │         │
│                               │ - Upserts into PostgreSQL DB by natural key  │         │
│                               └──────────────────────┬───────────────────────┘         │
└──────────────────────────────────────────────────────┼─────────────────────────────────┘
                                                       │
                                                       ▼
                                   ┌───────────────────────────────────────┐
                                   │      POSTGRESQL NORMALIZED SCHEMA     │
                                   │  ┌───────────────┐ ┌────────────────┐ │
                                   │  │ observations  │─┤    actions     │ │
                                   │  │ (parent table)│1│(child unpivoted│ │
                                   │  └───────────────┘ └────────────────┘ │
                                   └───────────────────┬───────────────────┘
                                                       │
                                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              NEXT.JS APP ROUTER FRONTEND                               │
│                                                                                        │
│  • Summary KPIs Card Grid           • Week-Wise Trend & 3-Week Predictive Forecast     │
│  • Category Drilldown (Sub & Detail)• Unit Location Drilldown (Micro-Hotspots)         │
│  • Actions Assigned & Status Donut  • Insight 1: Repeated Observations Detection       │
│  • Insight 2: Top/Bottom 5 Severity • Master Data Table & Slide-Over Detail Drawer     │
│  • Live 5-Stage Streaming Stepper Upload Modal (S3 + Kafka + Redis Progress)           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: Next.js 14 (App Router, TypeScript), Tailwind CSS, Recharts, TanStack Query, Lucide Icons.
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic Migrations, Pydantic v2.
- **Database**: PostgreSQL (Normalized parent `observations` table + child unpivoted `actions` table).
- **Object Storage**: S3 / MinIO (raw Excel/CSV files stored first).
- **Streaming Pipeline**: Apache Kafka (per-row event stream to topic `safety.observations.raw`).
- **Cache & State**: Redis (live job progress tracking `job:{id}` + dashboard rollups cache).

---

## 🚀 Quick Start (Local Run in 2 Steps)

The platform is designed with **automatic local resilience**: if PostgreSQL, Redis, Kafka, or MinIO are running, it connects to them; otherwise, it seamlessly utilizes fast in-memory caching and local SQLite storage so you can launch and test immediately!

### 1. Start the FastAPI Backend

```powershell
# Open Terminal 1
cd backend

# Activate virtual environment
.\.venv\Scripts\activate

# Start backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend runs at `http://127.0.0.1:8000` (Interactive Swagger docs: `http://127.0.0.1:8000/docs`).*
*On initial startup, it automatically seeds the 1,974 observation assessment dataset (`data/Observations.xlsx`).*

### 2. Start the Next.js Frontend

```powershell
# Open Terminal 2
cd frontend

# Start development server
npm run dev
```
*Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

## 🐳 Full Production Stack Run (Docker Compose)

To spin up the entire production stack (**PostgreSQL + Redis + Apache Kafka KRaft + MinIO + Backend + Frontend**) with one command:

```bash
docker compose up --build -d
```

### Services Breakdown:
| Service | URL / Port | Credentials / Notes |
|---|---|---|
| **Frontend** | `http://localhost:3000` | Next.js Dashboard |
| **Backend API** | `http://localhost:8000` | FastAPI (Swagger at `/docs`) |
| **PostgreSQL** | `localhost:5432` | `user: postgres`, `password: postgrespassword`, `db: safety_db` |
| **Redis** | `localhost:6379` | Cache & Job State Tracker |
| **MinIO Console** | `http://localhost:9001` | `minioadmin` / `minioadmin` |
| **Kafka Broker** | `localhost:9092` | KRaft Mode (Topic: `safety.observations.raw`) |

---

## 📊 Normalized Database Schema

Rather than dumping wide 29-column spreadsheets into a single denormalized table, the database is normalized with child relationship unpivoting:

### 1. Parent Table: `observations`
- `id` (PK, autoincrement integer)
- `dataset_id` (FK -> `datasets.id`, supports multiple uploads)
- `observation_id` (Natural key for deduplication e.g. `OBS0826601791`)
- `has_suffix_s` (Boolean flag extracted from `-S` suffix)
- `occurrence_date` (Parsed real Date)
- `occurrence_iso_year`, `occurrence_iso_week`, `occurrence_week_label` ("Week of Aug 3")
- `category` (Unsafe Condition, Unsafe Act, Best Practices, QA - Observations, LSR Violation)
- `sub_category`, `detail` (Normalized 3-level type hierarchy)
- `unit` (Unit 05, Unit 41, Unit 03, Unit 02, Unit 13, R&D)
- `sub_location`, `exact_location` (Null sentinel `'--'` converted to `NULL`)
- `reported_on`, `reporting_lag_days` (`Reported On - Occurrence Date`)
- `risk_level` (`Fatal`, `Serious`, `Minor`, `Unclassified` for 143 null rows)
- `observation_status` (`Open`, `Overdue`, `In Progress`)
- `pair_present` (Boolean)
- `closure_date`, `closed_by` (`'--'` converted to `NULL`)
- `reason_for_no_actions` (Free text)

### 2. Child Table: `actions` (Unpivoted)
- `id` (PK, autoincrement integer)
- `observation_db_id` (FK -> `observations.id`, CASCADE delete)
- `observation_id` (Natural key reference)
- `action_number` (1, 2, or 3)
- `action_text` (Corrective action description)
- `status` (`Open`, `Overdue`, `Completed`, `Closed`, `In Progress`)
- `due_date`, `closure_date`, `remarks`

---

## ⚡ Event-Driven Ingestion Pipeline

1. **File Upload**: User uploads `.xlsx` or `.csv` via the modal dialog or API `POST /api/upload`.
2. **Object Storage**: The backend stores the raw binary in S3/MinIO (`s3://safety-observations/uploads/...`).
3. **Kafka Stream**: A publisher emits one JSON message per row to Kafka topic `safety.observations.raw`.
4. **Kafka Consumer**: The consumer service consumes rows, normalizes types/dates, unpivots `Action1/2/3`, and upserts into Postgres.
5. **Live Redis Progress**: Progress is continuously published to Redis (`job:{id}:processed_count`, `job:{id}:stage`, `job:{id}:percent`).
6. **Progressive Frontend Polling**: Frontend displays a live 5-step stepper (`Uploading → S3 → Kafka → Consumer → Cache Warm`) and auto-refreshes the dashboard upon completion.

---

## 📈 Dashboard Features & Value-Add Insights

### Core Sections (§4)
1. **Week-Wise Safety Velocity & Trajectory**:
   - Area/Line chart across ISO weeks in August & September 2026.
   - ISO week boundaries clearly labeled (e.g. "Week of Aug 3", "Week of Aug 10").
   - Occurrence Date vs Reported Date toggle.
2. **Week-on-Week (% Change Rate)**:
   - Visual delta badge strip per week with positive/negative indicators.
3. **By Category/Type (with Drilldown)**:
   - Top-level category rollup (bar or donut chart).
   - Click any category to drill down into sub-categories and specific hazard details.
4. **By Location / Plant Unit (with Drilldown)**:
   - Plant unit ranking with weighted severity risk scores.
   - Click any unit to drill down into micro-locations and exact location hotspots.
5. **Actions Assigned & Status Lifecycle**:
   - Total observations with actions assigned vs unassigned.
   - Status distribution across all unpivoted child actions.
   - Sequence distribution (Action #1, #2, #3) and top reasons for no action logged.

### Advanced Value-Add Insights (§5)
6. **Insight 1: Repeated Hazard Recurrence**:
   - Rule-based detection aggregating hazards matching `Unit + Sub-Category + Detail` occurring $\ge 2$ times.
   - Recurrence severity tags (`Critical`, `High`, `Moderate`), priority scores, first/last seen dates.
7. **Insight 2: High vs. Low Severity Clustering (Top 5 / Bottom 5)**:
   - Severity Index calculation: $(\text{Fatal} \times 100 + \text{Serious} \times 40 + \text{Minor} \times 10) / \text{Total}$.
   - Side-by-side Top 5 highest risk exposure areas vs Bottom 5 safest operating areas.
   - Toggleable between Plant Units and Categories.
8. **Insight 3: Predictive Trend for Next 2–3 Weeks**:
   - Statistical linear forecasting with 95% confidence intervals projected forward.
   - Visually distinguished with dashed lines, amber forecast area, and disclaimer note.

### Interactive UI/UX (§6)
- **Global Filter Bar**: Date range, Unit multi-select, Category multi-select, Risk level chips, Status chips, Pair present toggle, Search bar, and Reset button.
- **Slide-Over Observation Drawer**: Click any row in the Master Data Table or Repeat Cluster to open a detailed slide-over drawer showing full observation hierarchy, lag days, and all unpivoted child actions.
- **Theme**: Sleek Dark Mode (default) and Light Mode support with responsive design.

---

## 🧪 Testing & Validation

To run the automated end-to-end backend test suite:

```powershell
cd backend
.\.venv\Scripts\python test_backend.py
```

To run Next.js production build validation:

```powershell
cd frontend
npm run build
```

---

## 📄 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload `.xlsx` / `.csv` and kick off Kafka pipeline |
| `GET` | `/api/jobs/{job_id}` | Poll live ingestion progress from Redis |
| `POST` | `/api/seed-sample` | 1-Click demo loading of official 1,974 row dataset |
| `GET` | `/api/dashboard/summary` | Summary KPIs and metrics |
| `GET` | `/api/dashboard/trend` | Week-wise trend, WoW %, and 3-week predictive forecast |
| `GET` | `/api/dashboard/categories`| Category breakdown & sub-category drill-down |
| `GET` | `/api/dashboard/locations` | Unit ranking & micro-location drill-down |
| `GET` | `/api/dashboard/actions` | Action assignment rate & unpivoted status breakdown |
| `GET` | `/api/dashboard/repeats` | Repeated observation clusters & recurrence scores |
| `GET` | `/api/dashboard/severity`| Top 5 vs Bottom 5 severity clusters |
| `GET` | `/api/observations` | Paginated, searchable observation records |
| `GET` | `/api/observations/{id}` | Single observation with unpivoted child actions |
| `GET` | `/api/datasets` | List uploaded dataset versions |
