import requests, random
from datetime import datetime, timezone

class FrequencyMonitor:

    NOMINAL_HZ = 50.0
    STRESS_THRESHOLD = 49.8
    CRITICAL_THRESHOLD = 49.5

    def get_current_frequency(self) -> dict:
        try:
            r = requests.get(
                "https://posoco.in/en/"
                "grid-management/"
                "grid-frequency/",
                timeout=3
            )
            freq = self._parse_frequency(
                r.text
            )
            if freq and 48.0 < freq < 52.0:
                return {
                    "frequency_hz": freq,
                    "status":
                        self._classify(freq),
                    "source": "POSOCO_REAL",
                    "timestamp":
                        datetime.now(timezone.utc)
                        .isoformat()
                }
        except Exception:
            pass

        base = 50.0
        noise = random.gauss(0, 0.08)
        freq = round(base + noise, 3)
        if random.random() < 0.05:
            freq = round(
                49.6 + random.random() * 0.3,
                3
            )
        return {
            "frequency_hz": freq,
            "status": self._classify(freq),
            "source": "SYNTHETIC",
            "timestamp":
                datetime.now(timezone.utc)
                .isoformat()
        }

    def _parse_frequency(
        self, html: str
    ):
        import re
        matches = re.findall(
            r"(\d{2}\.\d{2,3})\s*Hz", html
        )
        for m in matches:
            f = float(m)
            if 48 < f < 52:
                return f
        return None

    def _classify(
        self, freq: float
    ) -> str:
        if freq >= 49.9:
            return "NORMAL"
        elif freq >= 49.8:
            return "CAUTION"
        elif freq >= 49.5:
            return "STRESS"
        else:
            return "CRITICAL"

    def get_demand_response_signal(
        self
    ) -> dict:
        data = self.get_current_frequency()
        freq = data["frequency_hz"]
        status = data["status"]

        config = {
            "NORMAL": {
                "action": "CHARGE_NORMAL",
                "reduction_pct": 0,
                "reason":
                    "Grid frequency normal. "
                    "Full charging permitted.",
            },
            "CAUTION": {
                "action": "CHARGE_REDUCED",
                "reduction_pct": 20,
                "reason": (
                    f"Grid frequency low: "
                    f"{freq} Hz. Reducing "
                    f"EV charging 20%."
                ),
            },
            "STRESS": {
                "action": "CHARGE_MINIMAL",
                "reduction_pct": 60,
                "reason": (
                    f"Grid under stress: "
                    f"{freq} Hz. Reducing "
                    f"EV charging 60%."
                ),
            },
            "CRITICAL": {
                "action": "CHARGE_PAUSE",
                "reduction_pct": 90,
                "reason": (
                    f"Grid critical: "
                    f"{freq} Hz. Emergency "
                    f"load reduction active."
                ),
            },
        }

        c = config[status]
        max_power = round(
            7.4 * (1 - c["reduction_pct"]/100),
            2
        )

        return {
            "frequency_hz": freq,
            "grid_status": status,
            "dr_action": c["action"],
            "load_reduction_pct":
                c["reduction_pct"],
            "max_ev_power_kw": max_power,
            "reason": c["reason"],
            "source": data["source"],
            "timestamp": data["timestamp"],
            "revenue_potential": (
                "₹2-5 lakh/month demand "
                "response revenue from DISCOM"
                if c["reduction_pct"] > 0
                else None
            )
        }
