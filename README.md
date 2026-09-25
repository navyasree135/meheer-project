# SafeTrack EHS Intelligence — Full-Stack Safety Observations Analytics & Event-Driven Platform

An enterprise-grade, event-driven interactive safety observations dashboard and ingestion pipeline built for high-reliability EHS (Environment, Health, and Safety) monitoring and technical assessment submission.

---

## 📌 Executive Architecture & Data Flow

```
                                  ┌───────────────────────────┐
                                  │   User File (.xlsx/.csv)  │
                                  └─────────────┬─────────────┘
                                                │ Multipart Upload (POST /api/upload)
                                                ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                     FASTAPI BACKEND                                       │
│                                                                                           │
│   1. S3 / MinIO Object Storage       2. Kafka Producer            3. Redis Live State     │
│   ┌──────────────────────────┐       ┌────────────────────┐       ┌────────────────────┐  │
│   │ Raw binary uploaded file │       │ Publishes 1 row/msg│       │ job:{id}:progress  │  │
│   │ stored via boto3 client  │       │ to safety.obs.raw  │       │ & rollup cache TTL │  │
│   └──────────────────────────┘       └─────────┬──────────┘       └────────────────────┘  │
│                                                │                                          │
│                                                ▼                                          │
│                                    4. Kafka Consumer Service                              │
│                                    ┌────────────────────────────────────────────┐         │
│                                    │ • Validates & normalizes 29 columns        │         │
│                                    │ • Converts '--' sentinels to NULL          │         │
│                                    │ • Calculates reporting_lag_days            │         │
│                                    │ • Unpivots Action 1/2/3 into child records │         │
│                                    │ • Upserts rows into PostgreSQL DB          │         │
│                                    └─────────────────────┬──────────────────────┘         │
└──────────────────────────────────────────────────────────┼────────────────────────────────┘
                                                           │
                                                           ▼
                                       ┌────────────────────────────────────────┐
                                       │      POSTGRESQL NORMALIZED SCHEMA      │
                                       │  ┌───────────────┐  ┌────────────────┐ │
                                       │  │ observations  │──┤    actions     │ │
                                       │  │ (parent table)│1 │(child unpivoted│ │
                                       │  └───────────────┘  └────────────────┘ │
                                       └───────────────────┬────────────────────┘
                                                           │
                                                           ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                NEXT.JS 14 APP ROUTER FRONTEND                             │
│                                                                                           │
│  • Summary KPI Cards Grid          • Week-Wise Trendline & 3-Week Predictive Forecast     │
│  • Category Drilldown (Sub/Detail) • Unit Location Drilldown (Micro-Hotspots)             │
│  • Actions Assigned & Status Donut • Insight 1: Repeated Hazard Recurrence Detection      │
│  • Insight 2: Top/Bottom 5 Severity• Master Data Table & Slide-Over Detail Drawer         │
│  • Live 5-Step Stepper Upload Modal with Real-Time Kafka/Redis Progress Polling           │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Complete Technology Stack Used

| Layer | Technology | Version / Tooling | Purpose & Implementation |
|---|---|---|---|
| **Frontend Framework** | **Next.js** | Next.js 14 (App Router, TypeScript) | Server & client rendered UI components, routing, fast page transitions |
| **Styling & Theme** | **Tailwind CSS** | Tailwind v3, PostCSS, Autoprefixer | Cohesive EHS color system (Fatal = red, Serious = orange, Minor = yellow), dark/light mode |
| **Data Fetching** | **TanStack Query** | `@tanstack/react-query` v5 | Progressive asynchronous loading per section, caching, and auto-refetching on filter changes |
| **Charting Engine** | **Recharts** | Recharts v2 | Area charts, bar charts, donut rings, dashed predictive series, confidence interval bands |
| **Icons** | **Lucide React** | `lucide-react` | Modern, clean vector iconography |
| **Backend API** | **FastAPI** | Python 3.11+, Uvicorn ASGI | Modular endpoints, Pydantic v2 schemas, automated OpenAPI/Swagger documentation |
| **Database ORM** | **SQLAlchemy** | SQLAlchemy 2.0 (with Alembic migrations) | Normalized relational models, foreign key relationships, live SQL aggregations |
| **Database** | **PostgreSQL** | PostgreSQL 15/16 (with SQLite resilience fallback) | Primary normalized storage for parent observations and unpivoted actions |
| **Event Streaming** | **Apache Kafka** | `kafka-python-ng`, Kafka KRaft | Event-driven per-row publish/consume pipeline (`safety.observations.raw`) |
| **Object Storage** | **S3 / MinIO** | `boto3` | Persisting raw uploaded binary spreadsheets prior to ingestion |
| **Cache & State** | **Redis** | `redis-py` (with in-memory fallback) | Ingestion job progress tracker (`job:{id}`) and TTL aggregation caching |
| **Data Processing** | **Pandas & NumPy** | `pandas`, `openpyxl`, `numpy` | Spreadsheet parsing, date conversions, linear regression statistical modeling |
| **Containerization** | **Docker** | `docker-compose.yml` | Full production multi-container orchestration |

---

## 📦 Deep-Dive: S3, Kafka, Redis & Schema Normalization

### 1. Object Storage (S3 / MinIO)
- **Location**: [`backend/app/services/storage.py`](file:///c:/Users/dasar/OneDrive/Desktop/Meheer%20Work/backend/app/services/storage.py)
- **How it works**: Uses `boto3` to store raw `.xlsx` and `.csv` files directly in S3/MinIO (`s3://safety-observations/uploads/...`) upon upload, ensuring raw files are preserved in object storage rather than just parsed in transient memory.

