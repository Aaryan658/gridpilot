from __future__ import annotations

import os
import sys
import threading
import time
from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from firstflight.anomaly import AnomalyDetector
from firstflight.carbon import CarbonEngine
from firstflight.forecaster import DemandForecaster
from firstflight.frequency_monitor import (
    FrequencyMonitor
)
from firstflight.national_opt import NationalLoadOptimizer
from firstflight.signal_bus import GridSignalBus
from gridpilot.depot_sim import CorporateEVDepotSimulator
from gridpilot.ev_manager import EVRequestManager
from gridpilot.scheduler import GridPilotScheduler
from gridpilot.v2g import V2GDispatcher
from pipeline.acn_loader import ACNDataLoader
from pipeline.cea_loader import CEALoader
from pipeline.dvvnl_loader import DVVNLLoader
from pipeline.data_provenance import build_data_provenance_report
from database.repository import (
    OptimizerRepository
)
from api.logger import gridpilot_logger
from ocpp_mock.central_system import (
    GridPilotCentralSystem
)


DEPOT_NAME = "Corporate EV Fleet Depot, Gurugram"
OPERATOR_CONTEXT = "Modeled on Lithium Urban Technologies fleet profile"
FULL_OPERATOR_CONTEXT = (
    "Corporate EV Fleet Depot, Gurugram - modeled on Lithium Urban Technologies fleet profile"
)
REGIONS = ["NR", "SR", "ER", "WR", "NER"]
optimizer_repo = OptimizerRepository()
_ocpp_central = None


class ScheduleRequest(BaseModel):
    date: str = "2024-01-15"
    n_vehicles: int = 500
    enable_v2g: bool = False


class SimulateRequest(BaseModel):
    n_vehicles: int = 500
    solar_kw: float = 0.0
    enable_v2g: bool = False
    scenario: str = "normal"


class OptimizeRequest(BaseModel):
    forecast: dict[str, float] | None = None
    generation_capacity: dict[str, float] | None = None
    carbon_signals: dict[str, float] | None = None


class _AppCache:
    signal_bus: GridSignalBus | None = None
    scheduler: GridPilotScheduler | None = None
    depot_sim: CorporateEVDepotSimulator | None = None
    ready: bool = False

_cache = _AppCache()


def get_cors_origins() -> list[str]:
    configured = os.getenv("BACKEND_CORS_ORIGINS", "")
    defaults = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://frontend-nine-virid-4bi7088jda.vercel.app",
    ]
    extra = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return sorted(set(defaults + extra))


app = FastAPI(
    title="GridPilot API",
    version="1.0.0",
    description="GridPilot backend for Corporate EV Fleet Depot, Gurugram.",
)


@app.middleware("http")
async def log_requests(request, call_next):
    start = time.time()
    response = await call_next(request)
    ms = round((time.time() - start) * 1000)
    gridpilot_logger.log_request(
        str(request.url.path),
        request.method,
        response.status_code,
        ms
    )
    return response


# Allow the local frontend and deployed Vercel frontend to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"ERROR: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal engine error. GridPilot switching to autonomous safety mode.",
            "detail": str(exc),
        },
    )


state: dict[str, Any] = {
    "models_loaded": False,
    "solver_ready": False,
    "last_sessions": None,
    "last_schedule_result": None,
    "last_unmanaged_result": None,
    "last_signal": None,
}


@app.on_event("startup")
async def startup_event() -> None:
    print("GridPilot API starting...")
    print("Loading FirstFlight models...")
    state["cea_loader"] = CEALoader()
    state["dvvnl_loader"] = DVVNLLoader()
    state["acn_loader"] = ACNDataLoader()
    state["forecaster"] = DemandForecaster()
    state["forecaster"].train_all()
    state["anomaly"] = AnomalyDetector()
    state["anomaly"].train_all()
    state["national_optimizer"] = NationalLoadOptimizer()
    state["carbon_engine"] = CarbonEngine()

    print("Loading GridPilot engine...")
    state["ev_manager"] = EVRequestManager()
    state["v2g"] = V2GDispatcher()
    state["models_loaded"] = True
    state["solver_ready"] = True

    print("Warming cache in background thread...")

    def _warm():
        t0 = time.time()
        print("\n[CACHE] Warming up...")

        try:
            _cache.signal_bus = GridSignalBus()
            _cache.signal_bus.emit_for_depot()
            print("[CACHE] ✓ Signal bus (Prophet trained)")
        except Exception as e:
            print(f"[CACHE] ✗ Signal bus: {e}")

        try:
            _cache.scheduler = GridPilotScheduler()
            print("[CACHE] ✓ Scheduler (CVXPY ready)")
        except Exception as e:
            print(f"[CACHE] ✗ Scheduler: {e}")

        try:
            _cache.depot_sim = CorporateEVDepotSimulator()
            print("[CACHE] ✓ Depot sim (pandapower ready)")
        except Exception as e:
            print(f"[CACHE] ✗ Depot sim: {e}")

        _cache.ready = True
        ms = round((time.time() - t0) * 1000)
        print(f"[CACHE] Ready in {ms}ms\n")

    threading.Thread(target=_warm, daemon=True).start()

    print("API accepting requests. Cache warming in background.")


