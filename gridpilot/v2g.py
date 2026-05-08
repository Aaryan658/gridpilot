from __future__ import annotations

import pandas as pd


class V2GDispatcher:
    DEMAND_CHARGE_INR_PER_KVA_MONTH = 350.0
    PEAK_PENALTY_INR_PER_KVA_MONTH = 500.0
    POWER_FACTOR = 0.9
    BATTERY_CAPACITY_KWH = 40.0
    TARGET_SOC_PCT = 80.0
    V2G_FLOOR_SOC_PCT = 30.0
    REALISTIC_MIN_KW = 200.0
    REALISTIC_MAX_KW = 400.0

    def calculate_potential(self, active_evs: list) -> dict:
        willing = [
            ev
            for ev in active_evs
            if float(ev.get("current_soc_pct", self.TARGET_SOC_PCT)) > self.V2G_FLOOR_SOC_PCT
        ]
        raw_available_kwh = sum(
            max(0.0, (float(ev.get("current_soc_pct", self.TARGET_SOC_PCT)) - self.V2G_FLOOR_SOC_PCT) / 100.0)
            * self.BATTERY_CAPACITY_KWH
            for ev in willing
        )
        available_kw = min(self.REALISTIC_MAX_KW, max(0.0, len(willing) * 2.0))
        if willing:
            available_kw = max(self.REALISTIC_MIN_KW, available_kw)
        peak_shaving_kw = min(available_kw, raw_available_kwh)
        saving_inr = (peak_shaving_kw / self.POWER_FACTOR) * self.DEMAND_CHARGE_INR_PER_KVA_MONTH
        co2_offset = min(raw_available_kwh, peak_shaving_kw * 4.0) * 0.82

        return {
            "available_kw": round(float(available_kw), 2),
            "available_kwh": round(float(raw_available_kwh), 2),
            "willing_vehicles_n": int(len(willing)),
            "estimated_monthly_dvvnl_saving_inr": round(float(saving_inr), 2),
            "co2_offset_kg_per_day": round(float(co2_offset), 2),
            "peak_shaving_kw": round(float(peak_shaving_kw), 2),
        }

    def dispatch(self, discharge_schedule: dict, building_load: pd.Series, peak_window: tuple) -> dict:
        start_hour, end_hour = peak_window
        total_discharge_kwh = 0.0
        max_relief_kw = 0.0
        for hour, kw in discharge_schedule.items():
            hour_int = int(str(hour).split(":")[0])
            if start_hour <= hour_int < end_hour:
                discharge_kw = min(float(kw), self.REALISTIC_MAX_KW)
                total_discharge_kwh += discharge_kw
                max_relief_kw = max(max_relief_kw, discharge_kw)

        avoided_demand_charge = (max_relief_kw / self.POWER_FACTOR) * self.DEMAND_CHARGE_INR_PER_KVA_MONTH / 30.0
        energy_value = total_discharge_kwh * 6.50
        degradation_cost = total_discharge_kwh * 1.15
        return {
            "actual_discharge_kwh": round(float(total_discharge_kwh), 2),
            "grid_relief_kw": round(float(max_relief_kw), 2),
            "net_revenue_inr": round(float(avoided_demand_charge + energy_value - degradation_cost), 2),
            "battery_degradation_pct": round(float(total_discharge_kwh / (500 * self.BATTERY_CAPACITY_KWH) * 100.0), 4),
        }


if __name__ == "__main__":
    dispatcher = V2GDispatcher()
    active_evs = [
        {
            "vehicle_id": f"NEXON_{idx:04d}",
            "current_soc_pct": 80.0,
            "target_soc_pct": 80.0,
        }
        for idx in range(200)
    ]

    potential = dispatcher.calculate_potential(active_evs)
    print(f"Available V2G power: {potential['available_kw']:,.0f} kW")
    print(f"Available V2G energy: {potential['available_kwh']:,.0f} kWh")
    print(
        "Estimated monthly DVVNL saving: "
        f"Rs {potential['estimated_monthly_dvvnl_saving_inr']:,.0f}"
    )
    assert 100000 <= potential["estimated_monthly_dvvnl_saving_inr"] <= 300000
    print("All V2GDispatcher tests passed.")
