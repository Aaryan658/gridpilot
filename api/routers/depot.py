"""
Depot Router — Charger status, schedule history, and SSE live stream.
"""

import asyncio
import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from api.auth.dependencies import require_depot_admin, get_db, optional_current_user
from api.auth.utils import decode_token
from api.models.user import User
from database.models import ChargerStatus, ScheduleRun, VehicleChargerMap
from services.vehicle_mapping import seed_vehicle_charger_map, get_full_mapping
from typing import Optional

router = APIRouter(prefix="/depot", tags=["depot"])

# Vehicle specs for on-the-fly recalculation of minutes_to_ready
_VEHICLE_SPECS = {
    "Tata Nexon EV": {"battery": 30.2, "charger": 7.4},
    "Tata Tiago EV": {"battery": 19.2, "charger": 3.3},
    "MG Windsor EV": {"battery": 38.0, "charger": 7.4},
    "Mahindra BE6":  {"battery": 59.0, "charger": 7.2},
    "Tata Curvv EV": {"battery": 55.0, "charger": 7.2},
    "MG ZS EV":     {"battery": 50.3, "charger": 7.4},
}


def _recalc_charger(c) -> dict:
    """Recalculate status and minutes_to_ready on-the-fly from stored SoC."""
    soc = c.soc_percent or 20.0
    target = c.target_soc or 80.0
    specs = _VEHICLE_SPECS.get(c.vehicle_model, {"battery": 30.0, "charger": 7.4})
    battery_kwh = specs["battery"]
    charger_kw = specs["charger"]

    if soc >= target:
        status = "ready"
        minutes_to_ready = 0
        power_kw = 0.0
    else:
        status = "charging"
        remaining_kwh = (target - soc) / 100.0 * battery_kwh
        minutes_to_ready = round(remaining_kwh / charger_kw * 60) if charger_kw > 0 else None
        power_kw = c.current_power_kw if c.current_power_kw and c.current_power_kw > 0 else charger_kw

    return {
        "status": status,
        "minutes_to_ready": minutes_to_ready,
        "current_power_kw": round(power_kw, 1),
    }


@router.get("/vehicles")
def get_vehicles(
    current_user: User = Depends(require_depot_admin),
    db: Session = Depends(get_db),
):
    """Returns full vehicle-charger mapping for the user's depot."""
    depot_id = current_user.depot_id or "depot-001"

    # Seed if no records exist
    count = db.query(VehicleChargerMap).filter(
        VehicleChargerMap.depot_id == depot_id
    ).count()
    if count == 0:
        seed_vehicle_charger_map(depot_id)

    mapping = get_full_mapping(depot_id)
    return {
        "depot_id": depot_id,
        "total": len(mapping),
        "vehicles": mapping,
    }


@router.get("/chargers/status")
def get_chargers_status(
    depot_id: Optional[str] = Query(None),
    current_user: User = Depends(require_depot_admin),
    db: Session = Depends(get_db),
):
    """Returns current charger status for all vehicles in the depot."""
    # Determine depot_id based on role
    if current_user.role == "gridpilot_admin":
        effective_depot = depot_id or "depot-001"
    else:
        effective_depot = current_user.depot_id or "depot-001"

    chargers = (
        db.query(ChargerStatus)
        .filter(ChargerStatus.depot_id == effective_depot)
        .order_by(ChargerStatus.vehicle_id)
        .all()
    )

    # Build summary counts with on-the-fly recalculation
    status_counts = {"charging": 0, "queued": 0, "ready": 0, "fault": 0}
    charger_list = []
    last_updated = None

    for c in chargers:
        recalc = _recalc_charger(c)
        live_status = recalc["status"]
        status_counts[live_status] = status_counts.get(live_status, 0) + 1
        if c.updated_at and (last_updated is None or c.updated_at > last_updated):
            last_updated = c.updated_at

        charger_list.append({
            "id": c.id,
            "vehicle_id": c.vehicle_id,
            "charger_id": c.charger_id,
            "vehicle_model": c.vehicle_model,
            "arrival_time": c.arrival_time.isoformat() if c.arrival_time else None,
            "energy_needed_kwh": c.energy_needed_kwh,
            "energy_delivered_kwh": c.energy_delivered_kwh,
            "current_power_kw": recalc["current_power_kw"],
            "soc_percent": c.soc_percent,
            "scheduled_start_slot": c.scheduled_start_slot,
            "status": live_status,
            "minutes_to_ready": recalc["minutes_to_ready"],
            "target_soc": c.target_soc,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "run_id": c.run_id,
        })

    return {
        "depot_id": effective_depot,
        "last_updated": last_updated.isoformat() if last_updated else None,
        "summary": {
            "total": len(chargers),
            **status_counts,
        },
        "chargers": charger_list,
    }


