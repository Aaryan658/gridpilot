import asyncio, sys
sys.path.insert(0, ".")

from ocpp_mock.central_system import (
    GridPilotCentralSystem
)
import websockets
from ocpp.v16 import ChargePoint as cp
from ocpp_mock.charger import MockCharger

async def connect_charger(
    charger_id, cs_url
):
    uri = f"{cs_url}/{charger_id}"
    try:
        async with websockets.connect(
            uri,
            subprotocols=["ocpp1.6"]
        ) as ws:
            charger = MockCharger(
                charger_id, ws
            )
            await charger.start()
    except Exception as e:
        print(f"[{charger_id}] {e}")

async def main():
    cs = GridPilotCentralSystem()
    cs_task = asyncio.create_task(cs.start())

    await asyncio.sleep(1)

    n_chargers = 10
    cs_url = "ws://localhost:9000"
    charger_tasks = [
        asyncio.create_task(
            connect_charger(
                f"GRIDPILOT_{i+1:03d}",
                cs_url
            )
        )
        for i in range(n_chargers)
    ]

    print(
        f"\n{n_chargers} mock chargers "
        f"connected to OCPP central system"
    )
    print("GridPilot OCPP ready.")
    print("Press Ctrl+C to stop.\n")

    await asyncio.gather(
        cs_task, *charger_tasks
    )

if __name__ == "__main__":
    asyncio.run(main())
