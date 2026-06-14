# GridPilot

Intelligent EV charging orchestration for India's corporate fleet depots, powered by the FirstFlight grid intelligence engine.

## Live Demo

https://frontend-nine-virid-4bi7088jda.vercel.app/

## Depot Dashboard

https://frontend-nine-virid-4bi7088jda.vercel.app/dashboard

## What GridPilot Solves

Every night, hundreds of corporate EVs return to a Gurugram depot and plug in at the same time. Without orchestration, depot load spikes to 4,100 kW, pushing the transformer to 185% loading and creating repeated DVVNL demand-charge exposure.

GridPilot uses a convex optimizer to flatten charging while still getting every vehicle ready by 07:00. Same fleet, same energy, zero overloads, and no hardware changes.

## Real Simulation Results

| Metric | Unmanaged | GridPilot | Result |
|---|---:|---:|---:|
| Peak load | 4,100 kW | 2,204 kW | -46.3% |
| Transformer loading | 185% | stable | overload avoided |
| Overload events | 5 per night | 0 | -100% |
| pandapower critical states | 14 | 0 | eliminated |
| Carbon saved | baseline | 774 kg/night | -18.3% |
| DVVNL saving | penalty exposure | Rs 6.05 lakh/month | confirmed |
| Vehicles ready by 07:00 | at risk | 500/500 | confirmed |
| Solver time | manual planning | 1,831ms | CVXPY ECOS optimal |

## Fleet Model

The depot simulation uses a 6-model mixed India EV fleet based on Vahan CY2024 proportions, ACN-Data behavioral distributions, and Vasudha Foundation energy calibration.

Representative fleet:

- Tata Nexon EV
- Tata Tiago EV
- MG ZS EV
- Mahindra XUV400
- Hyundai Kona Electric
- BYD e6

## System Levels

Step 0 - Real data:

- Mixed 6-model India fleet using Vahan CY2025 mix
- ACN-Data real behavioral arrival and dwell distributions
- First-Principles energy calibration
- CEA India 2024-25 carbon data
- Data provenance API endpoint

Level 1 - Next.js 16 frontend:

- Landing page with real simulation story
- `/dashboard` depot operations page
- Live API integration with fallback values
- Recharts load profile with red unmanaged spike and purple GridPilot curve
- 46.3% peak reduction and Rs 6.05 lakh/month savings surfaced in the UI

Level 2 - Production backend:

- FastAPI backend
- SQLite run-history database
- JSON structured logging
- API key authentication with localhost bypass
- `/analytics` endpoint for cumulative savings and recent runs

Level 3 - OCPP and frequency demand response:

- Mock OCPP 1.6 central system
- 10 simulated chargers
- `SetChargingProfile` dispatch demo
- POSOCO real-time grid frequency integration with synthetic fallback
- Frequency-based EV demand-response signal

## API Highlights

| Endpoint | Purpose |
|---|---|
| `POST /depot/schedule` | Run GridPilot depot optimizer |
| `GET /depot/status` | Current depot state |
| `GET /depot/carbon_signal` | Haryana carbon signal |
| `GET /depot/chargers` | Mock OCPP charger list |
| `POST /depot/dispatch` | Mock OCPP charging-profile dispatch |
| `GET /grid/frequency` | Grid frequency demand-response signal |
| `GET /grid/signal` | FirstFlight signal bus |
| `GET /analytics` | Saved optimizer run analytics |
| `GET /data_provenance` | Data source provenance |

## Quick Start

```powershell
pip install -r requirements.txt
python -m uvicorn api.main:app --port 8000
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

- http://localhost:3000/
- http://localhost:3000/dashboard

For the OCPP mock:

```powershell
python scripts/start_ocpp.py
```

## Tech Stack

| Layer | Technology |
|---|---|
| Scheduler | CVXPY + ECOS convex QP |
| Depot physics | pandapower AC power flow |
| Backend | FastAPI + SQLite + structured logs |
| Frontend | Next.js 16 + React + Framer Motion + Recharts |
| Grid intelligence | FirstFlight forecasting, carbon, anomaly, frequency signal bus |
| Charger protocol | OCPP 1.6 mock central system |
| Data | Vahan CY2025, ACN-Data, CEA India 2024-25, First-Principles calibration |

## Academic Context

Developed for the Pre-Ideathon Summit: From Concept to Impact, Department of Computer Science and Engineering, CHRIST (Deemed to be University), Academic Year 2025-26.

Authors: A. Aaryan Dharrmik, Richard Raju, Sincy John

GridPilot v1.0 | Powered by FirstFlight
