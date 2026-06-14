import requests, time

# Check cache status
r = requests.get('http://localhost:8000/cache/status')
print('Cache:', r.json())

# Run multiple times to see if it speeds up
for i in range(3):
    t0 = time.time()
    r = requests.post('http://localhost:8000/depot/schedule', json={'date':'2024-01-15','n_vehicles':500,'enable_v2g':False})
    ms = round((time.time()-t0)*1000)
    d = r.json()
    print('Run {}: API={}ms, Solver={:.0f}ms'.format(i+1, ms, d['managed']['solve_time_ms']))
    time.sleep(1)