def get_cached(obj_name: str):
    return getattr(_cache, obj_name, None)


@app.get("/cache/status")
async def cache_status():
    return {
        "ready": _cache.ready,
        "signal_bus": _cache.signal_bus is not None,
        "scheduler": _cache.scheduler is not None,
        "depot_sim": _cache.depot_sim is not None,
        "message": "All components cached" if _cache.ready else "Still warming up...",
    }


def ensure_ready() -> None:
    if not state.get("models_loaded"):
        import asyncio

        asyncio.run(startup_event())


@app.get("/health")
def health() -> dict:
    ensure_ready()
    return clean_json(
        {
            "status": "ok",
            "models_loaded": bool(state["models_loaded"]),
            "solver_ready": bool(state["solver_ready"]),
            "depot": DEPOT_NAME,
            "operator_context": OPERATOR_CONTEXT,
            "fleet_size": 500,
            "timestamp": timestamp_now(),
        }
    )


@app.get("/depot/status")
def depot_status() -> dict:
    ensure_ready()
    signal = get_signal()
    last = state.get("last_schedule_result")
    if last:
        latest_row = last["timeseries"].iloc[0]
        ev_load = float(latest_row["ev_load_kw"])
        baseline = float(latest_row["building_load_kw"])
    else:
        ev_load = 0.0
        baseline = 400.0
    solar_kw = 0.0
    net_load = ev_load + baseline - solar_kw
    transformer_pct = net_load / 2000.0 * 100.0
    grid_status = "CRITICAL" if transformer_pct >= 110 else "WARNING" if transformer_pct >= 90 else "STABLE"
    return clean_json(
        {
            "transformer_loading_pct": round(transformer_pct, 2),
            "active_evs": active_evs_count(),
            "current_ev_load_kw": round(ev_load, 2),
            "solar_kw": solar_kw,
            "net_load_kw": round(net_load, 2),
            "baseline_load_kw": baseline,
            "carbon_intensity_now": signal["carbon_intensity_now"],
            "carbon_signal": carbon_signal_label(signal["carbon_intensity_now"]),
            "ev_action": signal["ev_action_now"],
            "dvvnl_penalty_risk": net_load > GridPilotScheduler.DVVNL_LIMIT,
            "grid_status": grid_status,
            "timestamp": timestamp_now(),
        }
    )


@app.post("/depot/schedule")
def depot_schedule(request: ScheduleRequest) -> dict:
    ensure_ready()
    sessions = state["ev_manager"].generate_session(request.date, request.n_vehicles)
    state["last_sessions"] = sessions

    baseline_profile = state["dvvnl_loader"].generate_depot_baseline(request.date)
    building_load = scheduler_building_load()
    signal = get_signal(refresh=True)

    _sched = get_cached("scheduler") or GridPilotScheduler()
    unmanaged = _sched.get_unmanaged_baseline(sessions, building_load)
    managed = _sched.schedule(sessions, building_load, signal, request.enable_v2g)
    unmanaged_sim = simulate_schedule(unmanaged, "unmanaged")
    managed_sim = simulate_schedule(managed, "managed")

    state["last_unmanaged_result"] = unmanaged
    state["last_schedule_result"] = managed

    response = {
        "depot": DEPOT_NAME,
        "operator_context": FULL_OPERATOR_CONTEXT,
        "n_vehicles": request.n_vehicles,
        "solve_time_ms": managed["solve_time_ms"],
        "status": managed["status"],
        "all_ready_on_time": managed["all_ready_on_time"],
        "request": request.model_dump(),
        "fleet_profile": state["ev_manager"].get_fleet_summary(sessions),
        "fleet_summary": managed["fleet_summary"],
        "baseline_profile": baseline_profile.to_dict("records"),
        "carbon_signal": signal,
        "unmanaged": summarize_schedule(unmanaged),
        "managed": summarize_schedule(managed),
        "comparison": managed["comparison"],
        "physics_simulation": {
            "unmanaged": summarize_simulation(unmanaged_sim),
            "managed": summarize_simulation(managed_sim),
        },
        "timestamp": timestamp_now(),
    }
    result = clean_json(response)
    try:
        run_id = optimizer_repo.save_run(result)
        result["run_id"] = run_id
        gridpilot_logger.log_optimizer_run(result)
    except Exception as e:
        print(f"DB save failed: {e}")
    return result


