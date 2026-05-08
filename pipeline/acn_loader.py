from __future__ import annotations

import hashlib
import os
from datetime import date

import numpy as np
import pandas as pd


class ACNDataLoader:
    def load_sessions(self, filepath: str | None = None) -> pd.DataFrame:
        source = filepath or self._first_acn_csv()
        if source and os.path.exists(source):
            return pd.read_csv(source)

        rng = np.random.default_rng(20240315)
        n_sessions = 500
        morning = rng.uniform(8.0, 9.5, int(n_sessions * 0.58))
        evening = rng.uniform(17.0, 19.5, n_sessions - len(morning))
        arrival_hour = np.concatenate([morning, evening])
        rng.shuffle(arrival_hour)

        duration = self._lognormal_from_mean_std(rng, mean=3.2, std=2.1, size=n_sessions)
        energy = self._lognormal_from_mean_std(rng, mean=11.5, std=8.2, size=n_sessions)

        base_date = pd.Timestamp("2024-03-15")
        arrivals = [base_date + pd.Timedelta(hours=float(hour)) for hour in arrival_hour]
        departures = [
            arrival + pd.Timedelta(hours=float(hours))
            for arrival, hours in zip(arrivals, duration, strict=True)
        ]

        return pd.DataFrame(
            {
                "session_id": [f"ACN_SYN_{idx:05d}" for idx in range(n_sessions)],
                "arrival_time": arrivals,
                "departure_time": departures,
                "duration_hours": duration,
                "energy_kwh": energy,
            }
        )

    def adapt_to_corporate_depot(self, df: pd.DataFrame, n_vehicles: int = 500) -> pd.DataFrame:
        seed = int(hashlib.sha256(f"corporate-depot-{n_vehicles}-{len(df)}".encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        base_date = self._base_date_from_df(df)

        n_peak = int(round(n_vehicles * 0.70))
        n_tail = n_vehicles - n_peak
        arrival_hours = np.concatenate(
            [
                rng.uniform(20.0, 21.5, n_peak),
                rng.uniform(21.5, 22.0, n_tail),
            ]
        )
        rng.shuffle(arrival_hours)

        arrival_times = [base_date + pd.Timedelta(hours=float(hour)) for hour in arrival_hours]
        departure_deadline = base_date + pd.Timedelta(days=1, hours=7)
        current_soc_pct = rng.uniform(15.0, 25.0, n_vehicles)
        energy_needed = (0.80 - current_soc_pct / 100.0) * 40.0

        zones = np.repeat(["A", "B", "C", "D"], n_vehicles // 4)
        if len(zones) < n_vehicles:
            zones = np.concatenate([zones, np.array(["A", "B", "C", "D"])[: n_vehicles - len(zones)]])
        rng.shuffle(zones)

        return pd.DataFrame(
            {
                "session_id": [f"DEPOT_{idx:05d}" for idx in range(1, n_vehicles + 1)],
                "vehicle_id": [f"NEXON_{idx:04d}" for idx in range(1, n_vehicles + 1)],
                "arrival_time": arrival_times,
                "departure_deadline": [departure_deadline] * n_vehicles,
                "battery_capacity_kwh": 40.0,
                "current_soc_pct": np.round(current_soc_pct, 2),
                "target_soc_pct": 80,
                "energy_needed_kwh": np.round(energy_needed, 2),
                "charger_power_kw": 7.4,
                "vehicle_model": "Tata Nexon EV",
                "zone": zones,
            }
        )

    def get_corporate_depot_night(self, date: str | date | None = None) -> pd.DataFrame:
        target_date = pd.to_datetime(date or "2024-03-15").normalize()
        seed = int(hashlib.sha256(target_date.date().isoformat().encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        source = self.load_sessions().sample(n=500, replace=True, random_state=int(rng.integers(0, 1_000_000)))
        source = source.assign(arrival_time=target_date + pd.to_timedelta(source.index % 24, unit="h"))
        return self.adapt_to_corporate_depot(source.reset_index(drop=True), n_vehicles=500)

    @staticmethod
    def _first_acn_csv() -> str | None:
        acn_dir = os.path.join("data", "raw", "acn")
        if not os.path.isdir(acn_dir):
            return None
        for filename in sorted(os.listdir(acn_dir)):
            if filename.lower().endswith(".csv"):
                return os.path.join(acn_dir, filename)
        return None

    @staticmethod
    def _lognormal_from_mean_std(
        rng: np.random.Generator, mean: float, std: float, size: int
    ) -> np.ndarray:
        sigma = np.sqrt(np.log(1.0 + (std / mean) ** 2))
        mu = np.log(mean) - (sigma**2 / 2.0)
        return rng.lognormal(mean=mu, sigma=sigma, size=size)

    @staticmethod
    def _base_date_from_df(df: pd.DataFrame) -> pd.Timestamp:
        if "arrival_time" in df.columns and not df.empty:
            return pd.to_datetime(df["arrival_time"].iloc[0]).normalize()
        return pd.Timestamp("2024-03-15")


if __name__ == "__main__":
    loader = ACNDataLoader()
    sessions = loader.get_corporate_depot_night("2024-03-15")

    print(f"Generated sessions: {len(sessions)}")
    assert len(sessions) == 500, "Must generate 500 sessions"

    assert (sessions["vehicle_model"] == "Tata Nexon EV").all()
    print("- All vehicle_model == \"Tata Nexon EV\" OK")

    arrival_decimal_hour = sessions["arrival_time"].dt.hour + sessions["arrival_time"].dt.minute / 60.0
    assert ((arrival_decimal_hour >= 20.0) & (arrival_decimal_hour <= 22.0)).all()
    print("- All arrivals between 20:00-22:00 OK")

    deadline_hour = sessions["departure_deadline"].dt.hour
    deadline_minute = sessions["departure_deadline"].dt.minute
    assert ((deadline_hour == 7) & (deadline_minute == 0)).all()
    print("- All deadlines == 07:00 OK")

    energy = sessions["energy_needed_kwh"]
    assert energy.between(22.0, 26.0).all()
    print(f"- Energy range {energy.min():.2f}-{energy.max():.2f} kWh per vehicle OK")

    zone_counts = sessions["zone"].value_counts().sort_index()
    assert (zone_counts == 125).all()
    print("- 125 vehicles per zone OK")
