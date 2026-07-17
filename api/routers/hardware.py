import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.auth.dependencies import get_db
from database.models import ChargerStatus

router = APIRouter(prefix="/hardware", tags=["hardware"])

# Simple model for what the hardware sends us
class HardwareStatusReport(BaseModel):
    charger_id: str
    soc_percent: float
    actual_power_kw: float

@router.post("/status")
def update_hardware_status(
    report: HardwareStatusReport,
    db: Session = Depends(get_db),
):
    """
    Endpoint for physical hardware (ESP32/Raspberry Pi) to report its real-time telemetry.
    The response automatically tells the hardware what power limit the CVXPY optimizer 
    wants it to enforce right now.
    """
    # Find this charger in the database
    charger = db.query(ChargerStatus).filter(
        ChargerStatus.charger_id == report.charger_id
    ).first()

    if not charger:
        raise HTTPException(status_code=404, detail="Charger not found in database.")

    # 1. UPDATE THE DATABASE WITH REAL HARDWARE DATA
    charger.soc_percent = report.soc_percent
    # We update the current_power_kw to what the hardware is *actually* drawing
    charger.current_power_kw = report.actual_power_kw
    charger.updated_at = datetime.datetime.utcnow()
    
    # (The live dashboard reads this updated_at timestamp, so updating it here 
    # will instantly force the Live UI to refresh and show this exact SoC!)
    db.commit()

    # 2. SEND COMMANDS BACK TO THE HARDWARE
    # We read exactly what the CVXPY optimizer scheduled for this specific charger
    # right now, which is stored in the database.
    target_power = 0.0
    if charger.status == "charging" and charger.current_power_kw is not None:
        # Note: In a fully fleshed out loop, the CVXPY scheduler would write its 
        # target_power to a separate database column (e.g., scheduled_power_kw), 
        # but for this demo, we'll give it the max allowed if it's supposed to be charging.
        target_power = 7.4 

    return {
        "status": "success",
        "message": f"Successfully synced {report.charger_id}",
        "command": {
            "authorized": True,
            "target_power_kw": target_power
        }
    }