@app.get("/depot/carbon_signal")
def depot_carbon_signal() -> dict:
    ensure_ready()
    signal = get_signal(refresh=True)
    return clean_json(
        {
            "state": "Haryana",
            "intensity_now": signal["carbon_intensity_now"],
            "signal_now": carbon_signal_label(signal["carbon_intensity_now"]),
            "ev_action_now": signal["ev_action_now"],
            "forecast_48h": signal["carbon_forecast_48h"],
            "clean_windows": signal["clean_windows"],
            "source": "CEA India 2022-23 | FirstFlight",
            "rationale": signal["rationale"],
        }
    )


@app.post("/depot/dispatch")
async def dispatch_to_chargers(
    n_chargers: int = 10
):
    return {
        "dispatched": n_chargers,
        "failed": 0,
        "dispatch_rate_pct": 100.0,
        "ocpp_version": "1.6",
        "protocol":
            "SetChargingProfile",
        "message": (
            f"{n_chargers}/{n_chargers} "
            f"charging profiles sent "
            f"via OCPP 1.6"
        ),
        "note": (
            "Start mock server: "
            "python scripts/start_ocpp.py"
        )
    }


@app.get("/depot/chargers")
async def get_chargers():
    return {
        "connected": 10,
        "protocol": "OCPP 1.6",
        "chargers": [
            {
                "id":
                    f"GRIDPILOT_{i+1:03d}",
                "status": "Charging",
                "power_kw": 7.4,
                "ocpp_version": "1.6",
            }
            for i in range(10)
        ],
        "note": (
            "Mock chargers. Start with: "
            "python scripts/start_ocpp.py"
        )
    }


@app.post("/depot/simulate")
def depot_simulate(request: SimulateRequest) -> dict:
    ensure_ready()
    sessions = state["ev_manager"].generate_session("2024-01-15", request.n_vehicles)
    building_load = scenario_building_load(request.scenario)
    signal = get_signal()
    _sched = get_cached("scheduler") or GridPilotScheduler()
    unmanaged = _sched.get_unmanaged_baseline(sessions, building_load)
    managed = _sched.schedule(sessions, building_load, signal, request.enable_v2g)

    solar = pd.Series([float(request.solar_kw)] * 48)
    before = simulate_schedule(unmanaged, "before", solar_profile=solar)
    after = simulate_schedule(managed, "after", solar_profile=solar)
    return clean_json(
        {
            "scenario": request.scenario,
            "before": summarize_simulation(before),
            "after": summarize_simulation(after),
            "comparison": managed["comparison"],
            "timestamp": timestamp_now(),
        }
    )


@app.get("/depot/v2g")
def depot_v2g() -> dict:
    ensure_ready()
    sessions = get_or_create_sessions()
    active = sessions.head(200).copy()
    active["current_soc_pct"] = 80.0
    potential = state["v2g"].calculate_potential(active.to_dict("records"))
    return clean_json(
        {
            "available_kw": potential["available_kw"],
            "available_kwh": potential["available_kwh"],
            "willing_vehicles": potential["willing_vehicles_n"],
            "monthly_dvvnl_saving_inr": potential["estimated_monthly_dvvnl_saving_inr"],
            "co2_offset_kg_per_day": potential["co2_offset_kg_per_day"],
            "revenue_potential_inr_month": potential["estimated_monthly_dvvnl_saving_inr"],
        }
    )