@router.post("/chargers/advance")
def advance_chargers(
    minutes: int = Query(5, ge=1, le=60),
    depot_id: Optional[str] = Query(None),
    current_user: User = Depends(require_depot_admin),
    db: Session = Depends(get_db),
):
    """
    Advances every actively-charging vehicle by `minutes` of real charging
    time, mutating the persisted ChargerStatus rows (the same rows
    /chargers/status and /live-stream read from) so the change survives the
    next live-feed poll instead of being a client-only illusion.
    """
    if current_user.role == "gridpilot_admin":
        effective_depot = depot_id or "depot-001"
    else:
        effective_depot = current_user.depot_id or "depot-001"

    chargers = (
        db.query(ChargerStatus)
        .filter(ChargerStatus.depot_id == effective_depot, ChargerStatus.status == "charging")
        .all()
    )

    for c in chargers:
        specs = _VEHICLE_SPECS.get(c.vehicle_model, {"battery": 30.0, "charger": 7.4})
        battery_kwh = (c.energy_needed_kwh / 0.6) if c.energy_needed_kwh else specs["battery"]
        power_kw = c.current_power_kw if c.current_power_kw and c.current_power_kw > 0 else specs["charger"]
        target = c.target_soc or 80.0

        delivered = min(c.energy_needed_kwh, (c.energy_delivered_kwh or 0.0) + power_kw * (minutes / 60.0))
        soc = min(100.0, 20.0 + (delivered / battery_kwh * 100.0 if battery_kwh > 0 else 0.0))
        is_ready = soc >= target - 0.05
        remaining_kwh = max(0.0, (target - soc) / 100.0 * battery_kwh)

        c.energy_delivered_kwh = round(delivered, 2)
        c.soc_percent = round(soc, 1)
        c.status = "ready" if is_ready else "charging"
        c.current_power_kw = 0.0 if is_ready else round(power_kw, 1)
        c.minutes_to_ready = 0 if is_ready else (round(remaining_kwh / power_kw * 60) if power_kw > 0 else None)
        c.updated_at = datetime.datetime.utcnow()

    db.commit()
    return get_chargers_status(depot_id=depot_id, current_user=current_user, db=db)


@router.get("/schedule/latest")
def get_latest_schedule(
    depot_id: Optional[str] = Query(None),
    current_user: User = Depends(require_depot_admin),
    db: Session = Depends(get_db),
):
    """Returns most recent ScheduleRun for the depot with full adapted output."""
    effective_depot = (
        depot_id if current_user.role == "gridpilot_admin" and depot_id
        else current_user.depot_id or "depot-001"
    )

    run = (
        db.query(ScheduleRun)
        .filter(ScheduleRun.depot_id == effective_depot)
        .order_by(ScheduleRun.run_at.desc())
        .first()
    )

    if not run:
        raise HTTPException(status_code=404, detail="No schedule run exists yet")

    result = {
        "run_id": run.id,
        "depot_id": run.depot_id,
        "run_at": run.run_at.isoformat() if run.run_at else None,
        "solver_status": run.solver_status,
        "solve_time_ms": run.solve_time_ms,
        "peak_kw_managed": run.peak_kw_managed,
        "peak_kw_unmanaged": run.peak_kw_unmanaged,
        "peak_reduction_percent": run.peak_reduction_percent,
        "saving_inr": run.saving_inr,
        "carbon_saved_kg": run.carbon_saved_kg,
        "vehicles_ready": run.vehicles_ready,
        "vehicles_total": run.vehicles_total,
        "overload_events": run.overload_events,
    }

    # Parse stored JSON
    if run.load_curve_json:
        try:
            result["load_curve"] = json.loads(run.load_curve_json)
        except Exception:
            result["load_curve"] = []

    if run.raw_schedule_json:
        try:
            result["vehicles"] = json.loads(run.raw_schedule_json)
        except Exception:
            result["vehicles"] = []

    return result


