# GridPilot — Complete Upgrade Prompts
**Platform: Railway | Stack: FastAPI + Next.js | Target: Pilot-Ready by Saturday**

---

> **How to use this document**
> Give prompts in order. Do not move to the next prompt until the current one is verified working in the browser or terminal. Each prompt builds on the previous one.

---

## Execution Order

```
Wednesday morning:   1.1 → 1.2 → 1.3 → 1.4
Wednesday afternoon: 2.1 → 2.2 → 2.3
Thursday morning:    3.1 → 3.2 → 3.3 → 3.4 → 3.5
Thursday afternoon:  4.1 → 4.2 → 4.3 → 4.4
Friday morning:      5.1 → 5.2 → 5.3
Friday afternoon:    6.1 (run full E2E test, fix every FAIL)
Saturday:            Fix whatever 6.1 broke. Demo rehearsal. No new features.
```

---

# PHASE 1 — FOUNDATION

---

## Prompt 1.1 — Railway PostgreSQL + Database Setup

```
I have a FastAPI backend. I need to connect it to a
Railway PostgreSQL database.

My current setup:
- FastAPI with SQLAlchemy
- Currently using SQLite with DATABASE_URL = "sqlite:///./gridpilot.db"
- Python 3.11
- Will be deployed on Railway

Tasks:
1. Update database.py to:
   - Read DATABASE_URL from environment variable
   - Use PostgreSQL dialect with psycopg2
   - Configure connection pool with:
     pool_size=5
     max_overflow=10
     pool_pre_ping=True
     pool_recycle=300
   - Keep SQLite fallback for local development:
     if DATABASE_URL starts with "sqlite" use
     StaticPool with check_same_thread=False
     if DATABASE_URL starts with "postgresql" use
     above pool settings

2. Update requirements.txt to add:
   - psycopg2-binary
   - python-dotenv

3. Create a .env file for local development:
   DATABASE_URL=sqlite:///./gridpilot.db
   Add .env to .gitignore

4. Create .env.example with:
   DATABASE_URL=postgresql://postgres:password@host:5432/railway

5. Add a GET /health endpoint to main.py that:
   - Tries a simple SELECT 1 query against the database
   - Returns {"status": "ok", "database": "connected"} on success
   - Returns {"status": "error", "database": "disconnected"}
     with HTTP 503 on failure

6. Create railway.json at project root:
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}

7. Create a Procfile:
   web: uvicorn main:app --host 0.0.0.0 --port $PORT

Do not change any existing model definitions,
optimizer logic, or API endpoint logic.
```

---

## Prompt 1.2 — Environment Variables and Config

```
I have a FastAPI application deployed on Railway. I need
clean environment variable management.

Tasks:
1. Create config.py using pydantic-settings BaseSettings:

from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./gridpilot.db"

    # App
    SECRET_KEY: str = "change-this-in-production"
    ENVIRONMENT: str = "development"
    APP_NAME: str = "GridPilot"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # OCPP
    OCPP_PORT: int = 9000

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()

2. Add pydantic-settings to requirements.txt

3. Update main.py to import settings from config.py
   and use settings.SECRET_KEY, settings.FRONTEND_URL etc
   wherever these values are currently hardcoded

4. Update .env.example to include all variables from
   Settings class with placeholder values

5. Update railway.json to document which environment
   variables need to be set in Railway dashboard — add
   a comment block listing:
   DATABASE_URL  - from Railway PostgreSQL plugin
   SECRET_KEY    - generate with: openssl rand -hex 32
   FRONTEND_URL  - your Vercel deployment URL
   ENVIRONMENT   - set to "production"

Do not change any optimizer or routing logic.
```

---

## Prompt 1.3 — CORS Middleware

```
I have a FastAPI application. The frontend is a Next.js
app deployed on Vercel. I need CORS configured correctly.

My setup:
- FastAPI on Railway
- Next.js frontend on Vercel at two URLs:
  https://gridpilot.in (custom domain)
  https://[vercel-deployment-url].vercel.app (Vercel URL)
- Local development frontend at http://localhost:3000

Tasks:
1. Add CORS middleware to main.py:

from fastapi.middleware.cors import CORSMiddleware

allowed_origins = [
    "http://localhost:3000",
    "https://gridpilot.in",
    "https://www.gridpilot.in",
    settings.FRONTEND_URL,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

2. Make sure CORS middleware is added BEFORE any
   router includes in main.py — middleware order matters

3. Add a GET /ping endpoint that returns:
   {"message": "pong", "environment": settings.ENVIRONMENT}
   This is used by the frontend to verify connectivity

4. Test CORS is working by adding a note in comments
   showing the curl command to verify:
   curl -H "Origin: https://gridpilot.in" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        https://[railway-url]/ping -v

Do not change any other configuration.
```

---

## Prompt 1.4 — Next.js Environment and API Config

```
I have a Next.js 16 app with TypeScript deployed on Vercel.
The backend is FastAPI on Railway.

Tasks:
1. Create lib/config.ts:

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ||
          'http://localhost:8000',
  appName: 'GridPilot',
  depotId: process.env.NEXT_PUBLIC_DEPOT_ID || 'depot-001',
}

2. Create lib/api.ts with a base fetch wrapper:

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `API error: ${response.status}`)
  }

  return response.json()
}

3. Create .env.local for local development:
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_DEPOT_ID=depot-001

4. Create .env.example:
   NEXT_PUBLIC_API_URL=https://[your-railway-url].railway.app
   NEXT_PUBLIC_DEPOT_ID=depot-001

5. Add .env.local to .gitignore if not already present

6. Create a simple app/page.tsx that:
   - Calls GET /ping on the backend using apiFetch
   - Shows "Backend connected" with a green dot if successful
   - Shows "Backend disconnected" with a red dot if failed
   - This is the landing page before login

7. Update next.config.ts to add:
   - API URL as a server-side environment variable
   - Image domains if needed

All API calls throughout the app must use apiFetch
from lib/api.ts, never raw fetch directly.
```

---

# PHASE 2 — AUTH

