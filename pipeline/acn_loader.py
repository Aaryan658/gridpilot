from __future__ import annotations

import os

import numpy as np
import pandas as pd


INDIA_CORPORATE_FLEET_MIX = [
    {
        "model": "Tata Nexon EV",
        "count": 135,
        "battery_kwh": 30.2,
        "charger_kw": 7.4,
        "range_km": 312,
        "source": "Vahan CY2025 — 27% share"
    },
    {
        "model": "Tata Tiago EV",
        "count": 70,
        "battery_kwh": 19.2,
        "charger_kw": 3.3,
        "range_km": 250,
        "source": "Vahan CY2025 — 14% share"
    },
    {
        "model": "MG Windsor EV",
        "count": 90,
        "battery_kwh": 38.0,
        "charger_kw": 7.4,
        "range_km": 331,
        "source": "JSW MG 26% market share CY2025"
    },
    {
        "model": "Mahindra BE6",
        "count": 85,
        "battery_kwh": 59.0,
        "charger_kw": 7.2,
        "range_km": 535,
        "source": "Mahindra BE6 official specs 2024"
    },
    {
        "model": "Tata Curvv EV",
        "count": 80,
        "battery_kwh": 55.0,
        "charger_kw": 7.2,
        "range_km": 502,
        "source": "Tata Curvv EV official specs 2024"
    },
    {
        "model": "MG ZS EV",
        "count": 40,
        "battery_kwh": 50.3,
        "charger_kw": 7.4,
        "range_km": 461,
        "source": "MG ZS EV fleet deployments"
    },
]


class ACNDataLoader:

    def load_real_sessions(self):
        import json
        for fname in ["caltech_sessions.json",
                      "jpl_sessions.json"]:
            fpath = f"data/raw/acn/{fname}"
            if os.path.exists(fpath):
                with open(fpath) as f:
                    data = json.load(f)
                sessions = data.get(
                    "_items",
                    data if isinstance(data, list)
                    else []
                )
                df = pd.DataFrame(sessions)
                print(f"[REAL] {len(df)} ACN sessions")
                return df
        return None

    def extract_behavioral_stats(self, df):
        df["conn_dt"] = pd.to_datetime(
            df.get("connectionTime", ""),
            utc=True, errors="coerce"
        )
        df = df.dropna(subset=["conn_dt"])
        df["hour_of_arrival"] = (
            df["conn_dt"].dt.hour +
            df["conn_dt"].dt.minute / 60
        )
        df["energy_kwh"] = pd.to_numeric(
            df.get("kWhDelivered",
                   df.get("energy", 0)),
            errors="coerce"
        ).fillna(0)
        df = df[
            (df["energy_kwh"] > 0.5) &
            (df["energy_kwh"] < 100)
        ]
        return {
            "arrival_std_h": float(
                df["hour_of_arrival"].std()
            ),
            "n_sessions": len(df),
            "source": "ACN-Data real behavioral"
        }

    def get_corporate_depot_night(
        self, date=None, n_vehicles=500
    ):
        real_df = self.load_real_sessions()
        stats = None
        if real_df is not None and len(real_df) > 0:
            stats = self.extract_behavioral_stats(
                real_df
            )

        arrival_std = (
            min(stats["arrival_std_h"], 0.6)
            if stats else 0.55
        )

        if date:
            seed = int(
                pd.Timestamp(date).timestamp()
            ) % 10000
            np.random.seed(seed)

        arrivals_raw = np.random.normal(
            loc=21.0,
            scale=arrival_std,
            size=n_vehicles
        )
        arrivals_h = np.clip(
            arrivals_raw, 20.0, 22.0
        )
        arrival_times = []
        for h in sorted(arrivals_h):
            hour = int(h)
            minute = int((h % 1) * 60)
            arrival_times.append(
                f"{hour:02d}:{minute:02d}"
            )

        vehicles = []
        vehicle_num = 1

        for spec in INDIA_CORPORATE_FLEET_MIX:
            count = min(
                spec["count"],
                n_vehicles - len(vehicles)
            )
            for i in range(count):
                if spec["range_km"] < 280:
                    soc_min, soc_max = 0.10, 0.20
                elif spec["range_km"] < 350:
                    soc_min, soc_max = 0.15, 0.25
                else:
                    soc_min, soc_max = 0.20, 0.35

                initial_soc = np.random.uniform(
                    soc_min, soc_max
                )
                energy_needed = float(np.clip(
                    (0.80 - initial_soc) *
                    spec["battery_kwh"] *
                    (1 + np.random.normal(0, 0.04)),
                    spec["battery_kwh"] * 0.15,
                    spec["battery_kwh"] * 0.72
                ))

                zone = ["A", "B", "C", "D"][
                    (vehicle_num - 1) % 4
                ]

                vehicles.append({
                    "session_id":
                        f"GP_{vehicle_num:04d}",
                    "vehicle_id": (
                        spec["model"]
                        .replace(" ", "_") +
                        f"_{vehicle_num:04d}"
                    ),
                    "vehicle_model":
                        spec["model"],
                    "battery_kwh":
                        spec["battery_kwh"],
                    "charger_kw":
                        spec["charger_kw"],
                    "charger_power_kw":
                        spec["charger_kw"],
                    "range_km": spec["range_km"],
                    "arrival_time":
                        arrival_times[vehicle_num - 1],
                    "departure_deadline": "07:00",
                    "current_soc_pct": round(
                        initial_soc * 100, 1
                    ),
                    "target_soc_pct": 80.0,
                    "energy_needed_kwh": round(
                        energy_needed, 1
                    ),
                    "zone": zone,
                    "priority": "NORMAL",
                    "data_source":
                        "ACN-Data + Vahan CY2025",
                    "market_source":
                        spec["source"],
                })
                vehicle_num += 1

        df = pd.DataFrame(vehicles[:n_vehicles])

        print(f"\nFleet mix generated:")
        print(df["vehicle_model"].value_counts()
              .to_string())
        print(f"Arrivals: {df['arrival_time'].min()}"
              f" to {df['arrival_time'].max()}")
        print(f"Energy: "
              f"{df['energy_needed_kwh'].mean():.1f}"
              f" ± "
              f"{df['energy_needed_kwh'].std():.1f}"
              f" kWh avg")

        return df

    def get_fleet_summary(self, df):
        return {
            "total_evs": len(df),
            "vehicle_mix":
                df["vehicle_model"]
                .value_counts().to_dict(),
            "charger_mix":
                df["charger_kw"]
                .value_counts().to_dict(),
            "avg_battery_kwh": round(
                float(df["battery_kwh"].mean()), 1
            ),
            "avg_energy_needed_kwh": round(
                float(df["energy_needed_kwh"].mean()),
                1
            ),
            "total_energy_needed_kwh": round(
                float(df["energy_needed_kwh"].sum()),
                1
            ),
            "earliest_arrival":
                df["arrival_time"].min(),
            "latest_arrival":
                df["arrival_time"].max(),
            "all_deadline": "07:00",
            "zone_breakdown":
                df["zone"].value_counts().to_dict(),
            "data_source":
                "Vahan CY2025 + ACN behavioral",
        }
