"""
Bridges the real GridPilotScheduler output to the OCPP central system's
SetChargingProfile calls, so the physical 5-relay rig is driven by the same
optimizer the software dashboard demos — not a scripted on/off sequence.

Matches hardware_demo_evaluation.md's demo flow: a single BOOT-button toggle
between two states (not a full animated night):
  - "unmanaged": the raw timeslot where the most bays are simultaneously
    charging (the overload moment every unmanaged EV depot hits).
  - "managed": the raw timeslot, among slots with any charging activity,
    where the fewest bays are simultaneously charging (the clearest
    staggering moment GridPilot produces).

Charger IDs are RIG_BAY_1..RIG_BAY_5, matching bay index 0-4 + 1.
"""
from __future__ import annotations

from gridpilot.ev_manager import EVRequestManager
from gridpilot.scheduler import GridPilotScheduler
from api.routers.demo import _building_load, _vehicle_schedules

N_RIG_VEHICLES = 5
CHARGER_ON_KW = 7.4
CHARGER_OFF_KW = 0.0


def _rig_schedule() -> dict:
    """Runs the real optimizer for a 5-vehicle fleet (1:1 with the 5 relay
    bays — no scale factor needed) and returns per-charger power schedules
    for both the unmanaged baseline and the GridPilot-managed schedule."""
    ev_manager = EVRequestManager()
    sessions = ev_manager.generate_session(
        "2024-01-15", N_RIG_VEHICLES, soc_override_pct=20.0, target_soc_pct=100.0
    )
    building_load = _building_load(N_RIG_VEHICLES)
    scheduler = GridPilotScheduler(n_vehicles_for_capacity=N_RIG_VEHICLES)

    unmanaged = scheduler.get_unmanaged_baseline(sessions, building_load)
    managed = scheduler.schedule(
        sessions, building_load, {}, enable_v2g=False, unmanaged_reference=unmanaged
    )

    return {
        "unmanaged": _vehicle_schedules(sessions, unmanaged["power_schedule"]),
        "managed": _vehicle_schedules(sessions, managed["power_schedule"]),
    }


def _bays_on_at_slot(vehicles: list[dict], raw_slot: int) -> set[int]:
    """Bay indices (0-4) drawing power at a given raw 15-min timeslot."""
    return {
        i
        for i, v in enumerate(vehicles)
        if any(p["timeslot"] == raw_slot and p["power_kw"] > 0.1 for p in v["charging_periods"])
    }


def _worst_slot(vehicles: list[dict], n_slots: int = 96) -> int:
    """Raw slot with the most simultaneous bays on — the overload moment."""
    counts = [len(_bays_on_at_slot(vehicles, t)) for t in range(n_slots)]
    return counts.index(max(counts))


def _best_managed_slot(vehicles: list[dict], n_slots: int = 96) -> int:
    """Raw slot, among slots with at least one active bay, with the fewest
    simultaneous bays on — the clearest staggering moment."""
    active = [(t, len(_bays_on_at_slot(vehicles, t))) for t in range(n_slots)]
    active = [(t, c) for t, c in active if c > 0]
    if not active:
        return 0
    return min(active, key=lambda tc: tc[1])[0]


def rig_state(mode: str) -> dict[int, float]:
    """Per-bay-index (0-4) target power_kw for the requested demo mode."""
    schedule = _rig_schedule()
    if mode == "unmanaged":
        vehicles = schedule["unmanaged"]
        slot = _worst_slot(vehicles)
    else:
        vehicles = schedule["managed"]
        slot = _best_managed_slot(vehicles)
    on = _bays_on_at_slot(vehicles, slot)
    return {i: (CHARGER_ON_KW if i in on else CHARGER_OFF_KW) for i in range(N_RIG_VEHICLES)}


async def push_mode(central_system, mode: str) -> dict:
    """Sends SetChargingProfile to each connected rig charger (RIG_BAY_1..5)
    for the given mode ('unmanaged' or 'managed')."""
    state = rig_state(mode)
    results = {}
    for i, power_kw in state.items():
        charger_id = f"RIG_BAY_{i + 1}"
        results[charger_id] = await central_system.send_charging_profile(
            charger_id, power_kw, start_time="2024-01-15T20:00:00Z", duration_minutes=60
        )
    return results
