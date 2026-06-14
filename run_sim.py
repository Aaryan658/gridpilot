import time, requests

t0 = time.time()
r = requests.post(
    'http://localhost:8000/depot/schedule',
    json={
        'date':'2024-01-15',
        'n_vehicles':500,
        'enable_v2g':False
    }
)
ms = round((time.time()-t0)*1000)
d = r.json()
c = d.get('comparison') or d.get('depot',{}).get('schedule_summary',{}).get('comparison',{})

carbon_saved = (c.get('unmanaged_carbon_kg', 0) - c.get('scheduled_carbon_kg', 0))

print('=== UPDATED SIMULATION RESULTS ===')
print('Status:          {}'.format(d['managed']['status']))
print('Peak reduction:  {:.1f}%'.format(c['peak_reduction_pct']))
print('Unmanaged peak:  {:,.0f} kW'.format(c['unmanaged_peak_kw']))
print('Managed peak:    {:,.0f} kW'.format(c['scheduled_peak_kw']))
print('DVVNL saving:    Rs {:.2f}L/month'.format(c['dvvnl_monthly_saving_inr']/100000))
print('Carbon saved:    {:.0f} kg/night'.format(carbon_saved))
print('Solve time:      {:.0f}ms'.format(d['managed']['solve_time_ms']))
print('All ready 07:00: {}'.format(d['managed']['fleet_summary']['all_ready_on_time']))
print('API total time:  {}ms'.format(ms))
print('==================================')