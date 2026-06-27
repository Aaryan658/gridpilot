"""
Vehicle-to-Charger Mapping Service

Maps optimizer indices (0-599) to physical charger IDs (CP001-CP600)
and vehicle IDs (V001-V600) using the Vahan CY2025 fleet composition.
"""

from database.models import SessionLocal, VehicleChargerMap
import uuid

# Vahan CY2025 fleet composition — exact proportions for 600 vehicles
FLEET_COMPOSITION = [
    {"model": "Tata Nexon EV",  "count": 162, "battery_kwh": 30.2, "charger_kw": 7.4},
    {"model": "Tata Tiago EV",  "count":  84, "battery_kwh": 19.2, "charger_kw": 3.3},
    {"model": "MG Windsor EV",  "count": 108, "battery_kwh": 38.0, "charger_kw": 7.4},
    {"model": "Mahindra BE6",   "count": 102, "battery_kwh": 59.0, "charger_kw": 7.2},
    {"model": "Tata Curvv EV",  "count":  96, "battery_kwh": 55.0, "charger_kw": 7.2},
    {"model": "MG ZS EV",       "count":  48, "battery_kwh": 50.3, "charger_kw": 7.4},
]


def seed_vehicle_charger_map(depot_id: str) -> bool:
    """
    Creates 600 VehicleChargerMap records for the given depot_id.
    Does nothing if records already exist for this depot.
    Returns True if seeding occurred, False if already seeded.
    """
    db = SessionLocal()
    try:
        existing = db.query(VehicleChargerMap).filter(
            VehicleChargerMap.depot_id == depot_id
        ).count()
        if existing > 0:
            print(f"[SEED] Vehicle mapping already exists for {depot_id} ({existing} records)")
            return False

        print(f"[SEED] Creating 600 vehicle-charger mappings for {depot_id}...")
        index = 0
        for spec in FLEET_COMPOSITION:
            for _ in range(spec["count"]):
                record = VehicleChargerMap(
                    id=str(uuid.uuid4()),
                    depot_id=depot_id,
                    vehicle_index=index,
                    vehicle_id=f"V{index + 1:03d}",
                    charger_id=f"CP{index + 1:03d}",
                    vehicle_model=spec["model"],
                    battery_kwh=spec["battery_kwh"],
                    charger_kw=spec["charger_kw"],
                    is_active=True,
                )
                db.add(record)
                index += 1

        db.commit()
        print(f"[SEED] Successfully created {index} vehicle-charger mappings")
        return True
    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] {e}")
        return False
    finally:
        db.close()


def get_charger_id(depot_id: str, vehicle_index: int) -> str:
    """Returns charger_id for given vehicle_index. Raises ValueError if not found."""
    db = SessionLocal()
    try:
        record = db.query(VehicleChargerMap).filter(
            VehicleChargerMap.depot_id == depot_id,
            VehicleChargerMap.vehicle_index == vehicle_index,
        ).first()
        if not record:
            raise ValueError(
                f"No charger mapping found for depot={depot_id}, vehicle_index={vehicle_index}"
            )
        return record.charger_id
    finally:
        db.close()


def get_full_mapping(depot_id: str) -> list[dict]:
    """Returns all 600 records as list of dicts for the given depot."""
    db = SessionLocal()
    try:
        records = (
            db.query(VehicleChargerMap)
            .filter(VehicleChargerMap.depot_id == depot_id, VehicleChargerMap.is_active == True)
            .order_by(VehicleChargerMap.vehicle_index)
            .all()
        )
        return [
            {
                "vehicle_index": r.vehicle_index,
                "vehicle_id": r.vehicle_id,
                "charger_id": r.charger_id,
                "vehicle_model": r.vehicle_model,
                "battery_kwh": r.battery_kwh,
                "charger_kw": r.charger_kw,
            }
            for r in records
        ]
    finally:
        db.close()
