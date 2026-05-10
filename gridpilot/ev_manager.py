from __future__ import annotations

import os
import sys

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from pipeline.acn_loader import ACNDataLoader


class EVRequestManager:
    FLEET_SIZE = 500
    OPERATOR_CONTEXT = (
        "Corporate EV Fleet Depot, Gurugram (modeled on Lithium Urban Technologies "
        "fleet profile)"
    )

    def __init__(self) -> None:
        self.loader = ACNDataLoader()
        self._active_requests: list[dict] = []

    def generate_session(self, date: str | None = None, n: int = 500) -> pd.DataFrame:
        from pipeline.acn_loader import ACNDataLoader
        loader = ACNDataLoader()
        sessions = loader.get_corporate_depot_night(date=date, n_vehicles=n)

        records = sessions.to_dict("records")
        for session in records:
            session["charger_kw"] = session.get(
                "charger_power_kw",
                session.get("charger_kw", 7.4)
            )

        sessions["charger_kw"] = [r["charger_kw"] for r in records]
        self._active_requests = records
        return sessions

    def get_fleet_summary(self, sessions_df: pd.DataFrame) -> dict:
        sessions = sessions_df.copy()
        sessions["arrival_time"] = pd.to_datetime(sessions["arrival_time"])
        sessions["departure_deadline"] = pd.to_datetime(sessions["departure_deadline"])

        zone_counts = sessions["zone"].value_counts().sort_index()
        zone_breakdown = {zone: int(zone_counts.get(zone, 0)) for zone in ["A", "B", "C", "D"]}
        deadline_times = sessions["departure_deadline"].dt.strftime("%H:%M").unique()

        return {
            "total_evs": int(len(sessions)),
            "vehicle_model": sessions["vehicle_model"].iloc[0]
            if sessions["vehicle_model"].nunique() == 1
            else "Mixed",
            "total_energy_needed_kwh": round(float(sessions["energy_needed_kwh"].sum()), 2),
            "avg_energy_per_vehicle_kwh": round(float(sessions["energy_needed_kwh"].mean()), 2),
            "earliest_arrival": sessions["arrival_time"].min().strftime("%H:%M"),
            "latest_arrival": sessions["arrival_time"].max().strftime("%H:%M"),
            "all_deadline": deadline_times[0] if len(deadline_times) == 1 else "Mixed",
            "zone_breakdown": zone_breakdown,
            "avg_initial_soc_pct": round(float(sessions["current_soc_pct"].mean()), 2),
            "operator_context": self.OPERATOR_CONTEXT,
        }

    def get_active_requests(self) -> list:
        return list(self._active_requests)


if __name__ == "__main__":
    manager = EVRequestManager()
    sessions = manager.generate_session(date="2024-03-15", n=500)
    summary = manager.get_fleet_summary(sessions)

    print("Generated 500 sessions")
    print("Fleet summary:")
    for key, value in summary.items():
        print(f"  {key}: {value}")

    arrivals = pd.to_datetime(sessions["arrival_time"])
    deadlines = pd.to_datetime(sessions["departure_deadline"])
    arrival_hours = arrivals.dt.hour + arrivals.dt.minute / 60.0

    assert summary["total_evs"] == 500
    assert "Tata Nexon EV" in sessions["vehicle_model"].values
    assert ((arrival_hours >= 20.0) & (arrival_hours <= 22.0)).all()
    assert (deadlines.dt.strftime("%H:%M") == "07:00").all()
    assert summary["all_deadline"] == "07:00"
    assert summary["zone_breakdown"] == {"A": 125, "B": 125, "C": 125, "D": 125}
    assert len(manager.get_active_requests()) == 500
    print("All EVRequestManager tests passed.")
