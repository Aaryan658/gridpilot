from __future__ import annotations

import hashlib
from datetime import date

import numpy as np
import pandas as pd


class DVVNLLoader:
    # DVVNL HT-2 Tariff Schedule FY 2025-26
    # UPERC Order November 2025.
    # Demand charge ₹350/kVA/month unchanged for 6th consecutive year.
    TARIFF = {
        "energy_charge_per_kwh": 6.50,
        "demand_charge_per_kva_month": 350,
        "peak_penalty_per_kva_month": 500,
        "tod_peak_surcharge_pct": 20,
        "tod_offpeak_discount_pct": 15,
        "penalty_trigger_kw": 4500,
        "sanctioned_kva": 5000,
    }

    POWER_FACTOR = 0.9
    TRANSFORMER_LIMIT_KW = 4000.0

    def generate_depot_baseline(self, date: str | date | None = None) -> pd.DataFrame:
        target_date = pd.to_datetime(date or "2024-03-15").normalize()
        seed = int(hashlib.sha256(target_date.date().isoformat().encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        timestamps = pd.date_range(start=target_date, periods=24, freq="h")

        rows = []
        for timestamp in timestamps:
            low, high = self._range_for_hour(timestamp.hour)
            load_kw = rng.uniform(low / 1.05, high / 0.95) * rng.uniform(0.95, 1.05)
            load_kw = float(np.clip(load_kw, low, high))

            if timestamp.dayofweek >= 5:
                load_kw *= 0.70

            load_kva = load_kw / self.POWER_FACTOR
            rows.append(
                {
                    "timestamp": timestamp,
                    "load_kw": round(load_kw, 2),
                    "load_kva": round(load_kva, 2),
                    "transformer_utilization_pct": round(
                        (load_kw / self.TRANSFORMER_LIMIT_KW) * 100.0, 2
                    ),
                }
            )

        return pd.DataFrame(rows)

    def calculate_daily_cost(self, load_profile: pd.DataFrame) -> dict:
        profile = load_profile.copy()
        profile["timestamp"] = pd.to_datetime(profile["timestamp"])
        if len(profile) > 1:
            interval_hours = (
                profile["timestamp"].sort_values().diff().dt.total_seconds().dropna().median() / 3600.0
            )
        else:
            interval_hours = 1.0

        energy_cost = 0.0
        for row in profile.itertuples(index=False):
            rate = self.TARIFF["energy_charge_per_kwh"]
            hour = row.timestamp.hour
            if 18 <= hour < 22:
                rate *= 1.0 + self.TARIFF["tod_peak_surcharge_pct"] / 100.0
            elif hour >= 22 or hour < 6:
                rate *= 1.0 - self.TARIFF["tod_offpeak_discount_pct"] / 100.0
            energy_cost += row.load_kw * interval_hours * rate

        max_kva = float(profile["load_kva"].max())
        max_kw = float(profile["load_kw"].max())
        demand_charge = max_kva * self.TARIFF["demand_charge_per_kva_month"] / 30.0
        peak_penalty = 0.0
        if max_kw > self.TARIFF["penalty_trigger_kw"]:
            peak_penalty = max_kva * self.TARIFF["peak_penalty_per_kva_month"] / 30.0

        return {
            "energy_cost_inr": float(round(energy_cost, 2)),
            "demand_charge_inr": float(round(demand_charge, 2)),
            "peak_penalty_inr": float(round(peak_penalty, 2)),
            "total_inr": float(round(energy_cost + demand_charge + peak_penalty, 2)),
        }

    def calculate_monthly_saving(self, unmanaged_peak_kw: float, managed_peak_kw: float) -> float:
        reduction_kva = max(0.0, unmanaged_peak_kw - managed_peak_kw) / self.POWER_FACTOR
        return round(reduction_kva * self.TARIFF["demand_charge_per_kva_month"], 2)

    @staticmethod
    def _range_for_hour(hour: int) -> tuple[float, float]:
        if 0 <= hour < 2:
            return 400.0, 700.0
        if 2 <= hour < 6:
            return 300.0, 500.0
        if 6 <= hour < 10:
            return 600.0, 900.0
        if 10 <= hour < 18:
            return 800.0, 1200.0
        if 18 <= hour < 22:
            return 1000.0, 1400.0
        return 400.0, 700.0


if __name__ == "__main__":
    loader = DVVNLLoader()
    baseline = loader.generate_depot_baseline("2024-03-15")

    print(f"Generated baseline rows: {len(baseline)}")
    assert len(baseline) == 24, "Must generate a 24h hourly baseline"

    peak_window = baseline[
        (baseline["timestamp"].dt.hour >= 18) & (baseline["timestamp"].dt.hour < 22)
    ]
    peak_min = peak_window["load_kw"].min()
    peak_max = peak_window["load_kw"].max()
    print(f"Peak 18:00-22:00 range: {peak_min:.1f}-{peak_max:.1f} kW")
    assert peak_min >= 1000.0 and peak_max <= 1400.0
    print("- Peak 18:00-22:00 is 1000-1400 kW OK")

    cost = loader.calculate_daily_cost(baseline)
    print(f"Daily cost for sample day: {cost}")