---

## Prompt 2.1 — FastAPI JWT Auth with Users Table

```
I have a FastAPI application with PostgreSQL on Railway.
I need to build JWT authentication from scratch without
any third party auth service.

Tasks:
1. Add to requirements.txt:
   - python-jose[cryptography]
   - passlib[bcrypt]

2. Create models/user.py SQLAlchemy model:
   - id (UUID, primary key, default uuid4)
   - email (String, unique, not null)
   - hashed_password (String, not null)
   - role (String, not null)
     values: "depot_admin" or "gridpilot_admin"
   - depot_id (String, nullable)
     depot_admin is restricted to this depot_id
     gridpilot_admin has None (sees all depots)
   - is_active (Boolean, default True)
   - created_at (DateTime, default utcnow)

3. Create auth/utils.py:
   - hash_password(password: str) -> str using bcrypt
   - verify_password(plain: str, hashed: str) -> bool
   - create_access_token(data: dict, expires_delta: timedelta)
     -> str using HS256 JWT, SECRET_KEY from settings
   - decode_token(token: str) -> dict
     raises HTTPException 401 if invalid or expired

4. Create auth/dependencies.py:
   - get_current_user(token from Bearer header) -> User
     decodes JWT, looks up user in database,
     raises 401 if not found or inactive
   - require_depot_admin: get_current_user where
     role in ["depot_admin", "gridpilot_admin"]
   - require_gridpilot_admin: get_current_user where
     role == "gridpilot_admin"
   - get_depot_id(current_user: User) -> str
     if gridpilot_admin: reads depot_id from query param
     if depot_admin: returns current_user.depot_id

5. Create routers/auth.py with endpoints:

   POST /auth/login
     body: {email, password}
     returns: {access_token, token_type: "bearer",
               role, depot_id, email}
     raises 401 if credentials invalid

   GET /auth/me
     requires: get_current_user dependency
     returns: {id, email, role, depot_id, is_active}

6. Create a seed script scripts/create_admin.py that:
   - Creates one gridpilot_admin user
   - Email and password from command line args
   - Usage: python scripts/create_admin.py
     --email admin@gridpilot.in --password yourpassword
   - Prints "Admin user created" on success

7. Include auth router in main.py

8. Apply require_depot_admin dependency to all
   existing depot routes

Do not touch optimizer logic.
```

---

## Prompt 2.2 — Depot Data Isolation via depot_id Filtering

```
I have a FastAPI application with JWT auth. Users have
a depot_id field. depot_admin users must only see data
for their depot. gridpilot_admin sees all depots.

I cannot use Supabase RLS since I am using Railway
PostgreSQL directly. I need to enforce data isolation
at the application layer.

Tasks:
1. Create auth/depot_filter.py with:

def apply_depot_filter(query, model, current_user: User):
    """
    Applies depot_id filter to any SQLAlchemy query.
    gridpilot_admin: no filter applied, sees all depots
    depot_admin: filter by current_user.depot_id
    """
    if current_user.role == "depot_admin":
        return query.filter(
            model.depot_id == current_user.depot_id
        )
    return query

2. Update all existing database query functions
   that return depot-specific data to use
   apply_depot_filter — specifically any query
   that touches:
   - schedule runs
   - charger status
   - vehicle data
   - reports

3. Add depot_id column to any table that does not
   already have it:
   - schedule_runs table
   - charger_status table (if not already added)

4. Update POST /depot/schedule to:
   - Extract depot_id from current_user
   - Store depot_id in the schedule run record
   - Filter all response data through apply_depot_filter

5. Write a test function in scripts/test_isolation.py
   that verifies:
   - depot_admin user A cannot see depot B data
   - gridpilot_admin can see all depot data
   Print PASS or FAIL for each check.

This must be airtight — data leaking between depots
is a critical security failure.
```

---

## Prompt 2.3 — Next.js Login Screen and Auth Context

```
I have a Next.js 16 app with TypeScript, Tailwind CSS v4,
and App Router. The backend has POST /auth/login and
GET /auth/me endpoints returning JWT tokens.

Tasks:
1. Create lib/auth.ts:
   - saveToken(token: string): saves to localStorage
     under key "gridpilot_token" AND sets a cookie
     "gridpilot_token" (needed for middleware)
   - getToken(): returns token from localStorage or null
   - removeToken(): clears token and cookie
   - isAuthenticated(): returns true if token exists
   - getUser(): decodes JWT payload and returns
     {email, role, depot_id} without verifying signature
     (server verifies, client just reads claims)

2. Create context/AuthContext.tsx:
   - AuthProvider component wrapping the app
   - Exposes: user, token, login(), logout(), isLoading
   - login(email, password) calls POST /auth/login,
     saves token, fetches /auth/me, sets user state
   - logout() clears token, redirects to /login
   - On mount: if token exists, fetch /auth/me to
     restore session, handle 401 by clearing token

3. Create app/login/page.tsx:
   Clean, professional design:
   - Dark background (#0F1117)
   - White card centered on screen
   - GridPilot logo text at top in green (#00C851)
   - "Depot Management Platform" subtitle in grey
   - Email field with label
   - Password field with label and show/hide toggle
   - Sign In button — full width, green background
   - Error message in red below button on failure
   - Loading spinner on button while request is in flight
   - On success: redirect to /dashboard

4. Create middleware.ts at project root:
   - Protect all /dashboard/* routes
   - Redirect unauthenticated users to /login
   - Redirect authenticated users from /login to /dashboard
   - Read token from cookie "gridpilot_token"

5. Wrap app/layout.tsx with AuthProvider

6. Create app/dashboard/layout.tsx with:
   - Sidebar navigation with links:
     Schedule (tonight's schedule)
     Live Status (charger grid)
     Report (nightly report)
     Settings (placeholder)
   - Top bar showing logged in user email and role
   - Logout button that calls logout() from AuthContext
   - GridPilot logo in sidebar top

Design must look professional enough to show
to Lithium Urban Technologies management.
```

---

# PHASE 3 — DATA LAYER

