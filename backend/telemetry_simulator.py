import math
import random
import datetime
import urllib.request
import json
import socket
from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from .models import Plant, TelemetryLog, CareLog

# Simulation Parameters & fallbacks
TEMP_BASE = 22.0       # Standard room temperature base
TEMP_AMP = 3.5         # Amplitude of daily temp swing
MAX_LIGHT = 1200.0     # Peak lux at noon

# Kitchener, ON, Canada Location Coordinates
LATITUDE = 43.4504
LONGITUDE = -80.4928

# Decay Rates (% moisture drop per day)
DECAY_RATES = {
    "Monstera Deliciosa": 10.0,
    "Fiddle Leaf Fig": 8.0,
    "Rubber Plant (Ficus Elastica)": 9.0,
    "Snake Plant (Sansevieria Trifasciata)": 5.0,
    "Pothos (Epipremnum Aureum)": 11.0,
    "Spider Plant (Chlorophytum Comosum)": 9.0,
    "Peace Lily (Spathiphyllum)": 15.0,
    "Aloe Vera (Aloe Barbadensis)": 4.5,
    "ZZ Plant (Zamioculcas Zamiifolia)": 4.5,
    "Chinese Evergreen (Aglaonema)": 8.5,
    "Boston Fern (Nephrolepis Exaltata)": 18.0,
    "Cast Iron Plant (Aspidistra Elatior)": 7.5,
    "Jade Plant (Crassula Ovata)": 5.0,
    "English Ivy (Hedera Helix)": 12.0,
    "Prayer Plant (Maranta Leuconeura)": 14.0
}


def fetch_live_weather(lat: float = LATITUDE, lon: float = LONGITUDE):
    """
    Fetches current weather from Open-Meteo.
    Returns: (temperature_2m, shortwave_radiation, is_day) or None if error/blocked.
    Uses native urllib to minimize external library dependencies.
    """
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,is_day,shortwave_radiation"
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'SmartPlantCareSimulator/1.0'}
        )
        with urllib.request.urlopen(req, timeout=3.0) as response:
            data = json.loads(response.read().decode())
            current = data.get("current", {})
            temp = current.get("temperature_2m")
            rad = current.get("shortwave_radiation")
            is_day = current.get("is_day")
            if temp is not None and rad is not None:
                return float(temp), float(rad), int(is_day)
    except Exception as e:
        print(f"⚠️ Live Weather API fetch failed (offline/sandboxed): {e}")
    return None

def fetch_historical_weather(lat: float = LATITUDE, lon: float = LONGITUDE, past_days: int = 1):
    """
    Fetches past hourly weather from Open-Meteo.
    Returns: dict mapping ISO string timestamp to (temp, radiation) or None if error/blocked.
    """
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,shortwave_radiation&past_days={past_days}"
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'SmartPlantCareSimulator/1.0'}
        )
        with urllib.request.urlopen(req, timeout=4.0) as response:
            data = json.loads(response.read().decode())
            hourly = data.get("hourly", {})
            times = hourly.get("time", [])
            temps = hourly.get("temperature_2m", [])
            rads = hourly.get("shortwave_radiation", [])
            
            history = {}
            for t, temp, rad in zip(times, temps, rads):
                try:
                    dt = datetime.datetime.strptime(t, "%Y-%m-%dT%H:%M")
                    history[dt.strftime("%Y-%m-%d %H")] = (float(temp), float(rad))
                except ValueError:
                    continue
            return history
    except Exception as e:
        print(f"⚠️ Historical Weather API fetch failed (offline/sandboxed): {e}")
    return None

