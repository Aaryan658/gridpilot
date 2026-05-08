---

# ⚡ GridPilot
### Intelligent EV Charging Orchestration for India's Corporate Fleet Depots

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green)
![React](https://img.shields.io/badge/React-18-61dafb)
![CVXPY](https://img.shields.io/badge/Optimizer-CVXPY+ECOS-purple)
![License](https://img.shields.io/badge/License-MIT-yellow)

## The Problem

Every night, hundreds of corporate EVs return to their Gurugram depot after the evening shift and plug in simultaneously. Without intelligent orchestration, the DVVNL transformer runs at 185% rated capacity. One bad night means depot shutdown and 500 drivers without a vehicle for morning shift.

## The Solution

GridPilot flattens the peak using a convex quadratic optimizer that solves in under 4 seconds for 500 vehicles. Same energy delivered. Zero overloads. Rs 7.35 lakh saved every month. Pure software. No hardware changes.

## Real Simulation Results

| Metric | Without GridPilot | With GridPilot | Delta |
|---|---|---|---|
| Peak load | 4,100 kW (185%) | 2,000 kW | -51.2% |
| Overload events | 5 per night | 0 | -100% |
| Carbon emissions | baseline | -1,206 kg CO2/night | -11.9% |
| DVVNL demand charge | full penalty | Rs 0 | -100% |
| Monthly saving | — | Rs 7.35 lakh | confirmed |
| Vehicles ready by 07:00 | — | 500/500 | confirmed |
| Solver time | — | 3,943ms | confirmed |

FirstFlight ML Engine Results:

| Region | Forecast MAPE | Anomaly F1 |
|---|---|---|
| NR | 0.85% | 0.97 |
| SR | 0.83% | 1.00 |
| ER | 0.84% | 0.91 |
| WR | 0.82% | 0.99 |
| NER | 0.83% | 0.90 |

## Architecture

FIRSTFLIGHT ENGINE
  Prophet Forecasting | IsolationForest Anomaly Detection
  CEA Carbon Signals  | National Load Optimizer
  Signal Bus feeds into GridPilot scheduler

GRIDPILOT CORE
  CVXPY Convex QP Scheduler (ECOS solver)
  pandapower 7-bus Depot Physics Simulator
  V2G Dispatch Engine
  500 x Tata Nexon EV Fleet Management

FASTAPI BACKEND
  /depot/schedule | /depot/status | /grid/signal

REACT FRONTEND (Vite)
  Depot Dashboard | Schedule Optimizer
  National Grid   | Command Center
  Framer Motion + Recharts + Vanta.js 3D

## Quick Start

pip install -r requirements.txt
python scripts/setup.py
uvicorn api.main:app --port 8000

In a new terminal:
cd frontend
npm install
npm run dev
Open localhost:5173

## Tech Stack

| Layer | Technology |
|---|---|
| EV Scheduler | CVXPY + ECOS (convex QP) |
| Physics | pandapower (AC power flow) |
| Forecasting | Facebook Prophet |
| Anomaly Detection | Isolation Forest |
| Carbon Data | CEA India 2022-23 (real) |
| EV Sessions | ACN-Data, Caltech (adapted) |
| Backend | FastAPI + uvicorn |
| Frontend | React 18 + Framer Motion + Recharts |
| 3D Background | Vanta.js + Three.js |
| Grid Signals | FirstFlight engine (internal) |

## Data Sources

EV charging behavior: Flores-Espino et al. (2021). ACN-Data. Caltech. https://ev.caltech.edu/dataset

Carbon emission factors: Central Electricity Authority. CO2 Baseline Database v16 (2022-23). Government of India.

Weather: Open-Meteo Historical Weather API. https://open-meteo.com

## Demo Scenario

Modeled on Lithium Urban Technologies (project-lithium.com) — India's largest 100% electric corporate fleet operator, Gurugram, Haryana.

500 x Tata Nexon EV (40 kWh, 7.4 kW AC charger)
Arrival: 20:00 to 22:00 IST (post evening shift)
Deadline: 07:00 IST (morning dispatch)
Grid: DVVNL HT-2 Gurugram
Carbon: CEA Haryana 0.820 kg CO2/kWh

## Project Structure

gridpilot/
├── pipeline/          Data ingestion (CEA, ACN, weather)
├── firstflight/       National grid ML engine
├── gridpilot/         EV orchestration core
├── api/               FastAPI backend
├── frontend/          React dashboard
├── scripts/           Setup and utilities
└── data/              Generated data (gitignored)

## Academic Context

Developed for the Pre-Ideathon Summit: From Concept to Impact, Department of Computer Science and Engineering, CHRIST (Deemed to be University), Academic Year 2025-26.

Authors: A. Aaryan Dharrmik, Richard Raju, Sincy John

GridPilot v1.0 | Powered by FirstFlight

---
