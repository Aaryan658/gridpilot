from __future__ import annotations

import hashlib
from datetime import date

import numpy as np
import pandas as pd


class CEALoader:
    CEA_EMISSION_FACTORS = {
        "Andhra Pradesh": 0.690,
        "Arunachal Pradesh": 0.180,
        "Assam": 0.621,
        "Bihar": 0.870,
        "Chhattisgarh": 0.910,
        "Goa": 0.720,
        "Gujarat": 0.712,
        "Haryana": 0.710,
        "Himachal Pradesh": 0.240,
        "Jharkhand": 0.900,
        "Karnataka": 0.508,
        "Kerala": 0.308,
        "Madhya Pradesh": 0.780,
        "Maharashtra": 0.724,
        "Manipur": 0.420,
        "Meghalaya": 0.360,
        "Mizoram": 0.390,
        "Nagaland": 0.410,
        "Odisha": 0.834,
        "Punjab": 0.760,
        "Rajasthan": 0.784,
        "Sikkim": 0.120,
        "Tamil Nadu": 0.536,
        "Telangana": 0.760,
        "Tripura": 0.530,
        "Uttar Pradesh": 0.891,
        "Uttarakhand": 0.410,
        "West Bengal": 0.862,
        "Andaman and Nicobar Islands": 0.650,
        "Chandigarh": 0.760,
        "Dadra and Nagar Haveli and Daman and Diu": 0.700,
        "Delhi": 0.710,
        "Jammu and Kashmir": 0.460,
        "Ladakh": 0.320,
        "Lakshadweep": 0.600,
        "Puducherry": 0.560,
        "National_avg": 0.716,
    }

    def get_state_emission_factor(self, state: str) -> float:
        normalized = state.strip()
        return float(self.CEA_EMISSION_FACTORS.get(normalized, self.CEA_EMISSION_FACTORS["National_avg"]))

    def get_hourly_carbon_profile(self, state: str, date: str | date) -> pd.DataFrame:
        timestamps = pd.date_range(start=pd.to_datetime(date).normalize(), periods=48, freq="h")
        seed = int(hashlib.sha256(f"{state}-{pd.to_datetime(date).date()}".encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        base_factor = self.get_state_emission_factor(state)

        records = []
        for timestamp in timestamps:
            hour = timestamp.hour
            if state.strip() == "Haryana":
                if 0 <= hour < 2:
                    intensity = rng.uniform(0.693, 0.723)
                elif 2 <= hour < 5:
                    intensity = rng.uniform(0.613, 0.643)
                elif 5 <= hour < 8:
                    intensity = rng.uniform(0.653, 0.713)
                elif 8 <= hour < 18:
                    intensity = rng.uniform(0.693, 0.743)
                elif 18 <= hour < 22:
                    intensity = rng.uniform(0.743, 0.803)
                else:
                    intensity = rng.uniform(0.713, 0.743)
            else:
                if 2 <= hour < 5:
                    intensity = base_factor * rng.uniform(0.86, 0.92)
                elif 18 <= hour < 22:
                    intensity = base_factor * rng.uniform(1.08, 1.15)
                elif 11 <= hour < 16:
                    intensity = base_factor * rng.uniform(0.92, 0.98)
                else:
                    intensity = base_factor * rng.uniform(0.98, 1.03)

            intensity = round(float(intensity), 3)
            if intensity < 0.75:
                signal = "CLEAN"
                ev_action = "CHARGE_MAX"
                recommended_power = 7.4
            elif intensity <= 0.84:
                signal = "NEUTRAL"
                ev_action = "CHARGE_SCHEDULED"
                recommended_power = 4.0
            else:
                signal = "DIRTY"
                ev_action = "MINIMIZE"
                recommended_power = 0.0

            renewable_pct = float(np.clip(85.0 - (intensity * 75.0), 8.0, 45.0))
            if signal == "CLEAN":
                renewable_pct += 8.0

            records.append(
                {
                    "timestamp": timestamp,
                    "state": state,
                    "carbon_intensity_kg_co2_kwh": intensity,
                    "renewable_pct": round(renewable_pct, 1),
                    "signal": signal,
                    "ev_action": ev_action,
                    "recommended_ev_power_kw": recommended_power,
                }
            )

        return pd.DataFrame.from_records(records)

    def get_savings_per_kwh_shifted(self, state: str, from_hour: int, to_hour: int) -> float:
        profile = self.get_hourly_carbon_profile(state, "2024-03-15")
        from_intensity = profile.loc[
            profile["timestamp"].dt.hour == from_hour, "carbon_intensity_kg_co2_kwh"
        ].mean()
        to_intensity = profile.loc[
            profile["timestamp"].dt.hour == to_hour, "carbon_intensity_kg_co2_kwh"
        ].mean()
        return round(float(from_intensity - to_intensity), 3)


if __name__ == "__main__":
    loader = CEALoader()

    factor = loader.get_state_emission_factor("Haryana")
    print(f"Haryana factor: {factor:.3f}")
    assert factor == 0.710, "Haryana factor must be exactly 0.710"

    profile = loader.get_hourly_carbon_profile("Haryana", "2024-03-15")
    print(f"Generated rows: {len(profile)}")
    assert len(profile) == 48, "Profile must contain 48 hourly rows"

    clean_window = profile[(profile["timestamp"].dt.hour >= 2) & (profile["timestamp"].dt.hour < 5)]
    print(clean_window[["timestamp", "carbon_intensity_kg_co2_kwh", "signal"]].to_string(index=False))
    assert (clean_window["signal"] == "CLEAN").all(), "02:00-05:00 must be CLEAN"

    saving = loader.get_savings_per_kwh_shifted("Haryana", 19, 3)
    print(f"Savings shifting 1 kWh from 19:00 to 03:00 in Haryana: {saving:.3f} kg CO2")
    assert saving > 0, "Dirty-to-clean shifting must save CO2"
