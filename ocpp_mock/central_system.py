import asyncio
import websockets
from ocpp_mock.charger import MockCharger
from ocpp.v16 import call

class GridPilotCentralSystem:

    def __init__(
        self, host="0.0.0.0", port=9000
    ):
        self.host = host
        self.port = port
        self.chargers = {}

    async def on_connect(
        self, websocket, path=None
    ):
        if path is None:
            path = getattr(websocket, "request", None)
            path = getattr(path, "path", "/unknown")
        charger_id = path.strip("/")
        charger = MockCharger(
            charger_id, websocket
        )
        self.chargers[charger_id] = charger
        print(
            f"[CENTRAL] Connected: "
            f"{charger_id}"
        )
        try:
            await charger.start()
        except Exception as e:
            print(f"[CENTRAL] {charger_id}: {e}")
        finally:
            self.chargers.pop(
                charger_id, None
            )

    async def send_charging_profile(
        self, charger_id, power_kw,
        start_time, duration_minutes
    ):
        charger = self.chargers.get(charger_id)
        if not charger:
            return {
                "error": "Not connected",
                "charger_id": charger_id
            }
        profile = {
            "chargingProfileId": 1,
            "stackLevel": 0,
            "chargingProfilePurpose":
                "TxDefaultProfile",
            "chargingProfileKind":
                "Absolute",
            "chargingSchedule": {
                "duration":
                    duration_minutes * 60,
                "startSchedule": start_time,
                "chargingRateUnit": "kW",
                "chargingSchedulePeriod": [
                    {
                        "startPeriod": 0,
                        "limit": power_kw
                    }
                ]
            }
        }
        try:
            response = await charger.call(
                call.SetChargingProfilePayload(
                    connector_id=1,
                    cs_charging_profiles=profile
                )
            )
            return {
                "status": response.status,
                "charger_id": charger_id,
                "power_kw": power_kw,
            }
        except Exception as e:
            return {
                "error": str(e),
                "charger_id": charger_id
            }

    async def start(self):
        server = await websockets.serve(
            self.on_connect,
            self.host, self.port,
            subprotocols=["ocpp1.6"]
        )
        print(
            f"[CENTRAL] OCPP server at "
            f"ws://{self.host}:{self.port}"
        )
        await server.wait_closed()