---

## Prompt 3.1 — Charger Status Table and Schema

```
I have a FastAPI application with SQLAlchemy and
Railway PostgreSQL. I need a charger_status table
that the optimizer writes to after each run.

Tasks:
1. Create models/charger_status.py:

class ChargerStatus(Base):
    __tablename__ = "charger_status"

    id = Column(UUID, primary_key=True, default=uuid4)
    depot_id = Column(String, nullable=False, index=True)
    vehicle_id = Column(String, nullable=False)
    charger_id = Column(String, nullable=False)
    vehicle_model = Column(String, nullable=False)
    arrival_time = Column(DateTime, nullable=True)
    energy_needed_kwh = Column(Float, nullable=False)
    energy_delivered_kwh = Column(Float, default=0.0)
    current_power_kw = Column(Float, default=0.0)
    soc_percent = Column(Float, default=20.0)
    scheduled_start_slot = Column(Integer, nullable=True)
    status = Column(String, default="queued")
    minutes_to_ready = Column(Integer, nullable=True)
    target_soc = Column(Float, default=80.0)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)
    run_id = Column(UUID, ForeignKey("schedule_runs.id"),
                    nullable=True)

    __table_args__ = (
        Index('ix_charger_status_depot_updated',
              'depot_id', 'updated_at'),
    )

2. Create models/schedule_run.py if it does not exist:

class ScheduleRun(Base):
    __tablename__ = "schedule_runs"

    id = Column(UUID, primary_key=True, default=uuid4)
    depot_id = Column(String, nullable=False, index=True)
    run_at = Column(DateTime, default=datetime.utcnow)
    solver_status = Column(String)
    solve_time_ms = Column(Integer)
    peak_kw_managed = Column(Float)
    peak_kw_unmanaged = Column(Float)
    peak_reduction_percent = Column(Float)
    saving_inr = Column(Float)
    carbon_saved_kg = Column(Float)
    vehicles_ready = Column(Integer)
    vehicles_total = Column(Integer)
    overload_events = Column(Integer)
    load_curve_json = Column(Text)
    raw_schedule_json = Column(Text)

3. Add both models to your Base.metadata.create_all call

4. Create a migration script scripts/migrate.py that:
   - Drops and recreates all tables in development
   - In production (ENVIRONMENT=production) only
     creates tables that do not exist, never drops
   - Run with: python scripts/migrate.py

5. Verify all models import correctly and
   tables create without errors on Railway PostgreSQL
```

---

## Prompt 3.2 — Vehicle to Charger Mapping

```
I have a FastAPI application. The CVXPY optimizer uses
vehicle indices 0-599. The OCPP server uses charger IDs
like CP001-CP600. I need a mapping between them.

Tasks:
1. Create models/vehicle_charger_map.py:

class VehicleChargerMap(Base):
    __tablename__ = "vehicle_charger_map"

    id = Column(UUID, primary_key=True, default=uuid4)
    depot_id = Column(String, nullable=False)
    vehicle_index = Column(Integer, nullable=False)
    vehicle_id = Column(String, nullable=False)
    charger_id = Column(String, nullable=False)
    vehicle_model = Column(String, nullable=False)
    battery_kwh = Column(Float, nullable=False)
    charger_kw = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint('depot_id', 'vehicle_index'),
        UniqueConstraint('depot_id', 'charger_id'),
    )

2. Create services/vehicle_mapping.py:

Fleet composition from Vahan CY2025 data:
- Tata Nexon EV:  162 vehicles, 30.2 kWh, 7.4 kW
- Tata Tiago EV:   84 vehicles, 19.2 kWh, 3.3 kW
- MG Windsor EV:  108 vehicles, 38.0 kWh, 7.4 kW
- Mahindra BE6:   102 vehicles, 59.0 kWh, 7.2 kW
- Tata Curvv EV:   96 vehicles, 55.0 kWh, 7.2 kW
- MG ZS EV:        48 vehicles, 50.3 kWh, 7.4 kW
Total: 600 vehicles

Create function seed_vehicle_charger_map(depot_id: str):
   - Creates 600 VehicleChargerMap records
   - vehicle_id format: V001 through V600
   - charger_id format: CP001 through CP600
   - vehicle_index: 0 through 599
   - Assigns models in the exact proportions above
   - Does nothing if records already exist for depot_id

Create function get_charger_id(depot_id: str,
                                vehicle_index: int) -> str:
   - Returns charger_id for given vehicle_index
   - Raises ValueError if not found

Create function get_full_mapping(depot_id: str)
                                 -> list[dict]:
   - Returns all 600 records as list of dicts
   - Used by optimizer to get battery_kwh and charger_kw

3. Create GET /depot/vehicles endpoint:
   - Requires auth
   - Returns full vehicle charger mapping for depot
   - Calls seed_vehicle_charger_map if no records exist

4. Add seeding call to application startup in main.py:
   On startup, call seed_vehicle_charger_map("depot-001")
   if no records exist

This mapping is the bridge between
optimizer indices and physical charger IDs.
```

---

## Prompt 3.3 — Optimizer Output Adapter