@router.get("/schedule/history")
def get_schedule_history(
    depot_id: Optional[str] = Query(None),
    current_user: User = Depends(require_depot_admin),
    db: Session = Depends(get_db),
):
    """Returns last 30 schedule runs for the depot (summary only, no raw JSON)."""
    effective_depot = (
        depot_id if current_user.role == "gridpilot_admin" and depot_id
        else current_user.depot_id or "depot-001"
    )

    runs = (
        db.query(ScheduleRun)
        .filter(ScheduleRun.depot_id == effective_depot)
        .order_by(ScheduleRun.run_at.desc())
        .limit(30)
        .all()
    )

    return {
        "depot_id": effective_depot,
        "total": len(runs),
        "runs": [
            {
                "id": r.id,
                "run_at": r.run_at.isoformat() if r.run_at else None,
                "peak_kw_managed": r.peak_kw_managed,
                "peak_reduction_percent": r.peak_reduction_percent,
                "saving_inr": r.saving_inr,
                "vehicles_ready": r.vehicles_ready,
                "solver_status": r.solver_status,
            }
            for r in runs
        ],
    }


@router.get("/live-stream")
async def live_stream(
    token: str = Query(...),
    depot_id: Optional[str] = Query(None),
):
    """
    Server-Sent Events endpoint for live charger status updates.
    Streams updates every 5 seconds.

    Uses query param token since EventSource cannot set Authorization headers.
    """
    from sse_starlette.sse import EventSourceResponse

    # Validate token manually
    try:
        payload = decode_token(token)
        email = payload.get("sub")
        role = payload.get("role")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Determine effective depot
    user_depot_id = payload.get("depot_id")
    if role == "gridpilot_admin":
        effective_depot = depot_id or "depot-001"
    else:
        effective_depot = user_depot_id or "depot-001"

    async def event_generator():
        while True:
            db = SessionLocal()
            try:
                chargers = (
                    db.query(ChargerStatus)
                    .filter(ChargerStatus.depot_id == effective_depot)
                    .order_by(ChargerStatus.vehicle_id)
                    .all()
                )

                status_counts = {"charging": 0, "queued": 0, "ready": 0, "fault": 0}
                charger_list = []
                last_updated = None

                for c in chargers:
                    recalc = _recalc_charger(c)
                    live_status = recalc["status"]
                    status_counts[live_status] = status_counts.get(live_status, 0) + 1
                    if c.updated_at and (last_updated is None or c.updated_at > last_updated):
                        last_updated = c.updated_at
                    charger_list.append({
                        "vehicle_id": c.vehicle_id,
                        "charger_id": c.charger_id,
                        "vehicle_model": c.vehicle_model,
                        "energy_needed_kwh": c.energy_needed_kwh,
                        "energy_delivered_kwh": c.energy_delivered_kwh,
                        "current_power_kw": recalc["current_power_kw"],
                        "soc_percent": c.soc_percent,
                        "status": live_status,
                        "minutes_to_ready": recalc["minutes_to_ready"],
                    })

                data = {
                    "depot_id": effective_depot,
                    "last_updated": last_updated.isoformat() if last_updated else None,
                    "summary": {"total": len(chargers), **status_counts},
                    "chargers": charger_list,
                }
                yield {"event": "update", "data": json.dumps(data)}
            except Exception as e:
                yield {"event": "error", "data": json.dumps({"error": str(e)})}
            finally:
                db.close()

            await asyncio.sleep(5)

    # Need to import SessionLocal here since it's used in the generator
    from database.models import SessionLocal

    return EventSourceResponse(event_generator())
