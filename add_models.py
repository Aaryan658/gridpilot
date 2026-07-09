import os

file_path = r'd:\GRID\database\models.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

models_to_add = '''
from sqlalchemy import ForeignKey, Text, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
import uuid

class ScheduleRun(Base):
    __tablename__ = "schedule_runs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    depot_id = Column(String, nullable=False, index=True)
    run_at = Column(DateTime, default=datetime.datetime.utcnow)
    solver_status = Column(String)
    solve_time_ms = Column(Integer)
    peak_kw_managed = Column(Float)
    peak_kw_unmanaged = Column(Float)
    peak_reduction_percent = Column(Float)
    saving_inr = Column(Float)
    carbon_saved_kg = Column(Float)
    vehicles_ready = Column(Integer)
    vehicles_total = Column(Integer)
    overload_events = Column(Integer)
    load_curve_json = Column(Text)
    raw_schedule_json = Column(Text)

class ChargerStatus(Base):
    __tablename__ = "charger_status"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    depot_id = Column(String, nullable=False, index=True)
    vehicle_id = Column(String, nullable=False)
    charger_id = Column(String, nullable=False)
    vehicle_model = Column(String, nullable=False)
    arrival_time = Column(DateTime, nullable=True)
    energy_needed_kwh = Column(Float, nullable=False)
    energy_delivered_kwh = Column(Float, default=0.0)
    current_power_kw = Column(Float, default=0.0)
    soc_percent = Column(Float, default=20.0)
    scheduled_start_slot = Column(Integer, nullable=True)
    status = Column(String, default="queued")
    minutes_to_ready = Column(Integer, nullable=True)
    target_soc = Column(Float, default=80.0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow,
                        onupdate=datetime.datetime.utcnow)
    run_id = Column(String, ForeignKey("schedule_runs.id"),
                    nullable=True)

    __table_args__ = (
        Index('ix_charger_status_depot_updated',
              'depot_id', 'updated_at'),
    )

class VehicleChargerMap(Base):
    __tablename__ = "vehicle_charger_map"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    depot_id = Column(String, nullable=False)
    vehicle_index = Column(Integer, nullable=False)
    vehicle_id = Column(String, nullable=False)
    charger_id = Column(String, nullable=False)
    vehicle_model = Column(String, nullable=False)
    battery_kwh = Column(Float, nullable=False)
    charger_kw = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint('depot_id', 'vehicle_index'),
        UniqueConstraint('depot_id', 'charger_id'),
    )

'''

# insert before Base.metadata.create_all
if 'class ScheduleRun' not in content:
    idx = content.find('Base.metadata.create_all(engine)')
    content = content[:idx] + models_to_add + content[idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("ALREADY ADDED")