```
I have a FastAPI application with a CVXPY optimizer.
The optimizer returns raw numpy arrays. I need a
post-processing function that converts them into
structured JSON for the dashboard and OCPP dispatcher.

My optimizer returns approximately this structure:
- power_schedule: numpy array shape (600, 96)
  power_schedule[v][t] = kW for vehicle v at timeslot t
- solver_status: string "optimal"
- solve_time_ms: integer
- total_load: numpy array shape (96,) total kW per slot
- peak_kw_managed: float
- carbon_saved_kg: float
- saving_inr: float

Timeslot 0  = 20:00 IST
Timeslot 95 = 06:45 IST
Each timeslot = 15 minutes

Tasks:
1. Create services/schedule_adapter.py with function
   adapt_optimizer_output(
       raw_output: dict,
       depot_id: str,
       vehicle_mapping: list[dict],
       db: Session
   ) -> dict

   This function must:

   a) For each vehicle 0-599:
      - Get vehicle_id, charger_id, model from vehicle_mapping
      - Find first timeslot where power > 0.1 kW
        (scheduled_start_slot)
      - Calculate energy_delivered_kwh:
        sum of power_schedule[v] * 0.25 (15 min = 0.25 hr)
      - Calculate soc_percent:
        starting_soc (20%) + (energy_delivered / battery_kwh * 100)
        cap at 100%
      - Calculate minutes_to_ready:
        find last timeslot where power > 0.1,
        convert to minutes from now
      - Set status:
        "queued"   if scheduled_start_slot is in future
        "charging" if currently in a charging slot
        "ready"    if energy_delivered >= energy_needed

   b) Build charging_periods list for each vehicle:
      [{"timeslot": t, "power_kw": float}
       for t in range(96) if power_schedule[v][t] > 0.1]

   c) Build load_curve list:
      [{"timeslot": t,
        "time_label": "20:00" etc,
        "managed_kw": total_load[t],
        "unmanaged_kw": calculated unmanaged peak}
       for t in range(96)]

      Unmanaged load: assume all vehicles charge at full
      charger_kw rate from timeslot 0 until energy filled,
      sum across all vehicles per timeslot

   d) Return structured dict:
   {
     "run_id": uuid,
     "depot_id": depot_id,
     "run_at": datetime ISO string,
     "solver_status": "optimal",
     "solve_time_ms": int,
     "peak_kw_managed": float,
     "peak_kw_unmanaged": float,
     "peak_reduction_percent": float,
     "saving_inr": float,
     "carbon_saved_kg": float,
     "trees_equivalent": int (carbon_saved_kg / 4.8),
     "vehicles_ready": int,
     "vehicles_total": 600,
     "overload_events": 0,
     "load_curve": [...],
     "vehicles": [
       {
         "vehicle_id": "V001",
         "charger_id": "CP001",
         "vehicle_model": "Tata Nexon EV",
         "vehicle_index": 0,
         "battery_kwh": 30.2,
         "charger_kw": 7.4,
         "energy_needed_kwh": float,
         "energy_delivered_kwh": float,
         "soc_percent": float,
         "scheduled_start_slot": int,
         "status": "queued",
         "minutes_to_ready": int,
         "charging_periods": [...]
       }
     ]
   }

2. Call adapt_optimizer_output at end of existing
   POST /depot/schedule endpoint, passing raw optimizer
   output and vehicle_mapping from get_full_mapping()

3. Store adapted output:
   - Save ScheduleRun record to database
   - Save all 600 ChargerStatus records to database
   - Store load_curve as JSON in schedule_run.load_curve_json
   - Store vehicles list as JSON in schedule_run.raw_schedule_json

The locked simulation numbers that must match output:
- peak_kw_managed:        2000
- peak_kw_unmanaged:      4456
- peak_reduction_percent: 55.1
- saving_inr:             860000
- carbon_saved_kg:        2072
- vehicles_ready:         600
- vehicles_total:         600
- overload_events:        0

If solver returns these values, adapter must preserve
them exactly. Do not round or alter locked numbers.
```

---

## Prompt 3.4 — Charger Status API Endpoints

```
I have a FastAPI application with ChargerStatus and
ScheduleRun models in PostgreSQL on Railway.

I need API endpoints that serve data to the dashboard.

Tasks:
1. Create routers/depot.py with these endpoints,
   all requiring require_depot_admin dependency:

GET /depot/chargers/status
   Query params: depot_id (optional, gridpilot_admin only)
   Returns current charger status for all vehicles:
   {
     "depot_id": "depot-001",
     "last_updated": "ISO datetime",
     "summary": {
       "total": 600,
       "charging": int,
       "queued": int,
       "ready": int,
       "fault": int
     },
     "chargers": [list of ChargerStatus as dicts]
   }
   Apply depot filter from auth/depot_filter.py
   Order by vehicle_id ascending

GET /depot/schedule/latest
   Returns most recent ScheduleRun for depot:
   Full adapted output JSON from raw_schedule_json
   Plus run metadata (run_at, solver_status, solve_time_ms)
   Returns 404 if no schedule run exists yet

GET /depot/schedule/history
   Returns last 30 schedule runs for depot:
   Each run: id, run_at, peak_kw_managed,
   peak_reduction_percent, saving_inr,
   vehicles_ready, solver_status
   No raw JSON — summary only

GET /depot/live-stream
   Server-Sent Events endpoint:
   Streams charger status updates every 5 seconds
   Returns same structure as /depot/chargers/status
   Requires token in query param since EventSource
   cannot set Authorization header:
   GET /depot/live-stream?token=JWT_TOKEN
   Validate token manually, not via dependency

2. Install sse-starlette, add to requirements.txt

3. The SSE endpoint replaces Supabase Realtime entirely.
   Frontend connects once and receives updates every 5s.

4. Add all routers to main.py
```

---

## Prompt 3.5 — Nightly Report Endpoint

```
I have a FastAPI application with ScheduleRun and
ChargerStatus models. I need a report endpoint
that aggregates nightly data.

Tasks:
1. Create routers/report.py:

GET /depot/report/latest
   Requires require_depot_admin

   Fetches most recent ScheduleRun for depot
   Returns:
   {
     "date": "2026-06-24",
     "depot_name": "Gurugram Hub 1",
     "run_at": "ISO datetime",
     "peak_kw_managed": 2000.0,
     "peak_kw_unmanaged": 4456.0,
     "peak_reduction_percent": 55.1,
     "demand_charge_managed_inr": 190000,
     "demand_charge_unmanaged_inr": 1050000,
     "saving_inr": 860000,
     "saving_monthly_inr": 860000,
     "carbon_saved_kg": 2072,
     "trees_equivalent": 430,
     "vehicles_ready": 600,
     "vehicles_total": 600,
     "overload_events": 0,
     "solver_status": "optimal",
     "solve_time_ms": 3000,
     "load_curve": [...from schedule run...]
   }

   Returns 404 with message:
   "No report available yet. Report generates after
   tonight's optimization run at 20:00 IST."
   if no run exists

GET /depot/report/history
   Returns last 90 days of nightly reports:
   Each: date, saving_inr, peak_kw_managed,
   carbon_saved_kg, vehicles_ready
   Used for monthly trend charts on dashboard

2. demand_charge calculations:
   managed:   (peak_kw_managed / 0.8) * 350
   unmanaged: (peak_kw_unmanaged / 0.8) * 350
   These are DVVNL HT-2 tariff calculations
   Power factor: 0.8
   Rate: Rs 350/kVA/month

3. depot_name: read from a depot config or
   hardcode "Gurugram Hub 1" for now with a TODO comment

4. Add router to main.py
```

