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

Base.metadata.create_all(engine)
print("Database tables created")
