"""Test that the power_schedule fix produces varied, real SoC values."""
import sys
sys.path.insert(0, '.')

from gridpilot.scheduler import GridPilotScheduler
from gridpilot.ev_manager import EVRequestManager
from services.vehicle_mapping import get_full_mapping, seed_vehicle_charger_map
from services.schedule_adapter import adapt_optimizer_output
import pandas as pd
import numpy as np
from collections import Counter

mgr = EVRequestManager()
sessions = mgr.generate_session('2024-01-15', n=600)
building = pd.Series([400.0] * 96)
sched = GridPilotScheduler()
unmanaged = sched.get_unmanaged_baseline(sessions, building)
managed = sched.schedule(sessions, building, carbon_signal={})

print("power_schedule shape:", managed['power_schedule'].shape)
print("has_power_schedule:", managed.get('power_schedule') is not None)

# Simulate what api/main.py now does
result = {'comparison': managed['comparison'], 'power_schedule': managed['power_schedule']}
result['total_load'] = managed['timeseries']['total_load_kw'].to_numpy()

seed_vehicle_charger_map('depot-001')
mapping = get_full_mapping('depot-001')
adapted = adapt_optimizer_output(result, 'depot-001', mapping)

# Check SoC distribution
socs = [v['soc_percent'] for v in adapted['vehicles']]
statuses = [v['status'] for v in adapted['vehicles']]

print()
print("=== REAL DATA RESULTS ===")
print(f"SoC range: {min(socs):.1f}% - {max(socs):.1f}%")
print(f"SoC mean: {np.mean(socs):.1f}%")
print(f"Unique SoC values: {len(set([round(s,1) for s in socs]))}")
print(f"Status distribution: {Counter(statuses)}")
print()
print("Sample vehicles:")
for v in adapted['vehicles'][:15]:
    vid = v['vehicle_id']
    soc = v['soc_percent']
    st = v['status']
    ed = v['energy_delivered_kwh']
    en = v['energy_needed_kwh']
    print(f"  {vid:6s} | SoC: {soc:5.1f}% | Status: {st:10s} | Delivered: {ed:.1f}/{en:.1f} kWh")
