import datetime
from backend.telemetry_simulator import fetch_historical_weather, LATITUDE, LONGITUDE

history = fetch_historical_weather(LATITUDE, LONGITUDE, past_days=1)
if history:
    print(f"Successfully fetched {len(history)} historical weather hours.")
    # Print first 5 keys
    first_keys = list(history.keys())[:5]
    print(f"First 5 keys: {first_keys}")
    
    # Print current UTC hour key
    now_utc = datetime.datetime.utcnow()
    key_utc = now_utc.strftime("%Y-%m-%d %H")
    print(f"Current UTC hour key: {key_utc} | Match: {key_utc in history}")
    
    # Print current local hour key
    now_local = datetime.datetime.now()
    key_local = now_local.strftime("%Y-%m-%d %H")
    print(f"Current Local hour key: {key_local} | Match: {key_local in history}")
else:
    print("Failed to fetch historical weather.")
