from __future__ import annotations

import os
import sys
from datetime import date

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from pipeline.cea_loader import CEALoader


class CarbonEngine:
    KG_CO2_PER_TREE_YEAR = 21.77
    KG_CO2_PER_CAR_DAY = 3.65

    def __init__(self) -> None:
        self.cea = CEALoader()

    def get_intensity(self, state: str, timestamp) -> float:
        ts = pd.Timestamp(timestamp)
        profile = self.cea.get_hourly_carbon_profile(state.title(), ts.date().isoformat())
        hour_row = profile[profile["timestamp"].dt.hour == ts.hour].iloc[0]
        return float(hour_row["carbon_intensity_kg_co2_kwh"])

    def get_forecast_48h(self, state: str) -> pd.DataFrame:
        start = pd.Timestamp.now(tz=None).normalize()
        profile = self.cea.get_hourly_carbon_profile(state.title(), start.date().isoformat())
        return profile.rename(
            columns={"carbon_intensity_kg_co2_kwh": "carbon_intensity"}
        )[
            [
                "timestamp",
                "carbon_intensity",
                "renewable_pct",
                "signal",
                "ev_action",
                "recommended_ev_power_kw",
            ]
        ]

    def get_cleanest_windows(self, state: str, n: int = 3) -> list[tuple[pd.Timestamp, pd.Timestamp, float, str]]:
        forecast = self.get_forecast_48h(state).sort_values("timestamp").reset_index(drop=True)
        candidates = forecast[forecast["signal"] == "CLEAN"].copy()
        if candidates.empty:
            candidates = forecast.nsmallest(max(n * 3, 3), "carbon_intensity").copy()

        groups: list[tuple[pd.Timestamp, pd.Timestamp, float, str]] = []
        start = None
        previous = None
        intensities: list[float] = []

        for row in candidates.itertuples(index=False):
            ts = pd.Timestamp(row.timestamp)
            if start is None:
                start = previous = ts
                intensities = [float(row.carbon_intensity)]
                continue

            if ts == previous + pd.Timedelta(hours=1):
                previous = ts
                intensities.append(float(row.carbon_intensity))
            else:
                groups.append((start, previous + pd.Timedelta(hours=1), round(float(np.mean(intensities)), 3), "CLEAN"))
                start = previous = ts
                intensities = [float(row.carbon_intensity)]

        if start is not None and previous is not None:
            groups.append((start, previous + pd.Timedelta(hours=1), round(float(np.mean(intensities)), 3), "CLEAN"))

        groups.sort(key=lambda item: (item[2], item[0]))
        return groups[:n]

    def compute_schedule_carbon(self, schedule_df: pd.DataFrame, state: str) -> float:
        if schedule_df.empty:
            return 0.0

        schedule = schedule_df.copy()
        schedule["timestamp"] = pd.to_datetime(schedule["timestamp"])
        if "energy_kwh" not in schedule.columns:
            if "duration_hours" in schedule.columns:
                schedule["energy_kwh"] = schedule["power_kw"].astype(float) * schedule["duration_hours"].astype(float)
            else:
                if len(schedule) > 1:
                    interval_hours = (
                        schedule["timestamp"].sort_values().diff().dt.total_seconds().dropna().median() / 3600.0
                    )
                else:
                    interval_hours = 1.0
                schedule["energy_kwh"] = schedule["power_kw"].astype(float) * float(interval_hours)

        total = 0.0
        for row in schedule.itertuples(index=False):
            intensity = self.get_intensity(state, row.timestamp)
            total += float(row.energy_kwh) * intensity
        return round(total, 3)

    def compute_savings_vs_unmanaged(
        self, managed_schedule: pd.DataFrame, unmanaged_schedule: pd.DataFrame, state: str
    ) -> dict:
        managed_co2 = self.compute_schedule_carbon(managed_schedule, state)
        unmanaged_co2 = self.compute_schedule_carbon(unmanaged_schedule, state)
        saved = round(unmanaged_co2 - managed_co2, 3)
        pct = round((saved / unmanaged_co2) * 100.0, 2) if unmanaged_co2 else 0.0
        return {
            "co2_saved_kg": saved,
            "pct_reduction": pct,
            "equivalent_trees_planted": round(saved / self.KG_CO2_PER_TREE_YEAR, 2),
            "equivalent_cars_off_road_days": round(saved / self.KG_CO2_PER_CAR_DAY, 2),
        }


if __name__ == "__main__":
    engine = CarbonEngine()

    intensity = engine.get_intensity("Haryana", "2024-03-15 03:00:00")
    print(f"Haryana intensity at 03:00: {intensity:.3f}")
    assert 0.60 <= intensity <= 0.66

    windows = engine.get_cleanest_windows("Haryana", n=3)
    print("Cleanest windows:")
    for start, end, avg, label in windows:
        print(f"  {start:%H:%M}-{end:%H:%M} avg={avg:.3f} {label}")
    assert len(windows) > 0

    clean_schedule = pd.DataFrame(
        {"timestamp": pd.date_range("2024-03-15 02:00", periods=3, freq="h"), "power_kw": [1000, 1000, 1000]}
    )
    dirty_schedule = pd.DataFrame(
        {"timestamp": pd.date_range("2024-03-15 18:00", periods=3, freq="h"), "power_kw": [1000, 1000, 1000]}
    )
    savings = engine.compute_savings_vs_unmanaged(clean_schedule, dirty_schedule, "Haryana")
    print(f"Savings between dirty/clean schedule: {savings}")
    assert savings["co2_saved_kg"] > 0