def calculate_sensor_values(plant_species: str, hours_since_water: float, current_time: datetime.datetime, ext_temp: float = None, ext_radiation: float = None, custom_temp: float = None, pot_size: str = None, potting_mix: str = None, light_condition: str = None):
    """
    Mathematical simulator for environmental sensors.
    1. Soil Moisture: Exponential/linear decay since last water event.
       Decay rate is modified dynamically based on:
         - Pot Size: Smaller pots dry out faster. Larger pots retain water.
         - Potting Mix: Sandy/bark mix dries out fast. Clay/dense soil retains water.
         - Sunlight: Shady spots slow transpiration. Direct sun accelerates evaporation.
    2. Temperature: Dynamic indoor thermostat override or outdoor weather calculation.
    3. Light: Windowsill solar level (1 W/m² ≈ 40 Lux windowsill shade).
    """
    # 1. Soil Moisture Calculation
    decay_rate = 9.0
    for key, rate in DECAY_RATES.items():
        if key.lower() in plant_species.lower() or plant_species.lower() in key.lower():
            decay_rate = rate
            break
            
    # Pot size factor
    if pot_size:
        size_clean = pot_size.replace('"', '').strip()
        if '4' in size_clean:
            decay_rate *= 1.35   # small pot holds little soil, dries out fast
        elif '6' in size_clean:
            decay_rate *= 1.10
        elif '8' in size_clean:
            decay_rate *= 1.00   # standard/baseline
        elif '10' in size_clean:
            decay_rate *= 0.85
        elif '12' in size_clean:
            decay_rate *= 0.75   # large soil volume retains water
        elif '14' in size_clean or '+' in size_clean:
            decay_rate *= 0.65

    # Potting mix factor
    if potting_mix:
        mix_lower = potting_mix.lower()
        if "succulent" in mix_lower or "cactus" in mix_lower:
            decay_rate *= 1.35   # highly porous, dries very quickly
        elif "orchid" in mix_lower or "bark" in mix_lower:
            decay_rate *= 1.45   # coarse bark dries out extremely fast
        elif "aroid" in mix_lower or "aerated" in mix_lower:
            decay_rate *= 1.20   # chunky soil, well-draining
        elif "peat" in mix_lower:
            decay_rate *= 0.90   # peat moss holds water
        elif "nursery" in mix_lower:
            decay_rate *= 0.75   # dense nursery soil holds moisture long

    # Light condition factor
    if light_condition:
        light_lower = light_condition.lower()
        if "shade" in light_lower and "part" not in light_lower:
            decay_rate *= 0.70   # minimal transpiration in shadow
        elif "part" in light_lower:
            decay_rate *= 0.90
        elif "indirect" in light_lower:
            decay_rate *= 1.00   # standard
        elif "direct" in light_lower:
            decay_rate *= 1.45   # hot direct sun accelerates drying

    decay_rate_per_hour = decay_rate / 24.0
    moisture = 100.0 - (hours_since_water * decay_rate_per_hour)
    # Add a bit of random transpiration fluctuation
    moisture += random.uniform(-1.5, 1.5)
    moisture = max(0.0, min(100.0, moisture))
    
    # 2. Temperature Calculation
    noise = random.uniform(-0.15, 0.15)
    if custom_temp is not None:
        temp = custom_temp + noise
    elif ext_temp is not None:
        temp = ext_temp + noise
    else:
        # Offline fallback: daily sine wave peaking at 3 PM (hour 15) ranging from 10°C to 25°C
        hour = current_time.hour + (current_time.minute / 60.0)
        ext_temp_fallback = 17.5 + 7.5 * math.sin(math.pi * (hour - 9) / 12)
        temp = ext_temp_fallback + noise
        
    # 3. Light Level Calculation (Lux)
    if ext_radiation is not None:
        # Windowsill solar lux: 1 W/m² = 40 Lux (shaded interior windows)
        light = ext_radiation * 40.0
        light += random.uniform(-50, 50)
        light = max(0.0, light)
    else:
        # Parabolic solar curve active between 06:00 and 20:00 (14 hours of light)
        hour = current_time.hour + (current_time.minute / 60.0)
        if 6.0 <= hour <= 20.0:
            # Scale to 0 to pi range over the 14-hour photoperiod
            solar_angle = math.pi * (hour - 6.0) / 14.0
            light = MAX_LIGHT * math.sin(solar_angle)
            light += random.uniform(-50, 50)
            light = max(0.0, light)
        else:
            light = 0.0
            
    return round(moisture, 2), round(temp, 2), round(light, 2)


def generate_historical_data(db: Session, plant: Plant, hours_to_simulate: int = 24):
    """
    Populates historical telemetry data backwards from now to simulate rolling logs.
    Essential to give the frontend charts data immediately.
    """
    print(f"Generating {hours_to_simulate} hours of historical telemetry for '{plant.name}' ({plant.species})...")
    
    # Get all watering logs for the plant ordered by date_completed desc to lookup correct timelines
    watering_logs = db.query(CareLog).filter(
        CareLog.plant_id == plant.id,
        CareLog.care_type == "Watering"
    ).order_by(CareLog.date_completed.desc()).all()
    
    now = datetime.datetime.utcnow()
    
    # Try fetching historical weather curves for Kitchener
    history_weather = fetch_historical_weather(LATITUDE, LONGITUDE, past_days=1)
    if history_weather:
        print("📡 Weather API: Connected | Kitchener, ON (Retrieved rolling historical curves)")
    else:
        print("⚠️ Weather API: Offline | Using simulated sandbox fallback curves")
        
    inserted_logs = 0
    # Simulate step-by-step back in time (include 0 to get the telemetry log for exactly 'now')
    for i in range(hours_to_simulate, -1, -1):
        sim_time = now - datetime.timedelta(hours=i)
        
        # Find the latest watering log that happened before or at sim_time
        last_water = None
        for log in watering_logs:
            if log.date_completed <= sim_time:
                last_water = log
                break
                
        if last_water:
            water_time = last_water.date_completed
        else:
            # Estimate previous watering timeline based on intervals if no records prior to sim_time exist
            if watering_logs:
                earliest_water = watering_logs[-1].date_completed
                estimated_prev = earliest_water - datetime.timedelta(days=plant.watering_interval_days)
                while estimated_prev > sim_time:
                    estimated_prev -= datetime.timedelta(days=plant.watering_interval_days)
                water_time = estimated_prev
            else:
                water_time = sim_time - datetime.timedelta(days=7)
        
        # Calculate hours since last water at that specific simulated timestamp
        time_delta = sim_time - water_time
        hours_since_water = max(0.0, time_delta.total_seconds() / 3600.0)
        
        # Match weather step
        ext_temp, ext_rad = None, None
        if history_weather:
            key = sim_time.strftime("%Y-%m-%d %H")
            match = history_weather.get(key)
            if match:
                ext_temp, ext_rad = match
                
        moisture, temp, light = calculate_sensor_values(
            plant.species, 
            hours_since_water, 
            sim_time, 
            ext_temp=ext_temp, 
            ext_radiation=ext_rad,
            custom_temp=plant.custom_temp,
            pot_size=plant.pot_size,
            potting_mix=plant.potting_mix,
            light_condition=plant.light_condition
        )

        
        log = TelemetryLog(
            plant_id=plant.id,
            soil_moisture=moisture,
            temperature=temp,
            light_level=light,
            timestamp=sim_time
        )
        db.add(log)
        inserted_logs += 1
        
    db.commit()
    print(f"✅ Generated {inserted_logs} historical logs.")


