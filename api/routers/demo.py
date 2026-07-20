"""
Demo Router — self-contained "Overload -> Optimize -> Zero Overload" presentation endpoint.

Built for the judge-facing /dashboard/demo page. Runs the real CVXPY/CLARABEL
scheduler with a user-chosen fleet size and per-vehicle SoC-on-arrival, and
returns everything the frontend needs (both load curves + per-vehicle
charging schedules) in a single response.

Deliberately does NOT write to the database (no ScheduleRun / ChargerStatus
rows) and does NOT reuse services/schedule_adapter.py, so repeated demo runs
can never affect the live /depot endpoints or ChargerGrid state.

Vehicle ordering is deterministic for a given n_vehicles (fixed FLEET_MIX
allocation, see pipeline/acn_loader.py), so a roster fetched from
GET /demo/fleet stays valid to key a vehicle_soc override map for a
following POST /demo/schedule call with the same n_vehicles.
"""

import numpy as np
import pandas as pd
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from gridpilot.ev_manager import EVRequestManager
from gridpilot.scheduler import GridPilotScheduler

router = APIRouter(prefix="/demo", tags=["demo"])

DEMO_TARGET_SOC_PCT = 100.0


class DemoScheduleRequest(BaseModel):
    date: str = "2024-01-15"
    n_vehicles: int = Field(40, ge=5, le=200)
    soc_pct: float = Field(20.0, ge=0.0, le=100.0)
    vehicle_soc: dict[str, float] | None = None


def _building_load(n_vehicles: int) -> pd.Series:
    # Depot ops/facility load scales with fleet size too, same reference
    # ratio as the transformer/DVVNL capacity (see GridPilotScheduler
    # .REFERENCE_FLEET_SIZE) — otherwise a fixed 25 kW load eats most of a
    # small depot's scaled-down transformer headroom and GridPilot's
    # optimized schedule ends up worse than the unmanaged baseline.
    scale = n_vehicles / GridPilotScheduler.REFERENCE_FLEET_SIZE
    return pd.Series([25.0 * scale] * GridPilotScheduler.N_SLOTS)


def _carbon_signal() -> dict:
    try:
        from firstflight.signal_bus import GridSignalBus
        return GridSignalBus().emit_for_depot("haryana")
    except Exception:
        return {}


def _vehicle_schedules(sessions: pd.DataFrame, power_schedule: np.ndarray) -> list[dict]:
    vehicles = []
    for i, row in sessions.reset_index(drop=True).iterrows():
        power_row = power_schedule[i]
        charging_periods = [
            {"timeslot": int(t), "power_kw": round(float(power_row[t]), 2)}
            for t in range(len(power_row))
            if power_row[t] > 0.1
        ]
        delivered_kwh = sum(p["power_kw"] * 0.25 for p in charging_periods)
        battery_kwh = float(row.get("battery_kwh", 30.0)) or 30.0
        starting_soc = float(row.get("current_soc_pct", 20.0))
        soc_percent = min(100.0, starting_soc + (delivered_kwh / battery_kwh) * 100.0)

        vehicles.append({
            "vehicle_id": row["vehicle_id"],
            "vehicle_model": row["vehicle_model"],
            "charger_id": f"CHG-{i + 1:03d}",
            "battery_kwh": battery_kwh,
            "charger_kw": float(row.get("charger_kw", 7.4)),
            "energy_needed_kwh": round(float(row["energy_needed_kwh"]), 2),
            "energy_delivered_kwh": round(delivered_kwh, 2),
            "starting_soc_pct": round(starting_soc, 1),
            "target_soc_pct": DEMO_TARGET_SOC_PCT,
            "soc_percent": round(soc_percent, 1),
            "charging_periods": charging_periods,
        })
    return vehicles


def _capacity_summary(scheduler: GridPilotScheduler) -> dict:
    """Depot capacity figures for the given (possibly fleet-scaled) scheduler
    instance, so the frontend never has to hardcode transformer/DVVNL kW."""
    return {
        "transformer_kva": round(scheduler.TRANSFORMER_LIMIT, 1),
        "transformer_kw": round(scheduler.TRANSFORMER_LIMIT_REAL_KW, 1),
        "dvvnl_kva": round(scheduler.DVVNL_LIMIT, 1),
        "dvvnl_kw": round(scheduler.DVVNL_LIMIT_REAL_KW, 1),
        "managed_target_kw": round(scheduler.MANAGED_TARGET_KW, 1),
        "hard_cap_kw": round(scheduler.HARD_CAP_KW, 1),
    }


@router.get("/fleet")
def demo_fleet(
    date: str = Query("2024-01-15"),
    n_vehicles: int = Query(40, ge=5, le=200),
) -> dict:
    """Roster preview (vehicle_id/model/battery/charger) so the frontend can
    render one SoC control per vehicle before a schedule is actually run.
    Ordering is deterministic for a given n_vehicles — SoC/arrival fields on
    this response are placeholders and are not used by /demo/schedule."""
    ev_manager = EVRequestManager()
    sessions = ev_manager.generate_session(date, n_vehicles)
    vehicles = [
        {
            "vehicle_id": row["vehicle_id"],
            "vehicle_model": row["vehicle_model"],
            "battery_kwh": float(row["battery_kwh"]),
            "charger_kw": float(row.get("charger_kw", 7.4)),
        }
        for _, row in sessions.reset_index(drop=True).iterrows()
    ]
    capacity = _capacity_summary(GridPilotScheduler(n_vehicles_for_capacity=n_vehicles))
    return {"n_vehicles": n_vehicles, "vehicles": vehicles, "capacity": capacity}


@router.post("/schedule")
def demo_schedule(request: DemoScheduleRequest) -> dict:
    from api.main import summarize_schedule, clean_json, timestamp_now, DEPOT_NAME

    ev_manager = EVRequestManager()
    soc_override = request.vehicle_soc if request.vehicle_soc else request.soc_pct
    sessions = ev_manager.generate_session(
        request.date,
        request.n_vehicles,
        soc_override_pct=soc_override,
        target_soc_pct=DEMO_TARGET_SOC_PCT,
    )

    building_load = _building_load(request.n_vehicles)
    signal = _carbon_signal()
    scheduler = GridPilotScheduler(n_vehicles_for_capacity=request.n_vehicles)

    unmanaged = scheduler.get_unmanaged_baseline(sessions, building_load)
    managed = scheduler.schedule(
        sessions, building_load, signal, enable_v2g=False, unmanaged_reference=unmanaged, include_range=True
    )

    vehicles = _vehicle_schedules(sessions, managed["power_schedule"])
    vehicles_unmanaged = _vehicle_schedules(sessions, unmanaged["power_schedule"])

    response = {
        "depot": DEPOT_NAME,
        "n_vehicles": request.n_vehicles,
        "soc_pct": request.soc_pct,
        "target_soc_pct": DEMO_TARGET_SOC_PCT,
        "fleet_profile": ev_manager.get_fleet_summary(sessions),
        "unmanaged": summarize_schedule(unmanaged),
        "managed": summarize_schedule(managed),
        "comparison": managed["comparison"],
        "vehicles": vehicles,
        "vehicles_unmanaged": vehicles_unmanaged,
        "capacity": _capacity_summary(scheduler),
        "timestamp": timestamp_now(),
    }
    return clean_json(response)