---

# PHASE 4 — DASHBOARD

---

## Prompt 4.1 — Tonight's Schedule Screen

```
I have a Next.js 16 app with TypeScript, Tailwind CSS v4,
App Router, and Recharts installed.

Backend endpoints available:
- GET /depot/schedule/latest returns schedule JSON
- GET /auth/me returns current user
- Token stored in cookie "gridpilot_token"

I need app/dashboard/schedule/page.tsx

Tasks:
1. Fetch schedule data server-side using token from cookies

2. Four stat cards in a row at the top:
   Card 1: "Managed Peak"   — 2,000 kW  — green
   Card 2: "Peak Reduction" — 55.1%     — green
   Card 3: "Monthly Saving" — Rs 8.60L  — green
   Card 4: "Fleet Ready"    — 600/600   — green

   Each card: dark background, metric in large white text,
   label in small grey text, coloured left border

3. Recharts AreaChart below stats:
   Width: responsive (use ResponsiveContainer)
   Height: 280px
   X axis: time labels every 2 hours from 20:00 to 07:00
   Y axis: kW, range 0 to 5000
   Area 1: unmanaged_kw — red, opacity 0.3, label "Unmanaged"
   Area 2: managed_kw — green, opacity 0.6, label "Managed"
   Reference line at y=4000 — dashed red   — label "Transformer Limit"
   Reference line at y=2000 — dashed green — label "GridPilot Target"
   Tooltip showing both values on hover
   Legend at bottom

4. Vehicle table below chart:
   Columns: Vehicle ID | Model | Arrival |
            Energy Needed | Scheduled Start | Status

   Status badges:
   queued   — amber background, dark text
   charging — green background, white text
   ready    — blue background, white text
   fault    — red background, white text

   Filter buttons above table: All | Charging | Queued | Ready | Fault
   Active filter button highlighted in green

   Show 20 rows by default with "Show all 600" button
   Table is sortable by clicking column headers

5. Handle states:
   Loading: skeleton placeholders for cards, chart, table
   Error: "Failed to load schedule. Please try again."
          with retry button
   No data: "No schedule available yet.
             Optimization runs at 20:00 IST tonight."
             with a countdown timer to 20:00 IST

6. Page title: "Tonight's Schedule" with run timestamp
   shown as "Last run: 24 Jun 2026, 20:00 IST"
```

---

## Prompt 4.2 — Live Charger Status Grid

```
I have a Next.js 16 app with TypeScript, Tailwind CSS v4,
and App Router.

Backend provides:
- GET /depot/chargers/status for initial load
- GET /depot/live-stream?token=JWT for SSE updates
  Updates arrive every 5 seconds as JSON

I need app/dashboard/live/page.tsx

Tasks:
1. Create components/ChargerTile.tsx:

   Props: vehicle_id, vehicle_model, charger_id,
          current_power_kw, soc_percent, status,
          minutes_to_ready, energy_needed_kwh,
          energy_delivered_kwh

   Display:
   - Top: charger_id in small grey, vehicle_id in white bold
   - Middle: vehicle_model in small grey text
   - SoC progress bar — coloured by status:
     charging: green fill
     queued:   amber fill
     ready:    blue fill
     fault:    red fill
   - SoC percentage right-aligned above bar
   - Bottom: current_power_kw + "kW" left,
             minutes_to_ready + "min" right
   - Tile background — subtle tint by status:
     charging: dark green tint
     queued:   dark amber tint
     ready:    dark blue tint
     fault:    dark red tint
   - Tile size: fixed 120px x 140px
   - Rounded corners, subtle border

2. Create components/ChargerGrid.tsx:

   Props: initialChargers: ChargerStatus[], token: string

   - On mount: connect to SSE endpoint
     /depot/live-stream?token={token}
   - On each SSE message: update matching charger by vehicle_id
   - On unmount: close EventSource connection
   - Render 600 ChargerTile components in CSS grid
   - Grid: auto-fill columns of 120px minimum width
   - Summary bar above grid:
     "Charging: X | Queued: X | Ready: X | Faults: X"
     Each count coloured by status
   - Last updated timestamp top right, updates every 5s

3. Create app/dashboard/live/page.tsx:
   - Fetch initial charger states server-side
   - Read token from cookies server-side
   - Pass both to ChargerGrid as props
   - Page title: "Live Charger Status"
   - Subtitle: "600 vehicles — Gurugram Hub 1"

4. Handle states:
   Loading: "Connecting to live feed..." with spinner
   SSE error: "Live feed disconnected. Reconnecting..."
              auto-retry every 10 seconds
   No chargers: "Waiting for tonight's schedule..."

5. Add a "Simulate Update" button visible only in
   development environment (NEXT_PUBLIC_ENV=development)
   that randomly changes 10 charger statuses —
   useful for demoing without a live optimizer run
```

---

## Prompt 4.3 — Nightly Report Screen

