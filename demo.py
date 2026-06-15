import argparse
import time
import requests
import sys

def main():
    parser = argparse.ArgumentParser(description="GridPilot Terminal Demo")
    parser.add_argument('-v', '--vehicles', type=int, default=600, help='Number of vehicles in the depot (default: 600)')
    parser.add_argument('-d', '--date', type=str, default='2024-01-15', help='Date for the simulation (default: 2024-01-15)')
    parser.add_argument('--v2g', action='store_true', help='Enable Vehicle-to-Grid (V2G) optimization')
    parser.add_argument('--port', type=int, default=8000, help='API Port (default: 8000)')

    args = parser.parse_args()

    url = f'http://localhost:{args.port}/depot/schedule'
    payload = {
        'date': args.date,
        'n_vehicles': args.vehicles,
        'enable_v2g': args.v2g
    }

    print("======================================================")
    print(" GridPilot AI Charging Orchestration - Terminal Demo")
    print("======================================================")
    print(f"Target:       Corporate EV Fleet Depot, Gurugram")
    print(f"Date:         {args.date}")
    print(f"Vehicles:     {args.vehicles} (Tata Nexon EV, 7.4 kW)")
    print(f"V2G Enabled:  {'Yes' if args.v2g else 'No'}")
    print("------------------------------------------------------")
    print("Sending optimization request to GridPilot Engine...")
    
    t0 = time.time()
    try:
        r = requests.post(url, json=payload)
        r.raise_for_status()
    except requests.exceptions.ConnectionError:
        print(f"\n[ERROR] Connection failed. Is the API running on port {args.port}?")
        print("Please start the backend server using 'python api/main.py' or 'uvicorn api.main:app --reload'")
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"\n[ERROR] Request failed: {e}")
        sys.exit(1)

    ms = round((time.time() - t0) * 1000)
    data = r.json()

    c = data.get('comparison') or data.get('depot', {}).get('schedule_summary', {}).get('comparison', {})
    
    if not c:
        print("[ERROR] Invalid response format from the server.")
        sys.exit(1)

    carbon_saved = (c.get('unmanaged_carbon_kg', 0) - c.get('scheduled_carbon_kg', 0))
    managed = data.get('managed', {})
    fleet = managed.get('fleet_summary', {})

    print(f"\nOptimization complete in {ms}ms (Solver: {managed.get('solve_time_ms', 0)}ms)")
    print("------------------------------------------------------")
    print("=== OPTIMIZATION RESULTS ===")
    print(f"Status:             {managed.get('status', 'UNKNOWN')}")
    print(f"Peak Reduction:     {c.get('peak_reduction_pct', 0):.1f}%")
    print(f"Unmanaged Peak:     {c.get('unmanaged_peak_kw', 0):,.0f} kW")
    print(f"Managed Peak:       {c.get('scheduled_peak_kw', 0):,.0f} kW")
    print(f"DVVNL Saving:       Rs {c.get('dvvnl_monthly_saving_inr', 0)/100000:.2f}L/month")
    print(f"Carbon Saved:       {carbon_saved:.0f} kg CO2/night")
    print(f"All Ready 07:00:    {fleet.get('all_ready_on_time', 'UNKNOWN')}")
    print(f"Total Energy:       {managed.get('total_energy_kwh', 0):,.0f} kWh")
    print("======================================================")

if __name__ == '__main__':
    main()
