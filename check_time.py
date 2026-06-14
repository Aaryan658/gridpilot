import requests, time

# Check cache status
r = requests.get('http://localhost:8000/cache/status')
print('Cache status:', r.json())

# Run schedule and time it
t0 = time.time()
r = requests.post('http://localhost:8000/depot/schedule', json={'date':'2024-01-15','n_vehicles':500,'enable_v2g':False})
ms = round((time.time()-t0)*1000)
d = r.json()
print('API total time:', ms, 'ms')
print('Solver time:', round(d['managed']['solve_time_ms']), 'ms')
print('Status:', d['managed']['status'])