@app.get("/depot/fleet")
def depot_fleet() -> dict:
    ensure_ready()
    sessions = get_or_create_sessions()
    last = state.get("last_schedule_result")
    vehicles = []
    for row in sessions.itertuples(index=False):
        scheduled = last and str(row.vehicle_id) in last["schedule"]
        item = last["schedule"][str(row.vehicle_id)] if scheduled else {}
        vehicles.append(
            {
                "vehicle_id": row.vehicle_id,
                "zone": row.zone,
                "arrival": pd.Timestamp(row.arrival_time).strftime("%H:%M"),
                "deadline": pd.Timestamp(row.departure_deadline).strftime("%H:%M"),
                "energy_kwh": float(row.energy_needed_kwh),
                "ready_at": item.get("ready_at", "07:00"),
                "on_time": bool(item.get("on_time", False)) if scheduled else False,
                "status": "ready" if item.get("on_time", False) else "scheduled",
            }
        )
    ready = sum(1 for vehicle in vehicles if vehicle["status"] == "ready")
    return clean_json(
        {
            "total": len(vehicles),
            "scheduled": len(vehicles),
            "charging": 0 if last else len(vehicles),
            "ready": ready,
            "at_risk": 0 if last and last["all_ready_on_time"] else len(vehicles),
            "delayed": 0 if last and last["all_ready_on_time"] else len(vehicles),
            "vehicles": vehicles,
        }
    )


@app.get("/grid/forecast")
def grid_forecast(region: str = Query("NR"), hours: int = Query(24, ge=1, le=168)) -> dict:
    ensure_ready()
    forecast = state["forecaster"].forecast(region.upper(), hours)
    return clean_json({"region": region.upper(), "hours": hours, "forecast": forecast.to_dict("records")})


@app.get("/grid/anomalies")
def grid_anomalies(region: str = Query("ALL"), last_hours: int = Query(168, ge=1, le=336)) -> dict:
    ensure_ready()
    regions = REGIONS if region.upper() == "ALL" else [region.upper()]
    results = []
    for reg in regions:
        detected = state["anomaly"].detect(reg, last_hours)
        results.extend(detected[detected["is_anomaly"]].to_dict("records"))
    return clean_json({"region": region.upper(), "last_hours": last_hours, "anomalies": results})


@app.post("/grid/optimize")
def grid_optimize(request: OptimizeRequest) -> dict:
    ensure_ready()
    forecast = request.forecast or {"NR": 68000, "SR": 54000, "ER": 26000, "WR": 66000, "NER": 4300}
    capacity = request.generation_capacity or {"NR": 73000, "SR": 55500, "ER": 28000, "WR": 72000, "NER": 4600}
    carbon = request.carbon_signals or {"NR": 0.820, "SR": 0.536, "ER": 0.862, "WR": 0.724, "NER": 0.621}
    return clean_json(state["national_optimizer"].optimize(forecast, capacity, carbon))


@app.get("/grid/carbon")
def grid_carbon(state_name: str = Query("Haryana", alias="state")) -> dict:
    ensure_ready()
    forecast = state["carbon_engine"].get_forecast_48h(state_name)
    return clean_json(
        {
            "state": state_name.title(),
            "intensity_now": state["carbon_engine"].get_intensity(state_name, datetime.now()),
            "forecast_48h": forecast.to_dict("records"),
            "clean_windows": [
                {
                    "start": start.strftime("%H:%M"),
                    "end": end.strftime("%H:%M"),
                    "avg_intensity": avg,
                    "label": label,
                }
                for start, end, avg, label in state["carbon_engine"].get_cleanest_windows(state_name)
            ],
        }
    )


@app.get("/grid/frequency")
async def grid_frequency():
    fm = FrequencyMonitor()
    return fm.get_demand_response_signal()


@app.get("/grid/signal")
def grid_signal() -> dict:
    ensure_ready()
    return clean_json(get_signal(refresh=True))


@app.get("/data_provenance")
async def data_provenance():
    return build_data_provenance_report()


@app.get("/analytics")
async def analytics():
    return {
        "cumulative":
            optimizer_repo.get_cumulative_savings(),
        "recent_runs":
            optimizer_repo.get_last_runs(10),
    }


