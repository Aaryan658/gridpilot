from __future__ import annotations

import os

import numpy as np
import pandas as pd


VEHICLE_SPECS = {
    "Tata Nexon EV": {"battery": 30.2, "charger": 7.4},
    "Tata Tiago EV": {"battery": 19.2, "charger": 3.3},
    "MG Windsor EV": {"battery": 38.0, "charger": 7.4},
    "Mahindra BE6": {"battery": 59.0, "charger": 7.2},
    "Tata Curvv EV": {"battery": 55.0, "charger": 7.2},
    "MG ZS EV": {"battery": 50.3, "charger": 7.4},
}

FLEET_MIX = {
    "Tata Nexon EV": 0.27,
    "Tata Tiago EV": 0.14,
    "MG Windsor EV": 0.18,
    "Mahindra BE6": 0.17,
    "Tata Curvv EV": 0.16,
    "MG ZS EV": 0.08,
}

VEHICLE_RANGES = {
    "Tata Nexon EV": 312,
    "Tata Tiago EV": 250,
    "MG Windsor EV": 331,
    "Mahindra BE6": 535,
    "Tata Curvv EV": 502,
    "MG ZS EV": 461,
}


# ACN-Data (Caltech, Lee et al. 2019, sessions 2018-2020).
# Used ONLY for arrival time distribution shape within 20:00-22:00 corporate depot return window.
# Vehicle specs (battery, charger) from Vahan CY2025.
# Energy per session from first-principles fleet calculation.
class ACNDataLoader:

    def load_sessions(self):
        df = self.load_real_sessions()
        if df is not None:
            return df
        df = self.get_corporate_depot_night()
        df["session_id"] = "SYN_" + df["session_id"]
        return df

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
        self, date=None, n_vehicles=500, soc_override_pct=None, target_soc_pct=80.0
    ):
        if isinstance(date, int):
            n_vehicles = date
            date = None

        real_df = self.load_real_sessions()

        if date:
            seed = int(
                pd.Timestamp(date).timestamp()
            ) % 10000
            np.random.seed(seed)

        if real_df is not None and not real_df.empty:
            conn_dt = pd.to_datetime(
                real_df.get("connectionTime", real_df.get("connection_time", "")),
                utc=True, errors="coerce"
            )
            conn_dt = conn_dt.dropna()
            if not conn_dt.empty:
                hours = conn_dt.dt.hour + conn_dt.dt.minute / 60.0
                h_min, h_max = hours.min(), hours.max()
                if h_max > h_min:
                    normalized = 20.0 + 2.0 * (hours - h_min) / (h_max - h_min)
                else:
                    normalized = pd.Series([21.0] * len(hours))
                arrivals_h = np.random.choice(normalized, size=n_vehicles, replace=True)
            else:
                arrivals_raw = np.random.normal(loc=21.0, scale=0.55, size=n_vehicles)
                arrivals_h = np.clip(arrivals_raw, 20.0, 22.0)
        else:
            arrivals_raw = np.random.normal(
                loc=21.0,
                scale=0.55,
                size=n_vehicles
            )
            arrivals_h = np.clip(
                arrivals_raw, 20.0, 22.0
            )

        arrivals_h = sorted(arrivals_h)
        arrival_times = []
        for h in arrivals_h:
            hour = int(h)
            minute = int((h % 1) * 60)
            arrival_times.append(
                f"{hour:02d}:{minute:02d}"
            )

        vehicles = []
        vehicle_num = 1

        # Allocate vehicles according to FLEET_MIX proportions
        counts = {}
        allocated = 0
        models = list(FLEET_MIX.keys())
        for model in models[:-1]:
            count = int(round(FLEET_MIX[model] * n_vehicles))
            counts[model] = count
            allocated += count
        counts[models[-1]] = max(0, n_vehicles - allocated)

        for model in models:
            count = counts[model]
            specs = VEHICLE_SPECS[model]
            battery = specs["battery"]
            charger = specs["charger"]
            r_km = VEHICLE_RANGES[model]

            for _ in range(count):
                vehicle_id = model.replace(" ", "_") + f"_{vehicle_num:04d}"

                if isinstance(soc_override_pct, dict):
                    override = soc_override_pct.get(vehicle_id)
                else:
                    override = soc_override_pct

                if override is not None:
                    initial_soc = max(0.0, min(1.0, override / 100.0))
                elif r_km < 280:
                    soc_min, soc_max = 0.10, 0.20
                    initial_soc = np.random.uniform(soc_min, soc_max)
                elif r_km < 350:
                    soc_min, soc_max = 0.15, 0.25
                    initial_soc = np.random.uniform(soc_min, soc_max)
                else:
                    soc_min, soc_max = 0.20, 0.35
                    initial_soc = np.random.uniform(soc_min, soc_max)

                energy_needed = max(0.0, (target_soc_pct / 100.0 - initial_soc) * battery)

                zone = ["A", "B", "C", "D"][
                    (vehicle_num - 1) % 4
                ]

                vehicles.append({
                    "session_id":
                        f"GP_{vehicle_num:04d}",
                    "vehicle_id": vehicle_id,
                    "vehicle_model": model,
                    "battery_kwh": battery,
                    "charger_kw": charger,
                    "charger_power_kw": charger,
                    "range_km": r_km,
                    "arrival_time":
                        arrival_times[vehicle_num - 1],
                    "departure_deadline": "07:00",
                    "current_soc_pct": round(
                        initial_soc * 100, 1
                    ),
                    "target_soc_pct": target_soc_pct,
                    "energy_needed_kwh": round(
                        energy_needed, 1
                    ),
                    "energy_kwh": round(
                        energy_needed, 1
                    ),
                    "zone": zone,
                    "priority": "NORMAL",
                    "data_source":
                        "ACN-Data + Vahan CY2025",
                    "market_source":
                        f"Vahan CY2025 — {int(FLEET_MIX[model]*100)}% share",
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
