import time
import pandas as pd
from gridpilot.scheduler import GridPilotScheduler
from gridpilot.ev_manager import EVRequestManager

print("Initializing models...")
scheduler = GridPilotScheduler()
ev_manager = EVRequestManager()

print("Generating sessions...")
sessions = ev_manager.generate_session('2024-01-15', 600)
building_load = pd.Series([400.0] * GridPilotScheduler.N_SLOTS)
signal = {"carbon_intensity_now": 0.8, "ev_action_now": "Standard"}

print("Running cold start...")
t0 = time.time()
scheduler.schedule(sessions, building_load, signal, False)
cold_time = time.time() - t0
print(f"Cold start time: {cold_time:.2f}s")

print("Running warm start 1...")
t0 = time.time()
scheduler.schedule(sessions, building_load, signal, False)
warm1_time = time.time() - t0
print(f"Warm start 1 time: {warm1_time:.2f}s")

print("Running warm start 2...")
t0 = time.time()
scheduler.schedule(sessions, building_load, signal, False)
warm2_time = time.time() - t0
print(f"Warm start 2 time: {warm2_time:.2f}s")