### 2. Event-Driven Kafka Streaming
- **Producer**: [`backend/app/services/kafka_producer.py`](file:///c:/Users/dasar/OneDrive/Desktop/Meheer%20Work/backend/app/services/kafka_producer.py)
  - Emits one JSON message per observation row to Kafka topic `safety.observations.raw`.
- **Consumer**: [`backend/app/services/kafka_consumer.py`](file:///c:/Users/dasar/OneDrive/Desktop/Meheer%20Work/backend/app/services/kafka_consumer.py)
  - Reads the stream row-by-row, unpivots `Action1/2/3`, normalizes null sentinels, and upserts into PostgreSQL using the natural key (`Observation Id`) for deduplication.

### 3. Redis Ingestion Tracker & Dynamic Caching
- **Location**: [`backend/app/core/redis_client.py`](file:///c:/Users/dasar/OneDrive/Desktop/Meheer%20Work/backend/app/core/redis_client.py)
- **How it works**:
  - **Live Progress Polling**: Publishes `job:{id}:processed_count`, `job:{id}:stage`, and `percent` so the frontend displays a real-time progress bar.
  - **Dynamic Rollup Cache**: Caches computed dashboard aggregations keyed by dataset version and active filter hash with automatic invalidation on new uploads.

### 4. Normalized Database Schema & Unpivoted Child Actions
- **Parent Table (`observations`)**: [`backend/app/models/observation.py`](file:///c:/Users/dasar/OneDrive/Desktop/Meheer%20Work/backend/app/models/observation.py)
  - Natural key `observation_id` (e.g. `OBS0826601791-S`), `has_suffix_s` boolean flag, real parsed date `occurrence_date`, `occurrence_iso_year/week`, 3-level type hierarchy (`category`, `sub_category`, `detail`), unit hierarchy (`unit`, `sub_location`, `exact_location`), `reported_on`, `reporting_lag_days`, and `risk_level`.
- **Child Table (`actions`)**: [`backend/app/models/action.py`](file:///c:/Users/dasar/OneDrive/Desktop/Meheer%20Work/backend/app/models/action.py)
  - Unpivots Action1, Action2, and Action3 into child records with `observation_db_id` foreign key, `action_number` (1, 2, 3), `action_text`, `status` (*Open*, *Overdue*, *Completed*, *Closed*), `due_date`, `closure_date`, and `remarks`.

---

## 📊 Dashboard Outputs & Value-Add Insights

### Core Required Sections (§4)
1. **Week-Wise Safety Velocity**: Area chart bucketing counts across ISO weeks in August & September 2026 with labeled week boundaries (`Week of Aug 3`, `Week of Aug 10`), with toggle for **Occurrence Date** vs **Reported Date**.
2. **Week-on-Week (% Change Rate)**: Visual delta badges displaying positive/negative velocity per week.
3. **By Category/Type (with Drill-Down)**: Category breakdown (*Unsafe Condition*, *Unsafe Act*, *Best Practices*, *QA - Observations*, *LSR Violation*) with interactive drill-down into sub-categories and specific detail risks.
4. **By Location / Plant Unit (with Drill-Down)**: Plant unit rankings with weighted severity risk scores; drill down into micro-locations and exact location hotspots.
5. **Actions Assigned + Status**: Coverage breakdown of observations with actions assigned vs unassigned + lifecycle status distribution across all unpivoted child actions.

### Advanced Value-Add Insights (§5)
6. **Insight 1: Repeated Hazard Recurrence Detection**:
   - Rule-based detection aggregating hazards matching `Unit + Sub-Category + Detail` occurring $\ge 2$ times.
   - Computes priority scores, recurrence severity (*Critical*, *High*, *Moderate*), and first/last seen dates.
7. **Insight 2: Severity Clustering (Top 5 & Bottom 5)**:
   - Severity Index calculation: $(\text{Fatal} \times 100 + \text{Serious} \times 40 + \text{Minor} \times 10) / \text{Total}$.
   - Side-by-side Top 5 highest risk clusters vs Bottom 5 safest operating areas.
8. **Insight 3: Predictive Trend for Next 2–3 Weeks**:
   - Statistical linear forecasting with 95% confidence intervals projected forward on the trendline, visually distinguished with dashed lines and an explanatory disclaimer note.

### Interactive UI/UX (§6)
- **Global Filter Bar**: Date range picker, Unit multi-select, Category multi-select, Risk level chips, Status chips, Pair present toggle, Search input, and Reset button.
- **Slide-Over Detail Drawer**: Click any row in the Master Data Table or Repeat Cluster to open a detailed inspection drawer showing full hierarchy, lag days, and unpivoted child action cards.
- **File Upload Modal**: Drag-and-drop `.xlsx` / `.csv` upload with a live 5-stage stepper progress bar (`Uploading` $\rightarrow$ `S3` $\rightarrow$ `Kafka` $\rightarrow$ `Consumer DB Ingestion` $\rightarrow$ `Cache Warm`).
- **Dataset Switcher**: Seamlessly switch between multiple uploaded datasets from the header dropdown.

---

## 🚀 How to Run

### Method 1: Local Standalone Development

#### 1. Start FastAPI Backend:
```powershell
cd backend
.\.venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend URL: `http://127.0.0.1:8000` (Swagger Docs: `http://127.0.0.1:8000/docs`)*

#### 2. Start Next.js Frontend:
```powershell
cd frontend
npm run dev
```
*Dashboard URL: **[http://localhost:3000](http://localhost:3000)***

---

### Method 2: Full Production Multi-Container Run (Docker Compose)

To spin up the entire production stack (**PostgreSQL + Redis + Apache Kafka KRaft + MinIO + Backend + Frontend**) with one command:

```bash
docker compose up --build -d
```

| Service | Port / URL | Credentials / Notes |
|---|---|---|
| **Frontend** | `http://localhost:3000` | Next.js Dashboard |
| **Backend API** | `http://localhost:8000` | FastAPI (Swagger at `/docs`) |
| **PostgreSQL** | `localhost:5432` | `user: postgres`, `password: postgrespassword`, `db: safety_db` |
| **Redis** | `localhost:6379` | Cache & Job State Tracker |
| **MinIO Console**| `http://localhost:9001` | `minioadmin` / `minioadmin` |
| **Kafka Broker** | `localhost:9092` | KRaft Mode (Topic: `safety.observations.raw`) |

---

## 🧪 Verification & Test Suite

To run the automated end-to-end backend test suite:
```powershell
cd backend
.\.venv\Scripts\python test_backend.py
```

To run Next.js production build verification:
```powershell
cd frontend
npm run build
```

---

## 📄 Key API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload `.xlsx`/`.csv`, store in S3, and trigger Kafka ingestion |
| `GET` | `/api/jobs/{job_id}` | Poll live ingestion progress from Redis |
| `POST` | `/api/seed-sample` | 1-Click demo loading of official 1,974 row dataset |
| `GET` | `/api/dashboard/summary` | Live KPI overview |
| `GET` | `/api/dashboard/trend` | Week-wise trend, WoW %, and 3-week predictive forecast |
| `GET` | `/api/dashboard/categories`| Category breakdown & sub-category drill-down |
| `GET` | `/api/dashboard/locations` | Unit ranking & micro-location drill-down |
| `GET` | `/api/dashboard/actions` | Action assignment rate & unpivoted status breakdown |
| `GET` | `/api/dashboard/repeats` | Repeated observation clusters & recurrence scores |
| `GET` | `/api/dashboard/severity`| Top 5 vs Bottom 5 severity clusters |
| `GET` | `/api/observations` | Paginated, searchable observation records |
| `GET` | `/api/observations/{id}` | Single observation with child unpivoted actions |
| `GET` | `/api/datasets` | List uploaded dataset versions |