```
I have a Next.js 16 app with TypeScript, Tailwind CSS v4.

Backend provides:
- GET /depot/report/latest
- GET /depot/report/history

I need app/dashboard/report/page.tsx

Tasks:
1. Fetch report data server-side from /depot/report/latest

2. Page header:
   - GridPilot logo text left, depot name right
   - "Nightly Operations Report" as page title
   - Date: "Wednesday, 24 June 2026"
   - "Generated at 07:00 IST" subtitle
   - Download PDF button (calls window.print()) top right
   - Hide Download PDF button when printing

3. Six metric cards in 2 rows of 3:
   Row 1:
   - Managed Peak:   2,000 kW  (green)
   - Unmanaged Peak: 4,456 kW  (red)
   - Peak Reduction: 55.1%     (green)
   Row 2:
   - Monthly Saving: Rs 8.60L  (green)
   - CO2 Avoided:    2,072 kg  (green)
   - Fleet Ready:    600/600   (green)

4. Auto-generated summary paragraph:
   "GridPilot managed tonight's charging schedule for
   Gurugram Hub 1. Peak demand was reduced from 4,456 kW
   to 2,000 kW — a 55.1% reduction — with zero transformer
   overload events. All 600 vehicles reached 80% State of
   Charge by 07:00 IST. The DVVNL demand charge for tonight
   amounts to Rs 1.90L versus Rs 10.50L unmanaged — a saving
   of Rs 8.60L this month. Carbon emissions avoided:
   2,072 kg CO2, equivalent to 430 trees."
   Replace all numbers with actual values from API response.

5. Load curve chart (same Recharts AreaChart as schedule page)
   Smaller height: 200px
   No interactivity needed on print version

6. 30-day trend section:
   Fetch from /depot/report/history
   Small bar chart showing daily saving_inr for last 30 days
   X axis: dates, Y axis: Rs lakhs

7. Print CSS using Tailwind print: variant:
   - Hide sidebar navigation
   - Hide Download PDF button
   - Hide 30-day trend (too much ink)
   - White background
   - All text black
   - Metric cards: border only, no background colour
   - Font size 11pt
   - Page break before load curve chart

8. Handle states:
   Before 07:00 IST: show countdown timer
   "Tonight's report will be ready in X hours Y minutes"
   No data: "No reports available yet."
   Loading: skeleton for each section

9. Auto-refresh page at 07:00:00 IST using
   useEffect checking time every 60 seconds
```

---

## Prompt 4.4 — Loading Skeletons and Error Boundary

```
I have a Next.js 16 app with TypeScript and Tailwind CSS v4.

I need shared loading and error components used across
all dashboard pages.

Tasks:
1. Create components/ui/SkeletonCard.tsx:
   Animated pulse skeleton for a stat card
   Props: none
   Renders a grey pulsing rectangle the size of a stat card

2. Create components/ui/SkeletonTable.tsx:
   Props: rows (default 10), columns (default 6)
   Renders N rows of M pulsing grey cells
   Used for vehicle table loading state

3. Create components/ui/SkeletonChart.tsx:
   Props: height (default 280)
   Renders a pulsing grey rectangle of given height
   Used for load curve chart loading state

4. Create components/ui/ErrorMessage.tsx:
   Props: message, onRetry (optional function)
   Renders:
   - Red icon and "Something went wrong" heading
   - The message prop below
   - "Try Again" button if onRetry provided
   - Clean, minimal styling

5. Create components/ui/EmptyState.tsx:
   Props: title, subtitle, icon (optional)
   Renders a centered empty state with title and subtitle
   Used when API returns no data

6. Create app/dashboard/error.tsx:
   Next.js error boundary for the dashboard route group
   Shows ErrorMessage component
   Logs error to console

7. Create app/dashboard/loading.tsx:
   Next.js loading UI for the dashboard route group
   Shows four SkeletonCard components in a row
   Below that a SkeletonChart
   Below that a SkeletonTable

8. Update all three dashboard pages (schedule, live, report)
   to use these components for their loading and
   error states instead of inline implementations

All skeleton animations use Tailwind animate-pulse.
```

---

# PHASE 5 — OCPP

---

## Prompt 5.1 — OCPP WebSocket via FastAPI

```
I have a FastAPI application on Railway. I need an
OCPP 1.6J WebSocket server mounted directly on FastAPI
so both HTTP and WebSocket run on the same Railway port.

Do NOT use a separate websockets.serve process.
Mount everything on FastAPI's existing app instance.

Tasks:
1. Install ocpp library, add to requirements.txt:
   pip install ocpp

2. Create ocpp_server/handlers.py:

from ocpp.v16 import ChargePoint as cp
from ocpp.v16 import call_result, call
from ocpp.routing import on
from datetime import datetime

class ChargePointHandler(cp):

    @on('BootNotification')
    async def on_boot_notification(self,
        charge_point_model, charge_point_vendor, **kwargs):
        print(f"[OCPP] {self.id} connected: {charge_point_model}")
        return call_result.BootNotification(
            current_time=datetime.utcnow().isoformat(),
            interval=30,
            status='Accepted'
        )

    @on('Heartbeat')
    async def on_heartbeat(self, **kwargs):
        return call_result.Heartbeat(
            current_time=datetime.utcnow().isoformat()
        )

    @on('StatusNotification')
    async def on_status_notification(self, connector_id,
        error_code, status, **kwargs):
        print(f"[OCPP] {self.id} status: {status}")
        await update_charger_status_in_db(
            self.id, connector_id, status
        )
        return call_result.StatusNotification()

    async def send_charging_profile(self,
                                     charging_periods: list):
        result = await self.call(
            call.SetChargingProfile(
                connector_id=0,
                cs_charging_profiles={
                    "chargingProfileId": 1,
                    "stackLevel": 0,
                    "chargingProfilePurpose": "TxDefaultProfile",
                    "chargingProfileKind": "Absolute",
                    "chargingSchedule": {
                        "chargingRateUnit": "W",
                        "chargingSchedulePeriod": [
                            {
                                "startPeriod": i * 900,
                                "limit": p["power_kw"] * 1000
                            }
                            for i, p in enumerate(charging_periods)
                            if p["power_kw"] > 0.1
                        ]
                    }
                }
            )
        )
        return result

3. Create ocpp_server/registry.py:
   connected_chargers: dict[str, ChargePointHandler] = {}

   Functions:
   register_charger(charger_id, handler)
   unregister_charger(charger_id)
   get_charger(charger_id) -> ChargePointHandler | None
   get_all_connected() -> list[str]

4. Create ocpp_server/db_bridge.py with function
   update_charger_status_in_db(charger_id, connector_id, status):
   Updates the ChargerStatus table row where
   charger_id matches, sets status field
   Uses a new database session (not request-scoped)

5. Create routers/ocpp_ws.py with FastAPI WebSocket route:

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

@router.websocket("/ocpp/{charger_id}")
async def ocpp_endpoint(websocket: WebSocket, charger_id: str):
    await websocket.accept(subprotocol="ocpp1.6")

    cp_handler = ChargePointHandler(
        charger_id,
        websocket
    )
    register_charger(charger_id, cp_handler)

    try:
        await cp_handler.start()
    except WebSocketDisconnect:
        print(f"[OCPP] {charger_id} disconnected")
    finally:
        unregister_charger(charger_id)

Note: the ocpp library expects a websockets connection
object. FastAPI WebSocket has a different interface.
You need to create a thin adapter class that wraps
FastAPI WebSocket to match the interface expected by
the ocpp library (send, recv methods).
Research the correct adapter pattern for ocpp + FastAPI.

6. Add GET /ocpp/connected endpoint:
   Returns list of connected charger IDs and count
   No auth required (used for demo monitoring)

7. Include ocpp_ws router in main.py

Chargers connect to:
wss://[railway-url]/ocpp/CP001
```

