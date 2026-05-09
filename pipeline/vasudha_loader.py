class VasudhaLoader:

    INDIA_CHARGER_UTILIZATION = {
        "avg_kwh_per_charger_per_day": 28.4,
        "avg_sessions_per_charger_per_day": 3.2,
        "corporate_depot_kwh_per_session": 22.4,
        "peak_utilization_hour_ist": 19,
        "source": "Vasudha Foundation 2023"
    }

    def get_session_energy_calibration(
        self
    ) -> dict:
        return {
            "indian_depot_avg_kwh": 22.4,
            "acn_caltech_avg_kwh": 11.5,
            "calibration_factor": 22.4 / 11.5,
            "reason": (
                "Indian corporate fleet EVs carry "
                "~2x the battery capacity of "
                "average ACN Caltech vehicles"
            ),
            "source": "Vasudha Foundation 2023"
        }

    def get_utilization_narrative(self) -> str:
        return (
            "Indian depot chargers average 28.4 kWh "
            "per charger per day. Peak utilization at "
            "19:00 IST — precisely the window that "
            "causes transformer stress. "
            "Source: Vasudha Foundation 2023."
        )
