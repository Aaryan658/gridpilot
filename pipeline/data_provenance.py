def build_data_provenance_report() -> dict:
    return {
        "ev_sessions": {
            "source": "ACN-Data (Caltech/JPL)",
            "type": "REAL_BEHAVIORAL",
            "adaptation": (
                "Timing shifted to IST evening "
                "depot, energy scaled to Indian EVs"
            ),
            "citation": (
                "ACN-Data (Caltech, Lee et al. 2019, "
                "sessions 2018-2020). Used ONLY for "
                "arrival time distribution shape within "
                "20:00-22:00 corporate depot return window. "
                "Vehicle specs (battery, charger) from "
                "Vahan CY2025. Energy per session from "
                "first-principles fleet calculation."
            ),
            "note": (
                "Static dataset, sessions 2018-2020. "
                "No newer version published as of June 2026."
            ),
        },
        "fleet_vehicle_mix": {
            "source": (
                "Vahan Dashboard + "
                "Autocar Professional CY2025"
            ),
            "type": "REAL_GOVERNMENT",
            "validation": (
                "6-model mix based on actual "
                "India EV market share data"
            ),
        },
        "energy_calibration": {
            "source": (
                "First-principles calculation from Vahan CY2025 "
                "fleet weighted average battery capacity (40.53 kWh) "
                "and SoC arrival distribution (10-35% by vehicle range) "
                "consistent with ACN-Data behavioral data"
            ),
            "type": "DERIVED",
            "value": "22.8 kWh/session (modeled avg, σ=6.5 kWh)",
        },
        "carbon_intensity": {
            "source":
                "CEA CO2 Baseline Database for the Indian Power Sector, Version 20.0, December 2024. Ministry of Power, Government of India. cea.nic.in",
            "type": "REAL_GOVERNMENT",
            "value":
                "Haryana 0.710 kg CO2/kWh",
        },
        "ev_registrations": {
            "source":
                "Vahan Dashboard MoRTH CY2025 (EVreporter analysis, Vahan Portal as of January 2026)",
            "type": "REAL_GOVERNMENT",
            "value": (
                "Haryana 68,900 EVs, "
                "+247% 2022-24"
            ),
        },
        "grid_demand": {
            "source":
                "CEA Annual Report 2023-24",
            "type": "REAL_GOVERNMENT",
            "value": "NR peak 74,000 MW",
        },
        "weather": {
            "source": (
                "Open-Meteo Historical Weather API. "
                "open-meteo.com. Accessed June 2026. "
                "CC BY 4.0 open data licence."
            ),
            "type": "REAL_API",
            "value": "Gurugram 3yr hourly",
        },
        "electricity_tariff": {
            "source": "DVVNL",
            "type": "REAL_REGULATORY",
            "citation": (
                "DVVNL HT-2 Tariff Schedule FY 2025-26 "
                "UPERC Order November 2025. "
                "Demand charge ₹350/kVA/month "
                "unchanged for 6th consecutive year."
            ),
            "value": "₹350/kVA/month",
        },
    }