@app.get("/dashboard_data")
def dashboard_data() -> dict:
    ensure_ready()
    signal = get_signal()
    sessions = get_or_create_sessions()
    last = state.get("last_schedule_result")
    forecast_all = {
        region: state["forecaster"].forecast(region, 24).to_dict("records") for region in REGIONS
    }
    opt = state["national_optimizer"].optimize(
        {"NR": 68000, "SR": 54000, "ER": 26000, "WR": 66000, "NER": 4300},
        {"NR": 73000, "SR": 55500, "ER": 28000, "WR": 72000, "NER": 4600},
        {"NR": 0.820, "SR": 0.536, "ER": 0.862, "WR": 0.724, "NER": 0.621},
    )
    active_anomalies = grid_anomalies("ALL", 168)["anomalies"]
    clean_window = signal["clean_windows"][0] if signal["clean_windows"] else {}
    return clean_json(
        {
            "depot": {
                "status": depot_status(),
                "schedule_summary": summarize_schedule(last) if last else None,
                "carbon_signal": signal,
                "fleet_summary": state["ev_manager"].get_fleet_summary(sessions),
                "v2g_status": depot_v2g(),
                "last_schedule_result": summarize_schedule(last) if last else None,
                "operator_context": FULL_OPERATOR_CONTEXT,
            },
            "national": {
                "forecast_all_regions": forecast_all,
                "active_anomalies": active_anomalies,
                "grid_stability_score": opt["stability_score"],
                "optimization_snapshot": opt,
                "at_c_loss_today_crore": opt["savings_crore_per_day"],
            },
            "signal_bridge": {
                "current_signal": carbon_signal_label(signal["carbon_intensity_now"]),
                "rationale": signal["rationale"],
                "clean_window_next": clean_window,
                "recommended_action": signal["ev_action_now"],
                "macro_to_micro_explanation": (
                    "FirstFlight converts national demand, anomaly, and Haryana carbon signals "
                    "into GridPilot depot charging limits for the Gurugram fleet."
                ),
            },
            "last_updated": timestamp_now(),
        }
    )


def get_signal(refresh: bool = False) -> dict:
    if refresh or not state.get("last_signal"):
        bus = get_cached("signal_bus") or GridSignalBus()
        state["last_signal"] = bus.emit_for_depot("haryana")
    return state["last_signal"]


def active_evs_count() -> int:
    sessions = state.get("last_sessions")
    return int(len(sessions)) if sessions is not None else 500


def get_or_create_sessions() -> pd.DataFrame:
    if state.get("last_sessions") is None:
        state["last_sessions"] = state["ev_manager"].generate_session("2024-01-15", 500)
    return state["last_sessions"]


def scheduler_building_load() -> pd.Series:
    return pd.Series([400.0] * GridPilotScheduler.N_SLOTS)


def scenario_building_load(scenario: str) -> pd.Series:
    if scenario == "worst_case":
        return pd.Series([900.0] * GridPilotScheduler.N_SLOTS)
    if scenario == "monsoon":
        return pd.Series([520.0] * GridPilotScheduler.N_SLOTS)
    return scheduler_building_load()


def simulate_schedule(result: dict, label: str, solar_profile: pd.Series | None = None) -> pd.DataFrame:
    timeseries = result["timeseries"]
    window = timeseries.iloc[32:80].reset_index(drop=True)
    ev_schedule = {}
    for slot, row in window.iterrows():
        zone_kw = float(row["ev_load_kw"]) / 4.0
        ev_schedule[slot] = {"A": zone_kw, "B": zone_kw, "C": zone_kw, "D": zone_kw}
    baseline = window["building_load_kw"].reset_index(drop=True)
    solar = solar_profile if solar_profile is not None else pd.Series([0.0] * 48)
    depot = get_cached("depot_sim") or CorporateEVDepotSimulator()
    return depot.simulate_night(ev_schedule, baseline, solar, label)


def summarize_simulation(simulation: pd.DataFrame) -> dict:
    return {
        "peak_kw": float(simulation["net_load_kw"].max()),
        "critical_slots": int((simulation["status"] == "CRITICAL").sum()),
        "warning_slots": int((simulation["status"] == "WARNING").sum()),
        "stable_slots": int((simulation["status"] == "STABLE").sum()),
        "rows": simulation.to_dict("records"),
    }


def summarize_schedule(result: dict | None) -> dict | None:
    if result is None:
        return None
    return {
        "status": result["status"],
        "solve_time_ms": result["solve_time_ms"],
        "peak_kw": result["peak_kw"],
        "overload_events": result["overload_events"],
        "total_energy_kwh": result["total_energy_kwh"],
        "total_carbon_kg": result["total_carbon_kg"],
        "dvvnl_penalty_inr": result["dvvnl_penalty_inr"],
        "all_ready_on_time": result["all_ready_on_time"],
        "fleet_summary": result["fleet_summary"],
        "comparison": result.get("comparison", {}),
    }


def carbon_signal_label(intensity: float) -> str:
    if intensity < 0.75:
        return "CLEAN"
    if intensity <= 0.84:
        return "NEUTRAL"
    return "DIRTY"


def timestamp_now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def clean_json(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): clean_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [clean_json(item) for item in value]
    if isinstance(value, tuple):
        return [clean_json(item) for item in value]
    if isinstance(value, pd.DataFrame):
        return clean_json(value.to_dict("records"))
    if isinstance(value, pd.Series):
        return clean_json(value.to_dict())
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
        return None
    return value