---

## Prompt 5.2 — Charger Simulator

```
I need a standalone Python script that simulates 10
OCPP 1.6J chargers connecting to my server and
behaving realistically for demo purposes.

This script runs locally, not on Railway.

Tasks:
1. Create simulator/charger_client.py:

A SimulatedCharger class using the ocpp library
client side that:

- Takes charger_id and server_url as constructor args
- On start:
  connects to wss://{server_url}/ocpp/{charger_id}
  with subprotocol ocpp1.6
  sends BootNotification
  sends StatusNotification(status=Available)
  starts heartbeat loop every 30 seconds

- Handles SetChargingProfile from server:
  logs "Received schedule with X periods"
  sends StatusNotification(status=Charging)
  starts simulating SoC increase:
    every 30 seconds, increase soc by
    (power_kw * 0.5) / battery_kwh * 100
    (0.5 minutes of charging at power_kw)
  when soc reaches 80%:
    sends StatusNotification(status=Finishing)
    prints "Vehicle {charger_id} reached 80% SoC"

2. Create simulator/run_simulators.py:

import asyncio
import argparse

async def main(server_url: str, num_chargers: int):
    chargers = []
    for i in range(1, num_chargers + 1):
        charger_id = f"CP{i:03d}"
        charger = SimulatedCharger(charger_id, server_url)
        chargers.append(charger)

    async def start_with_delay(charger, delay):
        await asyncio.sleep(delay)
        print(f"Connecting {charger.charger_id}...")
        await charger.start()

    tasks = [
        start_with_delay(c, i * 2)
        for i, c in enumerate(chargers)
    ]
    await asyncio.gather(*tasks, return_exceptions=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", required=True,
        help="Railway URL e.g. gridpilot.railway.app")
    parser.add_argument("--chargers", type=int, default=10)
    args = parser.parse_args()
    asyncio.run(main(args.server, args.chargers))

3. Create simulator/requirements.txt:
   ocpp
   websockets

4. Usage instructions as comments at top of
   run_simulators.py:

   Install: pip install -r simulator/requirements.txt
   Run: python simulator/run_simulators.py \
        --server wss://gridpilot.railway.app \
        --chargers 10

This simulator is for demo and testing only.
```

---

## Prompt 5.3 — SetChargingProfile Dispatcher

```
I have a FastAPI application with an OCPP registry
of connected chargers and an optimizer that produces
structured schedule output.

After the optimizer runs and adapt_optimizer_output
returns structured JSON, I need to push charging
schedules to connected chargers via SetChargingProfile.

Tasks:
1. Create ocpp_server/dispatcher.py:

async def push_schedule_to_chargers(
    adapted_output: dict
) -> dict:

    results = {
        "pushed": [],
        "skipped": [],
        "errors": []
    }

    for vehicle in adapted_output["vehicles"]:
        charger_id = vehicle["charger_id"]
        handler = get_charger(charger_id)

        if handler is None:
            results["skipped"].append(charger_id)
            continue

        try:
            await handler.send_charging_profile(
                vehicle["charging_periods"]
            )
            results["pushed"].append(charger_id)
            print(f"[DISPATCH] Schedule pushed to {charger_id}")
        except Exception as e:
            results["errors"].append({
                "charger_id": charger_id,
                "error": str(e)
            })
            print(f"[DISPATCH] Error pushing to {charger_id}: {e}")

    print(f"[DISPATCH] Complete: "
          f"{len(results['pushed'])} pushed, "
          f"{len(results['skipped'])} skipped, "
          f"{len(results['errors'])} errors")

    return results

2. Update the POST /depot/schedule endpoint to call
   push_schedule_to_chargers after adapt_optimizer_output:

   dispatch_results = await push_schedule_to_chargers(
       adapted_output
   )

   Include dispatch_results in the API response:
   {
     ...existing optimizer response...,
     "dispatch": {
       "pushed": 10,
       "skipped": 590,
       "errors": 0
     }
   }

   Skipped is not an error — most vehicles will be
   skipped in demo (only 10 simulated chargers connected)

3. Add POST /ocpp/push-schedule endpoint:
   Requires require_gridpilot_admin
   Manually triggers dispatch for latest schedule
   Useful for demo without waiting for 20:00 IST:

   Fetches latest schedule from database
   Calls push_schedule_to_chargers
   Returns dispatch results

4. Never let dispatch failure crash the optimizer
   response. Wrap entire dispatch in try/except.
   If dispatch fails completely, log the error and
   return the optimizer result anyway.
   The schedule is saved to database regardless
   of dispatch outcome.
```

---

# PHASE 6 — INTEGRATION TEST

---

## Prompt 6.1 — End-to-End Test Script