def run_anomaly_detection(db: Session, plant: Plant, current_moisture: float):
    """
    Agentic Anomaly Detector: Analyzes current environmental values and
    autonomously updates plant state flags.
    """
    print(f"🤖 Running anomaly detection for '{plant.name}' (Moisture: {current_moisture}%)...")
    
    old_status = plant.status
    if current_moisture < 20.0:
        new_status = "Critical"
    elif current_moisture < 40.0:
        new_status = "Needs Water"
    else:
        new_status = "Healthy"
        
    if old_status != new_status:
        plant.status = new_status
        db.commit()
        print(f" 🚨 STATUS CHANGE: '{plant.name}' status shifted from '{old_status}' to '{new_status}'!")
    else:
        print(f" ✅ '{plant.name}' remains in '{old_status}' state.")


def simulate_live_tick():
    """
    Simulates a live hourly 'tick' reading for all plants.
    Calculates current stats, writes to DB, and runs anomaly checks.
    """
    print("\n" + "=" * 60)
    print("🌡️ TELEMETRY SIMULATION LIVE TICK")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        plants = db.query(Plant).all()
        now = datetime.datetime.utcnow()
        
        # Try fetching live outdoor weather for Kitchener, ON
        live_weather = fetch_live_weather(LATITUDE, LONGITUDE)
        ext_temp, ext_rad = None, None
        if live_weather:
            ext_temp, ext_rad, is_day = live_weather
            print(f"📡 Weather API: Connected | Kitchener, ON (Outdoor Temp: {ext_temp}°C, Radiation: {ext_rad} W/m²)")
        else:
            print("⚠️ Weather API: Offline | Using simulated sandbox fallback curves")
            
        for plant in plants:
            # Check if plant has telemetry logs; if empty, initialize historical logs
            log_count = db.query(TelemetryLog).filter(TelemetryLog.plant_id == plant.id).count()
            if log_count == 0:
                generate_historical_data(db, plant, hours_to_simulate=24)
                
            # Compute current sensor tick values
            last_watering = db.query(CareLog).filter(
                CareLog.plant_id == plant.id,
                CareLog.care_type == "Watering"
            ).order_by(CareLog.date_completed.desc()).first()
            
            water_time = last_watering.date_completed if last_watering else now
            hours_since_water = max(0.0, (now - water_time).total_seconds() / 3600.0)
            
            moisture, temp, light = calculate_sensor_values(
                plant.species, 
                hours_since_water, 
                now, 
                ext_temp=ext_temp, 
                ext_radiation=ext_rad,
                custom_temp=plant.custom_temp,
                pot_size=plant.pot_size,
                potting_mix=plant.potting_mix,
                light_condition=plant.light_condition
            )

            
            # Save new log
            new_log = TelemetryLog(
                plant_id=plant.id,
                soil_moisture=moisture,
                temperature=temp,
                light_level=light,
                timestamp=now
            )
            db.add(new_log)
            db.commit()
            
            conn_status = "Live API" if live_weather else "Simulated"
            print(f"📡 Saved live telemetry -> {plant.name} | Moisture: {moisture}% | Temp: {temp}°C | Light: {light} lx | Status: {conn_status}")
            
            # Execute automated anomaly checks
            run_anomaly_detection(db, plant, moisture)
            
        print("-" * 50)
        
    except Exception as e:
        print(f"❌ Error during telemetry simulation tick: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    simulate_live_tick()

