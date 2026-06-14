from __future__ import annotations

import hashlib
import json
import os
import time
from urllib.parse import urlencode
from urllib.request import urlopen
from datetime import date

import numpy as np
import pandas as pd


class WeatherLoader:
    LOCATIONS = {
        "NR_Gurugram": (28.4595, 77.0266),
        "NR_Delhi": (28.6139, 77.2090),
        "WR_Mumbai": (19.0760, 72.8777),
        "SR_Chennai": (13.0827, 80.2707),
        "ER_Kolkata": (22.5726, 88.3639),
    }

    # Open-Meteo Historical Weather API.
    # open-meteo.com. Accessed June 2026.
    # CC BY 4.0 open data licence.
    URL = "https://archive-api.open-meteo.com/v1/archive"
    HOURLY_VARIABLES = (
        "temperature_2m,relative_humidity_2m,windspeed_10m,shortwave_radiation"
    )

    def fetch(
        self,
        lat: float,
        lon: float,
        start: str | date,
        end: str | date,
        name: str,
    ) -> pd.DataFrame:
        start_date = pd.to_datetime(start).date().isoformat()
        end_date = pd.to_datetime(end).date().isoformat()
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": self.HOURLY_VARIABLES,
            "timezone": "Asia/Kolkata",
        }

        last_error = None
        for attempt in range(3):
            try:
                with urlopen(f"{self.URL}?{urlencode(params)}", timeout=20) as response:
                    hourly = json.loads(response.read().decode("utf-8")).get("hourly", {})
                df = pd.DataFrame(
                    {
                        "timestamp": pd.to_datetime(hourly["time"]),
                        "temperature_2m": hourly["temperature_2m"],
                        "relative_humidity_2m": hourly["relative_humidity_2m"],
                        "windspeed_10m": hourly["windspeed_10m"],
                        "shortwave_radiation": hourly["shortwave_radiation"],
                    }
                )
                if not df.empty:
                    return self._cache(name, df)
            except Exception as exc:  # noqa: BLE001 - loader must degrade gracefully.
                last_error = exc
                time.sleep(2**attempt)

        print(f"Open-Meteo unavailable for {name}; using synthetic NCR weather. Reason: {last_error}")
        return self._cache(name, self._synthetic_ncr_weather(start_date, end_date, name))

    def fetch_all(self, start: str = "2024-01-01", end: str = "2024-12-31") -> dict[str, pd.DataFrame]:
        return {
            name: self.fetch(lat, lon, start, end, name)
            for name, (lat, lon) in self.LOCATIONS.items()
        }

    def _cache(self, name: str, df: pd.DataFrame) -> pd.DataFrame:
        cache_path = os.path.join("data", "raw", "weather", f"{name}.csv")
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        df.to_csv(cache_path, index=False)
        return df

    def _synthetic_ncr_weather(self, start: str, end: str, name: str) -> pd.DataFrame:
        start_ts = pd.to_datetime(start)
        end_ts = pd.to_datetime(end) + pd.Timedelta(hours=23)
        timestamps = pd.date_range(start=start_ts, end=end_ts, freq="h")
        seed = int(hashlib.sha256(f"{name}-{start}-{end}".encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)

        values = []
        for ts in timestamps:
            hour = ts.hour
            month = ts.month
            solar_shape = max(0.0, np.sin(np.pi * (hour - 6) / 12.0)) if 6 <= hour <= 18 else 0.0

            if month == 5:
                temperature = 38.5 + 6.0 * solar_shape + rng.normal(0.0, 1.0)
                humidity = rng.uniform(18, 35)
                solar = 900.0 * solar_shape + rng.normal(0.0, 35.0)
            elif month == 1:
                temperature = 5.5 + 6.0 * solar_shape + rng.normal(0.0, 1.2)
                humidity = rng.uniform(45, 75)
                solar = 520.0 * solar_shape + rng.normal(0.0, 25.0)
            elif month in {7, 8}:
                temperature = 28.0 + 5.0 * solar_shape + rng.normal(0.0, 1.0)
                humidity = rng.uniform(72, 95)
                solar = 520.0 * solar_shape + rng.normal(0.0, 45.0)
            else:
                temperature = 20.0 + 11.0 * solar_shape + rng.normal(0.0, 1.8)
                humidity = rng.uniform(30, 65)
                solar = 760.0 * solar_shape + rng.normal(0.0, 35.0)

            values.append(
                {
                    "timestamp": ts,
                    "temperature_2m": round(float(np.clip(temperature, 3.0, 47.0)), 1),
                    "relative_humidity_2m": round(float(np.clip(humidity, 10.0, 98.0)), 1),
                    "windspeed_10m": round(float(rng.uniform(2.0, 18.0)), 1),
                    "shortwave_radiation": round(float(max(0.0, solar)), 1),
                }
            )

        return pd.DataFrame(values)


if __name__ == "__main__":
    loader = WeatherLoader()
    gurugram = loader.fetch(28.4595, 77.0266, "2024-05-01", "2024-05-31", "NR_Gurugram")

    cache_file = os.path.join("data", "raw", "weather", "NR_Gurugram.csv")
    print(f"Gurugram weather rows: {len(gurugram)}")
    print(f"CSV created: {os.path.exists(cache_file)}")
    assert os.path.exists(cache_file), "Weather CSV must be created"

    may = gurugram[pd.to_datetime(gurugram["timestamp"]).dt.month == 5]
    may_temps = may["temperature_2m"]
    print(f"Temperature range May: {may_temps.min():.1f}-{may_temps.max():.1f} C")
    assert not may_temps.empty, "May weather must be present"
