"""
GridPilot OCPP central system + rig trigger API — everything the 5-relay
hardware rig needs from a laptop at the venue, in one process:

  - OCPP 1.6J WebSocket server (port 9000) — the ESP32's MicroOCPP firmware
    connects here as ws://<this-machine's-LAN-IP>:9000/RIG_BAY_<n>.
  - Rig trigger HTTP API (port 9001) — POST /mode {"mode": "unmanaged"} or
    {"mode": "managed"} computes the real GridPilotScheduler output for a
    5-vehicle fleet and pushes SetChargingProfile to whichever bays are
    currently connected.

Run with --mock to spawn 5 software chargers (RIG_BAY_1..5) instead of real
hardware, so the whole loop — trigger call -> scheduler -> OCPP push -> bay
reacts — can be tested end-to-end before any ESP32 is involved.
"""
import argparse
import asyncio
import sys

sys.path.insert(0, ".")

import uvicorn
import websockets
from fastapi import FastAPI
from pydantic import BaseModel

from ocpp_mock.central_system import GridPilotCentralSystem
from ocpp_mock.charger import MockCharger
from ocpp_mock.gridpilot_bridge import push_mode


class ModeRequest(BaseModel):
    mode: str  # "unmanaged" | "managed"


def build_trigger_app(cs: GridPilotCentralSystem) -> FastAPI:
    app = FastAPI(title="GridPilot Rig Trigger")

    @app.post("/mode")
    async def set_mode(req: ModeRequest):
        if req.mode not in ("unmanaged", "managed"):
            return {"error": "mode must be 'unmanaged' or 'managed'"}
        return await push_mode(cs, req.mode)

    @app.get("/connected")
    async def connected():
        return {"chargers": list(cs.chargers.keys())}

    return app


async def connect_mock_charger(charger_id: str, cs_url: str) -> None:
    uri = f"{cs_url}/{charger_id}"
    try:
        async with websockets.connect(uri, subprotocols=["ocpp1.6"]) as ws:
            charger = MockCharger(charger_id, ws)
            await charger.start()
    except Exception as e:
        print(f"[{charger_id}] {e}")


async def main():
    parser = argparse.ArgumentParser(description="GridPilot OCPP central system + rig trigger API")
    parser.add_argument(
        "--mock", action="store_true",
        help="Spawn 5 mock RIG_BAY chargers for local testing (no real hardware needed)",
    )
    parser.add_argument("--ocpp-port", type=int, default=9000)
    parser.add_argument("--trigger-port", type=int, default=9001)
    args = parser.parse_args()

    cs = GridPilotCentralSystem(port=args.ocpp_port)
    cs_task = asyncio.create_task(cs.start())
    await asyncio.sleep(1)

    trigger_app = build_trigger_app(cs)
    trigger_config = uvicorn.Config(trigger_app, host="0.0.0.0", port=args.trigger_port, log_level="warning")
    trigger_server = uvicorn.Server(trigger_config)
    tasks = [cs_task, asyncio.create_task(trigger_server.serve())]

    if args.mock:
        cs_url = f"ws://localhost:{args.ocpp_port}"
        for i in range(5):
            tasks.append(asyncio.create_task(connect_mock_charger(f"RIG_BAY_{i + 1}", cs_url)))
        await asyncio.sleep(1)
        print("5 mock RIG_BAY chargers connected for local testing.")

    print(f"\nOCPP central system: ws://0.0.0.0:{args.ocpp_port}/<charger_id>")
    print(f'Rig trigger API:     http://0.0.0.0:{args.trigger_port}/mode  (POST {{"mode": "unmanaged"|"managed"}})')
    print("Press Ctrl+C to stop.\n")

    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
