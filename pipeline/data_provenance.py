def build_data_provenance_report() -> dict:
    return {
        "ev_sessions": {
            "source": "ACN-Data (Caltech/JPL)",
            "type": "REAL_BEHAVIORAL",
            "adaptation": (
                "Timing shifted to IST evening "
                "depot, energy scaled to Indian EVs"
            ),
            "citation":
                "Flores-Espino et al. 2021",
        },
        "fleet_vehicle_mix": {
            "source": (
                "Vahan Dashboard + "
                "Autocar Professional CY2024"
            ),
            "type": "REAL_GOVERNMENT",
            "validation": (
                "6-model mix based on actual "
                "India EV market share data"
            ),
        },
        "energy_calibration": {
            "source": "Vasudha Foundation 2023",
            "type": "REAL_PUBLISHED",
            "value": "22.4 kWh/session Indian avg",
        },
        "carbon_intensity": {
            "source":
                "CEA CO2 Baseline v16 2022-23",
            "type": "REAL_GOVERNMENT",
            "value":
                "Haryana 0.820 kg CO2/kWh",
        },
        "ev_registrations": {
            "source":
                "Vahan Dashboard MoRTH 2024",
            "type": "REAL_GOVERNMENT",
            "value": (
                "Haryana 68,900 EVs, "
                "+247% 2022-24"
            ),
        },
        "grid_demand": {
            "source":
                "CEA Annual Report 2022-23",
            "type": "REAL_GOVERNMENT",
            "value": "NR peak 74,000 MW",
        },
        "weather": {
            "source":
                "Open-Meteo Historical API",
            "type": "REAL_API",
            "value": "Gurugram 3yr hourly",
        },
    }
