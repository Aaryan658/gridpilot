from __future__ import annotations

import hashlib
import os

import numpy as np
import pandas as pd


class IEXLoader:
    REAL_PEAK_DEMAND_MW = {
        "NR": 74000,
        "SR": 56000,
        "ER": 27000,
        "WR": 71000,
        "NER": 4500,
    }
    AT_C_LOSS_PCT = 17.2

    DIWALI_DATES = {"2022-10-24", "2023-11-12", "2024-11-01"}
    HOLI_DATES = {"2022-03-18", "2023-03-08", "2024-03-25"}

    def generate_region_demand(
        self, region: str, start_date: str, end_date: str
    ) -> pd.DataFrame:
        region = region.upper()
        peak_mw = self.REAL_PEAK_DEMAND_MW[region]
        timestamps = pd.date_range(start=start_date, end=end_date, freq="h")
        seed = int(hashlib.sha256(f"{region}-{start_date}-{end_date}".encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)

        rows = []
        for timestamp in timestamps:
            daily = self._daily_shape(timestamp.hour)
            weekly = 0.92 if timestamp.dayofweek >= 5 else 1.0
            seasonal = self._seasonal_multiplier(timestamp.month, region)
            event = self._event_multiplier(timestamp)
            noise = rng.normal(1.0, 0.008)

            demand_mw = peak_mw * daily * weekly * seasonal * event * noise
            demand_mw = min(demand_mw, peak_mw * 1.13)
            frequency = 50.0 - ((demand_mw / peak_mw) - 0.82) * 0.18 + rng.normal(0.0, 0.025)

            rows.append(
                {
                    "timestamp": timestamp,
                    "region": region,
                    "demand_mw": round(float(demand_mw), 2),
                    "frequency_hz": round(float(np.clip(frequency, 49.75, 50.25)), 3),
                }
            )

        return pd.DataFrame(rows)

    def load_or_generate(self, region: str, start: str, end: str) -> pd.DataFrame:
        cache_path = os.path.join("data", "raw", "iex", f"{region.upper()}_{start}_{end}.csv")
        if os.path.exists(cache_path):
            return pd.read_csv(cache_path, parse_dates=["timestamp"])

        df = self.generate_region_demand(region, start, end)
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        df.to_csv(cache_path, index=False)
        return df

    @staticmethod
    def _daily_shape(hour: int) -> float:
        morning_peak = np.exp(-0.5 * ((hour - 11.0) / 3.2) ** 2)
        evening_peak = np.exp(-0.5 * ((hour - 20.0) / 2.4) ** 2)
        night_valley = np.exp(-0.5 * ((hour - 3.0) / 3.0) ** 2)
        shape = 0.68 + 0.16 * morning_peak + 0.20 * evening_peak - 0.08 * night_valley
        return float(np.clip(shape, 0.55, 0.94))

    @staticmethod
    def _seasonal_multiplier(month: int, region: str) -> float:
        if month in {4, 5}:
            return 1.06
        if month in {6, 7, 8, 9}:
            return 1.02 if region in {"NR", "WR"} else 0.98
        if month in {12, 1}:
            return 1.03 if region == "NR" else 0.96
        return 1.0

    def _event_multiplier(self, timestamp: pd.Timestamp) -> float:
        day = timestamp.date().isoformat()
        multiplier = 1.0
        if day in self.DIWALI_DATES:
            multiplier *= 1.12
        if day in self.HOLI_DATES:
            multiplier *= 1.08
        if timestamp.month in {4, 5} and 18 <= timestamp.hour < 23:
            multiplier *= 1.06
        return multiplier


if __name__ == "__main__":
    loader = IEXLoader()
    demand = loader.generate_region_demand("NR", "2024-05-01", "2024-05-31")

    peak = demand["demand_mw"].max()
    print(f"NR peak demand: {peak:.0f} MW")
    assert 70000 <= peak <= 78000, "NR demand should peak around 74,000 MW"

    sample_week = demand.head(168)
    weekday_avg = sample_week[sample_week["timestamp"].dt.dayofweek < 5]["demand_mw"].mean()
    weekend_avg = sample_week[sample_week["timestamp"].dt.dayofweek >= 5]["demand_mw"].mean()
    print(f"Sample week weekday avg: {weekday_avg:.0f} MW")
    print(f"Sample week weekend avg: {weekend_avg:.0f} MW")
    assert weekend_avg < weekday_avg, "Weekend demand must dip"
