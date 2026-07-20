from __future__ import annotations

import os
import sys

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from gridpilot.scheduler import GridPilotScheduler


class MPCController:
    """Receding-horizon controller: re-solves the full-night QP every tick,
    but only commits the power dispatched in the slot at `current_slot`.

    Assumes every vehicle shares the same departure deadline (true for the
    current fleet generator, which always sets 07:00) — a vehicle-specific
    departure would need slot bookkeeping this class doesn't do yet.
    """

    def __init__(
        self,
        scheduler: GridPilotScheduler,
        ev_requests: pd.DataFrame,
        building_load: pd.Series,
        carbon_signal: dict,
    ) -> None:
        self.scheduler = scheduler
        self.original_requests = ev_requests.reset_index(drop=True).copy()
        self.building_load = building_load
        self.carbon_signal = carbon_signal

        arrivals = pd.to_datetime(self.original_requests["arrival_time"])
        departures = pd.to_datetime(self.original_requests["departure_deadline"])
        self.base_time = GridPilotScheduler._base_time(arrivals)

        self.n_vehicles = len(self.original_requests)
        self.delivered_kwh = np.zeros(self.n_vehicles)

        initial_availability = scheduler._compute_availability_matrix(
            arrivals, departures, self.n_vehicles, GridPilotScheduler.N_SLOTS, self.base_time
        )
        active_slots = np.where(initial_availability.any(axis=0))[0]
        if len(active_slots) == 0:
            raise ValueError("No vehicle is available in any slot — check ev_requests")
        self.start_slot = int(active_slots.min())
        self.end_slot = int(active_slots.max()) + 1
        self.current_slot = self.start_slot

        self.dispatch_history: list[dict] = []
        self.unmanaged_reference = scheduler.get_unmanaged_baseline(self.original_requests, building_load)

    @property
    def is_complete(self) -> bool:
        return self.current_slot >= self.end_slot

    def _requests_for_tick(self) -> pd.DataFrame:
        now = self.base_time + pd.Timedelta(minutes=15 * self.current_slot)
        adjusted = self.original_requests.copy()
        arrivals = pd.to_datetime(adjusted["arrival_time"])
        adjusted["arrival_time"] = arrivals.clip(lower=now)
        energy_needed = adjusted["energy_needed_kwh"].to_numpy(dtype=float)
        adjusted["energy_needed_kwh"] = np.maximum(0.0, energy_needed - self.delivered_kwh)
        return adjusted

    def step(self) -> dict:
        if self.is_complete:
            raise RuntimeError("MPC horizon already complete")

        requests = self._requests_for_tick()
        result = self.scheduler.schedule(
            requests,
            self.building_load,
            self.carbon_signal,
            unmanaged_reference=self.unmanaged_reference,
            base_time_override=self.base_time,
        )

        power = result["power_schedule"]
        dispatch_kw = power[:, self.current_slot].copy()
        self.delivered_kwh += dispatch_kw * GridPilotScheduler.DELTA_T

        building = np.resize(np.asarray(self.building_load, dtype=float), GridPilotScheduler.N_SLOTS)
        tick_record = {
            "slot": self.current_slot,
            "timestamp": (self.base_time + pd.Timedelta(minutes=15 * self.current_slot)).isoformat(),
            "dispatch_kw": dispatch_kw.tolist(),
            "total_load_kw": float(dispatch_kw.sum() + building[self.current_slot]),
            "solve_time_ms": result["solve_time_ms"],
            "solver_status": result["status"],
        }
        self.dispatch_history.append(tick_record)
        self.current_slot += 1
        return tick_record

    def run_to_completion(self) -> list[dict]:
        while not self.is_complete:
            self.step()
        return self.dispatch_history

    def get_status(self) -> dict:
        energy_needed = self.original_requests["energy_needed_kwh"].to_numpy(dtype=float)
        return {
            "current_slot": self.current_slot,
            "start_slot": self.start_slot,
            "end_slot": self.end_slot,
            "is_complete": self.is_complete,
            "delivered_kwh_total": float(self.delivered_kwh.sum()),
            "energy_needed_kwh_total": float(energy_needed.sum()),
            "all_ready_so_far": bool(np.all(self.delivered_kwh >= energy_needed - 1e-6)),
            "ticks_run": len(self.dispatch_history),
            "last_solve_time_ms": self.dispatch_history[-1]["solve_time_ms"] if self.dispatch_history else None,
            "recent_dispatch": self.dispatch_history[-20:],
        }


if __name__ == "__main__":
    from gridpilot.ev_manager import EVRequestManager

    manager = EVRequestManager()
    requests = manager.generate_session("2024-03-15", n=40)
    building = pd.Series([25.0] * GridPilotScheduler.N_SLOTS)
    scheduler = GridPilotScheduler()

    controller = MPCController(scheduler, requests, building, carbon_signal={})
    print(f"MPC horizon: slots {controller.start_slot}..{controller.end_slot} ({controller.end_slot - controller.start_slot} ticks)")

    history = controller.run_to_completion()

    status = controller.get_status()
    print(f"Ticks run: {status['ticks_run']}")
    print(f"Delivered: {status['delivered_kwh_total']:.1f} / {status['energy_needed_kwh_total']:.1f} kWh")
    print(f"All ready: {status['all_ready_so_far']}")
    print(f"Peak tick total_load_kw: {max(t['total_load_kw'] for t in history):.1f}")

    assert controller.is_complete is True
    assert status["ticks_run"] == controller.end_slot - controller.start_slot
    assert status["all_ready_so_far"] is True, "MPC must still deliver every vehicle's full energy need by the end of the horizon"
    assert status["delivered_kwh_total"] > 0
    assert all(t["solver_status"] in {"optimal", "edf_fallback"} for t in history)
    print("All MPCController tests passed.")
