from sqlalchemy import (
    create_engine, Column, Integer, Float,
    String, DateTime, JSON, Boolean
)
from sqlalchemy.ext.declarative import (
    declarative_base
)
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import datetime
import os
from dotenv import load_dotenv
from api.config import settings

load_dotenv()

Base = declarative_base()
DATABASE_URL = settings.DATABASE_URL

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=300
    )

SessionLocal = sessionmaker(bind=engine)

class OptimizerRun(Base):
    __tablename__ = "optimizer_runs"
    id = Column(Integer, primary_key=True)
    run_id = Column(String, unique=True)
    depot_id = Column(String, index=True, nullable=True)
    timestamp = Column(DateTime,
        default=datetime.datetime.utcnow)
    n_vehicles = Column(Integer)
    vehicle_mix = Column(JSON)
    peak_kw_before = Column(Float)
    peak_kw_after = Column(Float)
    peak_reduction_pct = Column(Float)
    carbon_saved_kg = Column(Float)
    carbon_reduction_pct = Column(Float)
    dvvnl_saving_inr = Column(Float)
    solve_time_ms = Column(Float)
    solver_status = Column(String)
    all_ready = Column(Boolean)
    overloads_before = Column(Integer)
    overloads_after = Column(Integer)
    result_summary = Column(JSON)

class GridMeasurement(Base):
    __tablename__ = "grid_measurements"
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime)
    region = Column(String)
    load_kw = Column(Float)
    carbon_intensity = Column(Float)
    signal = Column(String)
    source = Column(String)
    created_at = Column(DateTime,
        default=datetime.datetime.utcnow)


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

from api.models.user import User
Base.metadata.create_all(engine)
print("Database tables created")
