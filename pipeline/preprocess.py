from __future__ import annotations

import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.cea_loader import CEALoader
from pipeline.dvvnl_loader import DVVNLLoader
from pipeline.iex_loader import IEXLoader
from pipeline.weather_loader import WeatherLoader


class Preprocessor:
    REGION_WEATHER = {
        "NR": "NR_Delhi",
        "SR": "SR_Chennai",
        "ER": "ER_Kolkata",
        "WR": "WR_Mumbai",
        "NER": "ER_Kolkata",
    }
    REGION_STATE = {
        "NR": "Haryana",
        "SR": "Tamil Nadu",
        "ER": "West Bengal",
        "WR": "Maharashtra",
        "NER": "Assam",
    }
    HOLIDAYS_2022_2024 = {
        "2022-01-26",
        "2022-03-18",
        "2022-08-15",
        "2022-10-02",
        "2022-10-24",
        "2023-01-26",
        "2023-03-08",
        "2023-08-15",
        "2023-10-02",
        "2023-11-12",
        "2024-01-26",
        "2024-03-25",
        "2024-08-15",
        "2024-10-02",
        "2024-11-01",
    }

    def __init__(self) -> None:
        self.cea = CEALoader()
        self.weather = WeatherLoader()
        self.iex = IEXLoader()
        self.dvvnl = DVVNLLoader()

    def merge_region_data(self, region: str) -> pd.DataFrame:
        region = region.upper()
        start, end = "2024-01-01", "2024-12-31"
        weather_name = self.REGION_WEATHER[region]
        lat, lon = self.weather.LOCATIONS[weather_name]

        demand = self.iex.load_or_generate(region, start, end)
        weather = self.weather.fetch(lat, lon, start, end, weather_name)
        carbon = self._carbon_for_range(self.REGION_STATE[region], start, end)

        merged = demand.merge(carbon, on="timestamp", how="inner")
        merged = merged.merge(weather, on="timestamp", how="inner")
        merged = self._add_common_features(merged)
        merged = self._rename_weather_and_carbon(merged)

        merged["demand_lag_1h"] = merged["demand_mw"].shift(1)
        merged["demand_lag_24h"] = merged["demand_mw"].shift(24)
        merged["demand_lag_168h"] = merged["demand_mw"].shift(168)
        merged["rolling_mean_24h"] = merged["demand_mw"].rolling(window=24, min_periods=1).mean()
        merged["rolling_std_24h"] = merged["demand_mw"].rolling(window=24, min_periods=2).std()
        merged = merged.ffill().bfill()

        save_path = os.path.join("data", "processed", f"grid_data_{region}.csv")
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        merged.to_csv(save_path, index=False)
        return merged

    def build_depot_dataset(self) -> pd.DataFrame:
        date = "2024-03-15"
        baseline = self.dvvnl.generate_depot_baseline(date)
        weather = self.weather.fetch(28.4595, 77.0266, date, date, "NR_Gurugram")
        carbon = self.cea.get_hourly_carbon_profile("Haryana", date).head(24)

        merged = baseline.merge(carbon, on="timestamp", how="inner")
        merged = merged.merge(weather, on="timestamp", how="inner")
        merged = self._add_common_features(merged)
        merged = self._rename_weather_and_carbon(merged)

        hour = merged["timestamp"].dt.hour
        merged["is_night_charging_window"] = (hour >= 22) | (hour < 7)
        merged["is_clean_carbon_window"] = (hour >= 2) & (hour < 5)
        merged["is_peak_tariff_window"] = (hour >= 18) & (hour < 22)

        solar_shape = np.maximum(0.0, np.sin(np.pi * (hour - 6) / 12.0))
        merged["solar_available_kw"] = np.where((hour >= 6) & (hour <= 18), solar_shape * 500.0, 0.0)
        merged["solar_available_kw"] = merged["solar_available_kw"].round(2)

        save_path = os.path.join("data", "processed", "depot_baseline.csv")
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        merged.to_csv(save_path, index=False)
        return merged

    def run_all(self) -> None:
        for region in ["NR", "SR", "ER", "WR", "NER"]:
            frame = self.merge_region_data(region)
            print(f"Saved grid_data_{region}.csv ({len(frame)} rows)")
        depot = self.build_depot_dataset()
        print(f"Saved depot_baseline.csv ({len(depot)} rows)")
        print("Preprocessing complete. Files saved.")

    def _carbon_for_range(self, state: str, start: str, end: str) -> pd.DataFrame:
        days = pd.date_range(start=start, end=end, freq="D")
        frames = [
            self.cea.get_hourly_carbon_profile(state, day).head(24)
            for day in days
        ]
        return pd.concat(frames, ignore_index=True)

    def _add_common_features(self, df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()
        out["timestamp"] = pd.to_datetime(out["timestamp"])
        out["hour_of_day"] = out["timestamp"].dt.hour
        out["day_of_week"] = out["timestamp"].dt.dayofweek
        out["month"] = out["timestamp"].dt.month
        out["is_weekend"] = out["day_of_week"] >= 5
        out["is_holiday"] = out["timestamp"].dt.date.astype(str).isin(self.HOLIDAYS_2022_2024)
        out["season"] = out["month"].map(self._season_for_month)
        return out

    @staticmethod
    def _rename_weather_and_carbon(df: pd.DataFrame) -> pd.DataFrame:
        out = df.rename(
            columns={
                "carbon_intensity_kg_co2_kwh": "carbon_intensity",
                "temperature_2m": "temperature_c",
                "relative_humidity_2m": "humidity_pct",
                "shortwave_radiation": "solar_radiation",
                "windspeed_10m": "wind_speed",
            }
        )
        return out

    @staticmethod
    def _season_for_month(month: int) -> str:
        if month in {3, 4, 5, 6}:
            return "summer"
        if month in {7, 8, 9}:
            return "monsoon"
        if month in {12, 1, 2}:
            return "winter"
        return "post_monsoon"


if __name__ == "__main__":
    preprocessor = Preprocessor()
    preprocessor.run_all()

    expected_files = [
        os.path.join("data", "processed", f"grid_data_{region}.csv")
        for region in ["NR", "SR", "ER", "WR", "NER"]
    ]
    expected_files.append(os.path.join("data", "processed", "depot_baseline.csv"))
    for path in expected_files:
        assert os.path.exists(path), f"Missing processed file: {path}"

    depot = pd.read_csv(os.path.join("data", "processed", "depot_baseline.csv"))
    required_columns = {
        "timestamp",
        "load_kw",
        "load_kva",
        "transformer_utilization_pct",
        "carbon_intensity",
        "renewable_pct",
        "temperature_c",
        "humidity_pct",
        "solar_radiation",
        "wind_speed",
        "is_night_charging_window",
        "is_clean_carbon_window",
        "is_peak_tariff_window",
        "solar_available_kw",
    }
    missing = required_columns - set(depot.columns)
    assert not missing, f"depot_baseline.csv missing columns: {sorted(missing)}"
    print("Verified all processed CSVs and depot_baseline.csv columns.")
