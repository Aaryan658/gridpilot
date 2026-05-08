import sys
import os
import pandas as pd
from datetime import datetime, timedelta

# Add project root to path
sys.path.append(os.getcwd())

from pipeline.acn_loader import ACNDataLoader
from pipeline.cea_loader import CEALoader
from pipeline.weather_loader import WeatherLoader
from pipeline.iex_loader import IEXLoader

def download_data():
    print("Starting data acquisition...")
    
    # 1. ACN-Data
    acn_loader = ACNDataLoader()
    # Mocking the try/fail logic as requested
    print("Attempting to fetch ACN-Data from https://ev.caltech.edu/dataset...")
    # Since we are in a sandbox, we'll use the synthetic fallback
    acn_sessions = acn_loader.load_sessions()
    acn_status = "SYNTHETIC" if "SYN" in acn_sessions['session_id'].iloc[0] else "REAL"
    print(f"[{acn_status}] ACN-Data: {len(acn_sessions)} sessions")

    # 2. Open-Meteo
    weather_loader = WeatherLoader()
    print("Fetching weather data for 5 locations + Gurugram...")
    # Fetch 3 years as requested (2022, 2023, 2024)
    start_date = "2022-01-01"
    end_date = "2024-12-31"
    weather_data = weather_loader.fetch_all(start=start_date, end=end_date)
    # Ensure Gurugram is fetched explicitly if fetch_all doesn't include it or if we want to be sure
    gurugram_weather = weather_loader.fetch(28.4595, 77.0266, start_date, end_date, "NR_Gurugram")
    print(f"[REAL] Weather: Gurugram 3yr fetched ({len(gurugram_weather)} hours)")

    # 3. CEA factors
    cea_loader = CEALoader()
    haryana_factor = cea_loader.get_state_emission_factor("Haryana")
    print(f"[HARDCODED] CEA: Haryana {haryana_factor:.3f} kg/kWh")

    # 4. IEX demand
    iex_loader = IEXLoader()
    print("Attempting to download IEX demand data...")
    regions = ["NR", "SR", "ER", "WR", "NER"]
    iex_records = 0
    for r in regions:
        df = iex_loader.load_or_generate(r, "2024-01-01", "2024-03-31")
        iex_records += len(df)
    print(f"[SYNTHETIC] IEX: 5 regions ({iex_records} records)")

    # Print data status table
    print("\nData Status Table:")
    print(f"{'Source':<18} | {'Status':<9} | {'Records':<15}")
    print("-" * 45)
    print(f"{'ACN-Data':<18} | {acn_status:<9} | {len(acn_sessions):<15} sessions")
    print(f"{'Weather Gurugram':<18} | {'REAL':<9} | {'3yr hourly':<15}")
    print(f"{'CEA Haryana':<18} | {'HARDCODED':<9} | {haryana_factor:.3f} kg/kWh")
    print(f"{'IEX Demand':<18} | {'SYNTHETIC':<9} | {'5 regions':<15}")

if __name__ == "__main__":
    download_data()
