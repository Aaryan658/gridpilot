import asyncio
from datetime import datetime, timezone
from ocpp.v16 import ChargePoint as cp
from ocpp.v16 import call_result
from ocpp.routing import on

class MockCharger(cp):

    def __init__(
        self, charger_id, connection,
        vehicle_id=None
    ):
        super().__init__(
            charger_id, connection
        )
        self.charger_id = charger_id
        self.vehicle_id = vehicle_id
        self.current_power_kw = 0.0
        self.charging_profile = None
        self.status = "Available"
        self.commands_log = []

    @on("SetChargingProfile")
    async def on_set_charging_profile(
        self, connector_id,
        cs_charging_profiles, **kwargs
    ):
        self.charging_profile = (
            cs_charging_profiles
        )
        schedule = cs_charging_profiles.get(
            "chargingSchedule", {}
        )
        periods = schedule.get(
            "chargingSchedulePeriod", []
        )
        if periods:
            # limit is in Watts (OCPP 1.6J's chargingRateUnit schema only
            # allows 'A'/'W', see central_system.py::send_charging_profile).
            self.current_power_kw = (
                periods[0].get("limit", 7400) / 1000
            )
        self.status = "Charging"
        log_entry = {
            "time":
                datetime.now(timezone.utc)
                .isoformat(),
            "command":
                "SetChargingProfile",
            "power_kw":
                self.current_power_kw,
            "status": "Accepted",
        }
        self.commands_log.append(log_entry)
        print(
            f"[{self.charger_id}] "
            f"Profile set: "
            f"{self.current_power_kw} kW"
        )
        return (
            call_result
            .SetChargingProfile(
                status="Accepted"
            )
        )

    @on("ChangeAvailability")
    async def on_change_availability(
        self, connector_id, type, **kwargs
    ):
        self.status = type
        return (
            call_result
            .ChangeAvailability(
                status="Accepted"
            )
        )