```
I have a complete FastAPI + Next.js GridPilot application.
I need an end-to-end test script that verifies the entire
pipeline works before the Saturday demo.

Create tests/test_e2e.py

Tests to run in sequence:

TEST 1 — Health Check
GET /health
Assert: status 200
Assert: response.database == "connected"
Assert: response time < 2000ms
Print: PASS/FAIL with response time

TEST 2 — CORS Headers
OPTIONS /ping with Origin: https://gridpilot.in
Assert: Access-Control-Allow-Origin header present
Print: PASS/FAIL

TEST 3 — Auth Login
POST /auth/login with admin credentials
Assert: status 200
Assert: access_token in response
Save token for subsequent tests
Print: PASS/FAIL

TEST 4 — Auth Me
GET /auth/me with Bearer token
Assert: status 200
Assert: role == "gridpilot_admin"
Print: PASS/FAIL

TEST 5 — Vehicle Mapping Exists
GET /depot/vehicles with Bearer token
Assert: status 200
Assert: len(vehicles) == 600
Assert: vehicles[0] has charger_id, vehicle_id, model
Print: PASS/FAIL with count

TEST 6 — Optimizer Runs
POST /depot/schedule with Bearer token
Body: {"depot_id": "depot-001", "run_date": today}
Assert: status 200
Assert: solver_status == "optimal"
Assert: peak_kw_managed == 2000
Assert: peak_kw_unmanaged == 4456
Assert: vehicles_ready == 600
Assert: response time < 10000ms
Save run_id for subsequent tests
Print: PASS/FAIL with solve_time_ms

TEST 7 — Charger Status Populated
GET /depot/chargers/status with Bearer token
Assert: status 200
Assert: len(chargers) == 600
Assert: summary.total == 600
Print: PASS/FAIL

TEST 8 — Latest Schedule Retrievable
GET /depot/schedule/latest with Bearer token
Assert: status 200
Assert: load_curve has 96 entries
Assert: vehicles array has 600 entries
Print: PASS/FAIL

TEST 9 — OCPP WebSocket Accepts Connection
Connect WebSocket to wss://gridpilot.railway.app/ocpp/TEST001
with subprotocol ocpp1.6
Send BootNotification message:
{
  "messageTypeId": 2,
  "uniqueId": "test-1",
  "action": "BootNotification",
  "payload": {
    "chargePointModel": "TestCharger",
    "chargePointVendor": "TestVendor"
  }
}
Assert: receive response with status "Accepted"
Assert: connection stays open for 5 seconds
Close connection
Print: PASS/FAIL

TEST 10 — SSE Stream Connects
Connect to GET /depot/live-stream?token=JWT
Assert: receives first event within 10 seconds
Assert: event contains chargers array
Close connection
Print: PASS/FAIL

TEST 11 — Report Endpoint
GET /depot/report/latest with Bearer token
Assert: status 200 OR 404 with correct message
If 200: assert saving_inr == 860000
Print: PASS/FAIL

TEST 12 — Manual Schedule Push
POST /ocpp/push-schedule with Bearer token
Assert: status 200
Assert: dispatch.pushed >= 0
Assert: dispatch.errors == 0
Print: PASS/FAIL

SUMMARY at end:
print("=" * 50)
print(f"GridPilot E2E Test Results — {datetime.now()}")
print(f"PASSED: {passed}/{total}")
print(f"FAILED: {failed}/{total}")
if failed > 0:
    print("Failed tests:")
    for t in failed_tests:
        print(f"  - {t.name}: {t.error}")
print("=" * 50)

Run with:
python tests/test_e2e.py \
  --backend-url https://gridpilot.railway.app \
  --email admin@gridpilot.in \
  --password yourpassword

Add to requirements.txt:
httpx
websockets
```

---

## Summary: All 24 Prompts

| # | Prompt | Owner | Phase |
|---|--------|-------|-------|
| 1.1 | Railway PostgreSQL + Database Setup | Aaryan | Foundation |
| 1.2 | Environment Variables and Config | Aaryan | Foundation |
| 1.3 | CORS Middleware | Aaryan | Foundation |
| 1.4 | Next.js Environment and API Config | Richard | Foundation |
| 2.1 | FastAPI JWT Auth with Users Table | Aaryan | Auth |
| 2.2 | Depot Data Isolation via depot_id | Aaryan | Auth |
| 2.3 | Next.js Login Screen and Auth Context | Richard | Auth |
| 3.1 | Charger Status Table and Schema | Aaryan | Data Layer |
| 3.2 | Vehicle to Charger Mapping | Aaryan | Data Layer |
| 3.3 | Optimizer Output Adapter | Aaryan | Data Layer |
| 3.4 | Charger Status API Endpoints | Aaryan | Data Layer |
| 3.5 | Nightly Report Endpoint | Aaryan | Data Layer |
| 4.1 | Tonight's Schedule Screen | Richard | Dashboard |
| 4.2 | Live Charger Status Grid | Richard | Dashboard |
| 4.3 | Nightly Report Screen | Richard | Dashboard |
| 4.4 | Loading Skeletons and Error Boundary | Richard | Dashboard |
| 5.1 | OCPP WebSocket via FastAPI | Aaryan | OCPP |
| 5.2 | Charger Simulator | Aaryan | OCPP |
| 5.3 | SetChargingProfile Dispatcher | Aaryan | OCPP |
| 6.1 | End-to-End Test Script | Both | Integration |

---

## Cost Summary

| Item | One-Time | Monthly |
|------|----------|---------|
| Domain gridpilot.in | Rs 800 | Rs 0 |
| Railway Hobby Plan | Rs 0 | Rs 475 ($5) |
| Vercel Hobby | Rs 0 | Rs 0 |
| All other tools | Rs 0 | Rs 0 |
| **Total** | **Rs 800** | **Rs 475** |

---

*GridPilot — CHRIST (Deemed to be University), Bangalore*
*Aaryan Dharrmik (Backend, Optimizer) · Richard Raju (Frontend, Pipeline)*
