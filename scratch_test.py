from backend.database import SessionLocal
from backend.models import Plant, TelemetryLog
from backend.schemas import PlantTempUpdate
from backend.main import update_plant_temp

db = SessionLocal()
try:
    plant_id = 1
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    print(f"Original plant custom_temp: {plant.custom_temp}")
    
    # Update temperature to None (Auto mode)
    payload = PlantTempUpdate(custom_temp=None)
    update_plant_temp(plant_id, payload, db)
    
    # Refresh plant and query logs
    db.refresh(plant)
    print(f"Updated plant custom_temp: {plant.custom_temp}")
    
    logs = db.query(TelemetryLog).filter(TelemetryLog.plant_id == plant_id).order_by(TelemetryLog.timestamp.desc()).all()
    print(f"Number of logs after clear override: {len(logs)}")
    for idx, log in enumerate(logs[:5]):
        print(f"[{idx}] Timestamp: {log.timestamp}, Temp: {log.temperature}°C, Moisture: {log.soil_moisture}%")

finally:
    db.close()
