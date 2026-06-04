import datetime
import os
import json
import urllib.request
import urllib.parse
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, status, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Load environment variables manually from backend/.env if it exists
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                parts = line.split("=", 1)
                if len(parts) == 2:
                    os.environ[parts[0].strip()] = parts[1].strip()

from backend.database import get_db, SessionLocal
from backend.models import Plant, TelemetryLog, CareLog, TreatmentSchedule, DiagnosticScan
from backend.schemas import (
    PlantCreate,
    PlantRead, 
    PlantDetail, 
    TelemetryLogRead, 
    TelemetryLogCreate,
    CareLogRead, 
    TreatmentScheduleRead, 
    TreatmentScheduleUpdate,
    DiagnosisResponse,
    PlantTempUpdate,
    DashboardTask,
    PlantUpdate,
    CareLogCreate,
    DiagnosticScanRead,
    DiagnosticScanCreate,
    DiagnosisTaskResponse
)
from backend.telemetry_simulator import simulate_live_tick, run_anomaly_detection, generate_historical_data
from backend.diagnostics import diagnose_plant_image
import uuid
from fastapi.staticfiles import StaticFiles

PERENUAL_API_KEY = os.environ.get("PERENUAL_API_KEY")

LOCAL_PLANT_DATABASE = [
    {"id": -1, "common_name": "Monstera", "scientific_name": ["Monstera Deliciosa"], "watering": "Average", "watering_interval_days": 7, "image_url": "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=400", "sunlight": ["Full Indirect Sun", "Part Shade"]},
    {"id": -2, "common_name": "Fiddle Leaf Fig", "scientific_name": ["Ficus Lyrata"], "watering": "Average", "watering_interval_days": 10, "image_url": "https://images.unsplash.com/photo-1597055181300-e3633a207518?auto=format&fit=crop&q=80&w=400", "sunlight": ["Full Indirect Sun", "Part Shade"]},
    {"id": -3, "common_name": "Snake Plant", "scientific_name": ["Sansevieria Trifasciata"], "watering": "Minimum", "watering_interval_days": 14, "image_url": "https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&q=80&w=400", "sunlight": ["Full Direct Sun", "Full Indirect Sun"]},
    {"id": -4, "common_name": "Pothos", "scientific_name": ["Epipremnum Aureum"], "watering": "Average", "watering_interval_days": 7, "image_url": "https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&q=80&w=400", "sunlight": ["Full Indirect Sun", "Shade"]},
    {"id": -5, "common_name": "Spider Plant", "scientific_name": ["Chlorophytum Comosum"], "watering": "Average", "watering_interval_days": 7, "image_url": "https://images.unsplash.com/photo-1572656631137-7935297eff55?auto=format&fit=crop&q=80&w=400", "sunlight": ["Full Indirect Sun", "Part Shade"]},
    {"id": -6, "common_name": "Peace Lily", "scientific_name": ["Spathiphyllum"], "watering": "Frequent", "watering_interval_days": 5, "image_url": "https://images.unsplash.com/photo-1593696140826-c58b021acf8b?auto=format&fit=crop&q=80&w=400", "sunlight": ["Shade", "Part Shade"]},
    {"id": -7, "common_name": "Rubber Plant", "scientific_name": ["Ficus Elastica"], "watering": "Average", "watering_interval_days": 9, "image_url": "https://images.unsplash.com/photo-1598880940080-ff9a29891b85?auto=format&fit=crop&q=80&w=400", "sunlight": ["Full Indirect Sun", "Part Shade"]},
    {"id": -8, "common_name": "Aloe Vera", "scientific_name": ["Aloe Barbadensis"], "watering": "Minimum", "watering_interval_days": 14, "image_url": "https://images.unsplash.com/photo-159647610065-ef72a229a43a?auto=format&fit=crop&q=80&w=400", "sunlight": ["Full Direct Sun"]},
    {"id": -9, "common_name": "ZZ Plant", "scientific_name": ["Zamioculcas Zamiifolia"], "watering": "Minimum", "watering_interval_days": 14, "image_url": "https://images.unsplash.com/photo-1632207691143-643e2a9a9361?auto=format&fit=crop&q=80&w=400", "sunlight": ["Shade", "Part Shade", "Full Indirect Sun"]},
    {"id": -10, "common_name": "Chinese Evergreen", "scientific_name": ["Aglaonema"], "watering": "Average", "watering_interval_days": 9, "image_url": "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&q=80&w=400", "sunlight": ["Shade", "Part Shade"]},
    {"id": -11, "common_name": "Boston Fern", "scientific_name": ["Nephrolepis Exaltata"], "watering": "Frequent", "watering_interval_days": 4, "image_url": "https://images.unsplash.com/photo-1545167622-3a6ac756afa4?auto=format&fit=crop&q=80&w=400", "sunlight": ["Part Shade", "Full Indirect Sun"]},
    {"id": -12, "common_name": "Cast Iron Plant", "scientific_name": ["Aspidistra Elatior"], "watering": "Average", "watering_interval_days": 10, "image_url": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=400", "sunlight": ["Shade", "Part Shade"]},
    {"id": -13, "common_name": "Jade Plant", "scientific_name": ["Crassula Ovata"], "watering": "Minimum", "watering_interval_days": 14, "image_url": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=400", "sunlight": ["Full Direct Sun"]},
    {"id": -14, "common_name": "English Ivy", "scientific_name": ["Hedera Helix"], "watering": "Average", "watering_interval_days": 6, "image_url": "https://images.unsplash.com/photo-1534067783941-51c9c23eccfd?auto=format&fit=crop&q=80&w=400", "sunlight": ["Full Indirect Sun", "Part Shade"]},
    {"id": -15, "common_name": "Prayer Plant", "scientific_name": ["Maranta Leuconeura"], "watering": "Frequent", "watering_interval_days": 5, "image_url": "https://images.unsplash.com/photo-1545167622-3a6ac756afa4?auto=format&fit=crop&q=80&w=400", "sunlight": ["Part Shade", "Full Indirect Sun"]}
]


app = FastAPI(
    title="Smart Plant Care App API",
    description="IoT and AI-powered telemetry and diagnostics portal for household plants.",
    version="1.0.0"
)

# Configure CORS (Cross-Origin Resource Sharing)
# Allows our Vite React client (running on http://localhost:5173 or similar) to make requests to the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development, allowing all origins is highly robust
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the static directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(os.path.join(static_dir, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


class TelemetrySocketManager:
    """
    Manages active WebSocket connections for pushing real-time telemetry broadcasts
    directly to frontend React clients whenever new sensor readings arrive.
    """
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"🔌 WebSocket Connected: Total active streams = {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"🔌 WebSocket Disconnected: Total active streams = {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Silently prune stale connections
                pass


ws_manager = TelemetrySocketManager()


@app.websocket("/api/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Maintain the connection alive by waiting for client messages/keepalives
            data = await websocket.receive_text()
            # Echo back keepalives if needed
            await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"⚠️ WebSocket error: {e}")
        ws_manager.disconnect(websocket)


def populate_calculated_fields(plant: Plant, db: Session) -> Plant:
    """
    Helper function to dynamically calculate sensor metrics and next water dates
    and inject them into the ORM object fields expected by the PlantRead schema.
    """
    # 1. Fetch latest telemetry log for soil moisture, temp, and light
    latest_telemetry = db.query(TelemetryLog).filter(
        TelemetryLog.plant_id == plant.id
    ).order_by(TelemetryLog.timestamp.desc()).first()
    
    if latest_telemetry:
        plant.latest_moisture = latest_telemetry.soil_moisture
        plant.latest_temperature = latest_telemetry.temperature
        plant.latest_light_level = latest_telemetry.light_level
    else:
        plant.latest_moisture = None
        plant.latest_temperature = None
        plant.latest_light_level = None

    # 2. Fetch latest watering care log to compute next schedule date
    latest_watering = db.query(CareLog).filter(
        CareLog.plant_id == plant.id,
        CareLog.care_type == "Watering"
    ).order_by(CareLog.date_completed.desc()).first()
    
    base_date = latest_watering.date_completed if latest_watering else plant.date_added
    if base_date:
        plant.next_watering_date = (base_date + datetime.timedelta(days=plant.watering_interval_days)).date()
    else:
        plant.next_watering_date = None
        
    return plant


# --- API Routes ---

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the Smart Plant Care App API. Go to /docs for Swagger documentation."
    }


@app.get("/api/plants", response_model=List[PlantRead])
def get_all_plants(db: Session = Depends(get_db)):
    """
    Returns list of all registered plants in the dashboard, complete with their
    latest computed telemetry logs and calculated next watering schedule dates.
    """
    plants = db.query(Plant).all()
    for plant in plants:
        populate_calculated_fields(plant, db)
    return plants


@app.get("/api/dashboard/tasks", response_model=List[DashboardTask])
def get_dashboard_tasks(db: Session = Depends(get_db)):
    """
    Consolidates and serves all outstanding care and treatment tasks across all plants.
    - Moisture < 20% -> 'critical' watering task (unless snoozed)
    - Moisture < 40% -> 'warning' watering task (unless snoozed)
    - Incomplete AI treatment schedule -> 'info' or 'warning' treatment task
    """
    tasks = []
    plants = db.query(Plant).all()
    now = datetime.datetime.utcnow()
    
    def summarize_action(action_str: str) -> str:
        words = action_str.split()
        if len(words) <= 15:
            return action_str
        return " ".join(words[:14]) + "..."
    
    for plant in plants:
        populate_calculated_fields(plant, db)
        
        # Check if plant is currently snoozed
        is_snoozed = False
        if plant.snoozed_until:
            if plant.snoozed_until > now:
                is_snoozed = True
        
        # 1. Add Moisture Alert / Watering Tasks (only if not snoozed)
        if not is_snoozed and plant.latest_moisture is not None:
            if plant.latest_moisture < 20.0:
                tasks.append(DashboardTask(
                    id=f"water-{plant.id}",
                    task_type="water",
                    plant_id=plant.id,
                    plant_name=plant.name,
                    plant_species=plant.species,
                    action=summarize_action(f"Water {plant.name} (Critical Dehydration)"),
                    severity="critical"
                ))
            elif plant.latest_moisture < 40.0:
                tasks.append(DashboardTask(
                    id=f"water-{plant.id}",
                    task_type="water",
                    plant_id=plant.id,
                    plant_name=plant.name,
                    plant_species=plant.species,
                    action=summarize_action(f"Water {plant.name}"),
                    severity="warning"
                ))
                
        # 2. Add AI Pathological Treatment Tasks
        schedules = db.query(TreatmentSchedule).filter(
            TreatmentSchedule.plant_id == plant.id,
            TreatmentSchedule.is_completed == False
        ).all()
        
        for s in schedules:
            sev = "warning" if plant.status == "Critical" else "info"
            tasks.append(DashboardTask(
                id=f"treatment-{s.id}",
                task_type="treatment",
                plant_id=plant.id,
                plant_name=plant.name,
                plant_species=plant.species,
                action=summarize_action(s.action),
                severity=sev,
                target_id=s.id,
                scheduled_date=s.scheduled_date
            ))
            
    # Sort tasks by severity: critical first, then warning, then info
    severity_map = {"critical": 0, "warning": 1, "info": 2}
    tasks.sort(key=lambda t: (severity_map.get(t.severity, 2), t.plant_name))
    return tasks


@app.get("/api/plants/database-search")
def search_plant_database(q: str):
    """
    Proxies search request to the Perenual API.
    If the API key is missing or invalid, or the request fails,
    it falls back to a curated offline list of popular plants using fuzzy matching.
    """
    if not q or not q.strip():
        return {"data": []}

    query_str = q.strip().lower()

    # Local fallback fuzzy matching helper
    def get_local_matches():
        import difflib
        results = []
        for item in LOCAL_PLANT_DATABASE:
            c_name = item["common_name"].lower()
            sci_names = [s.lower() for s in item["scientific_name"]]
            
            # Direct match or prefix gets maximum score
            if query_str in c_name or any(query_str in sc for sc in sci_names):
                score = 1.0
            else:
                score = difflib.SequenceMatcher(None, query_str, c_name).ratio()
                for sc in sci_names:
                    score = max(score, difflib.SequenceMatcher(None, query_str, sc).ratio())
            
            if score > 0.45:
                results.append((score, {
                    "id": item["id"],
                    "common_name": item["common_name"],
                    "scientific_name": item["scientific_name"],
                    "image_url": item.get("image_url")
                }))
        
        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results]

    # If API key is missing or runs in demo mode, fall back immediately to local database
    if not PERENUAL_API_KEY or PERENUAL_API_KEY.startswith("YOUR_") or PERENUAL_API_KEY == "":
        print("⚠️ Perenual API key missing. Using local curated plant database fallback (fuzzy search enabled).")
        return {"data": get_local_matches()}

    url = f"https://perenual.com/api/v2/species-list?key={PERENUAL_API_KEY}&q={urllib.parse.quote(query_str)}"
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'SmartPlantCareApp/1.0'}
        )
        with urllib.request.urlopen(req, timeout=5.0) as response:
            res_data = json.loads(response.read().decode())
            # Normalize Perenual response format so client always receives 'image_url' directly
            normalized = []
            for item in res_data.get("data", []):
                default_img = item.get("default_image")
                image_url = default_img.get("regular_url") if default_img else None
                normalized.append({
                    "id": item.get("id"),
                    "common_name": item.get("common_name"),
                    "scientific_name": item.get("scientific_name"),
                    "image_url": image_url
                })
            return {"data": normalized}
    except Exception as e:
        print(f"⚠️ Perenual API search failed ({e}). Falling back to local plant database.")
        return {"data": get_local_matches()}


@app.get("/api/plants/database-details/{species_id}")
def get_plant_database_details(species_id: int):
    """
    Retrieves care information for a specific species.
    If species_id is negative (local mockup ID) or the external API fails/is missing,
    it falls back to the curated offline data.
    """
    # 1. Check if it's a local mockup ID (negative numbers)
    if species_id < 0:
        for item in LOCAL_PLANT_DATABASE:
            if item["id"] == species_id:
                return {
                    "species_id": species_id,
                    "common_name": item["common_name"],
                    "scientific_name": item["scientific_name"][0] if item["scientific_name"] else item["common_name"],
                    "watering": item["watering"],
                    "watering_interval_days": item["watering_interval_days"],
                    "image_url": item.get("image_url"),
                    "sunlight": item.get("sunlight", ["Full Indirect Sun"])
                }
        raise HTTPException(status_code=404, detail="Mock species not found in local database")

    # 2. Check if API key is missing
    if not PERENUAL_API_KEY or PERENUAL_API_KEY.startswith("YOUR_") or PERENUAL_API_KEY == "":
        print("⚠️ Perenual API key missing. Unable to fetch details from live API.")
        raise HTTPException(status_code=400, detail="Perenual API key is not configured.")

    # 3. Live API request
    url = f"https://perenual.com/api/v2/species/details/{species_id}?key={PERENUAL_API_KEY}"
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'SmartPlantCareApp/1.0'}
        )
        with urllib.request.urlopen(req, timeout=5.0) as response:
            res_data = json.loads(response.read().decode())
            
            common_name = res_data.get("common_name", "Unknown Plant")
            sci_list = res_data.get("scientific_name", [])
            scientific_name = sci_list[0] if isinstance(sci_list, list) and sci_list else (sci_list if isinstance(sci_list, str) else common_name)
            
            watering = res_data.get("watering", "Average")
            
            # Map qualitative watering to numerical intervals
            watering_lower = watering.lower() if watering else "average"
            if any(w in watering_lower for w in ["frequent", "constant", "high"]):
                watering_interval_days = 3
            elif "average" in watering_lower:
                watering_interval_days = 7
            elif any(w in watering_lower for w in ["minimum", "low"]):
                watering_interval_days = 14
            elif "none" in watering_lower:
                watering_interval_days = 21
            else:
                watering_interval_days = 7
                
            default_img = res_data.get("default_image")
            image_url = default_img.get("regular_url") if default_img else None
            
            sunlight = res_data.get("sunlight", ["Full Indirect Sun"])
            if isinstance(sunlight, str):
                sunlight = [sunlight]

            return {
                "species_id": species_id,
                "common_name": common_name,
                "scientific_name": scientific_name,
                "watering": watering,
                "watering_interval_days": watering_interval_days,
                "image_url": image_url,
                "sunlight": sunlight
            }
    except Exception as e:
        print(f"⚠️ Perenual API details fetch failed: {e}. Defaulting to standard profile.")
        # Fall back to matching local mock plant if any, otherwise return a default
        for item in LOCAL_PLANT_DATABASE:
            if species_id == item["id"]:
                return {
                    "species_id": species_id,
                    "common_name": item["common_name"],
                    "scientific_name": item["scientific_name"][0],
                    "watering": item["watering"],
                    "watering_interval_days": item["watering_interval_days"],
                    "image_url": item.get("image_url"),
                    "sunlight": item.get("sunlight")
                }
        return {
            "species_id": species_id,
            "common_name": f"Species #{species_id}",
            "scientific_name": f"Species #{species_id}",
            "watering": "Average",
            "watering_interval_days": 7,
            "image_url": "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=400",
            "sunlight": ["Full Indirect Sun"]
        }


@app.post("/api/plants", response_model=PlantRead, status_code=status.HTTP_201_CREATED)
def create_new_plant(payload: PlantCreate, db: Session = Depends(get_db)):
    """
    Registers a new plant in the dashboard with detailed Planta onboarding questionnaire fields,
    adds a baseline watering log matching its physical history, and pre-generates 24 hours 
    of rolling physics-based telemetry logs.
    """
    now = datetime.datetime.utcnow()
    
    # 1. Create the plant with complete profile details
    plant = Plant(
        name=payload.name,
        species=payload.species,
        watering_interval_days=payload.watering_interval_days,
        date_added=now,
        status="Healthy",
        image_url=payload.image_url,
        last_watered_date=payload.last_watered_date,
        pot_size=payload.pot_size,
        pot_height=payload.pot_height,
        potting_mix=payload.potting_mix,
        location=payload.location,
        light_condition=payload.light_condition,
        maturity_stage=payload.maturity_stage,
        repotted_status=payload.repotted_status,
        propagation_methods=payload.propagation_methods,
        fertilizer_guideline=payload.fertilizer_guideline
    )
    db.add(plant)
    db.commit()
    db.refresh(plant)
    
    # 2. Add an initial watering event matching their questionnaire response
    # Defaults to 2 days ago if not supplied
    initial_water_time = payload.last_watered_date or (now - datetime.timedelta(days=2))
    care_log = CareLog(
        plant_id=plant.id,
        care_type="Watering",
        date_completed=initial_water_time
    )
    db.add(care_log)
    db.commit()
    
    # 3. Pre-generate the 24-hour historical telemetry log history
    try:
        generate_historical_data(db, plant, hours_to_simulate=24)
    except Exception as ex:
        print(f"⚠️ Warning: Pre-generating telemetry failed: {ex}")
        
    db.refresh(plant)
    populate_calculated_fields(plant, db)
    return plant


@app.post("/api/plants/upload-photo")
async def upload_photo(file: UploadFile = File(...)):
    """
    Accepts an uploaded image file, saves it securely to static/uploads, 
    and returns the local URL to access it.
    """
    ext = os.path.splitext(file.filename)[1]
    if not ext:
        ext = ".jpg"  # default
    filename = f"{uuid.uuid4().hex}{ext}"
    
    upload_dir = os.path.join(os.path.dirname(__file__), "static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    url = f"http://localhost:8000/static/uploads/{filename}"
    return {"url": url}


@app.put("/api/plants/{plant_id}", response_model=PlantRead)
def update_plant_specifications(plant_id: int, payload: PlantUpdate, db: Session = Depends(get_db)):
    """
    Updates general/physical specifications of a plant.
    If physical attributes governing transpiration (pot_size, potting_mix, light_condition, 
    watering_interval_days) change, we wipe existing historical telemetry logs and 
    regenerate them using the new physics-based transpiration decay equations instantly.
    """
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Plant with ID {plant_id} not found"
        )
        
    # Check if physical specs are changing
    specs_changed = False
    
    if payload.name is not None:
        plant.name = payload.name
    if payload.species is not None:
        if payload.species != plant.species:
            plant.species = payload.species
            specs_changed = True
    if payload.watering_interval_days is not None:
        if payload.watering_interval_days != plant.watering_interval_days:
            plant.watering_interval_days = payload.watering_interval_days
            specs_changed = True
    if payload.image_url is not None:
        plant.image_url = payload.image_url
    if payload.pot_size is not None:
        if payload.pot_size != plant.pot_size:
            plant.pot_size = payload.pot_size
            specs_changed = True
    if payload.pot_height is not None:
        plant.pot_height = payload.pot_height
    if payload.potting_mix is not None:
        if payload.potting_mix != plant.potting_mix:
            plant.potting_mix = payload.potting_mix
            specs_changed = True
    if payload.location is not None:
        plant.location = payload.location
    if payload.light_condition is not None:
        if payload.light_condition != plant.light_condition:
            plant.light_condition = payload.light_condition
            specs_changed = True
    if payload.maturity_stage is not None:
        plant.maturity_stage = payload.maturity_stage
    if payload.repotted_status is not None:
        plant.repotted_status = payload.repotted_status
    if payload.propagation_methods is not None:
        plant.propagation_methods = payload.propagation_methods
    if payload.fertilizer_guideline is not None:
        plant.fertilizer_guideline = payload.fertilizer_guideline

    db.commit()
    
    if specs_changed:
        # Physics Re-generation: Delete existing telemetry logs and rebuild
        db.query(TelemetryLog).filter(TelemetryLog.plant_id == plant_id).delete()
        db.commit()
        generate_historical_data(db, plant, hours_to_simulate=24)
        
    db.refresh(plant)
    populate_calculated_fields(plant, db)
    return plant


@app.delete("/api/plants/{plant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plant(plant_id: int, db: Session = Depends(get_db)):
    """
    Deletes a plant from the database along with all its historical telemetry logs,
    care log events, and AI treatment recovery schedules.
    """
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Plant with ID {plant_id} not found"
        )
    db.delete(plant)
    db.commit()
    return None



@app.put("/api/plants/{plant_id}/temp", response_model=PlantRead)
def update_plant_temp(plant_id: int, payload: PlantTempUpdate, db: Session = Depends(get_db)):
    """
    Sets or clears the custom indoor temperature override for a specific plant.
    If custom_temp is provided (e.g. float), sets the custom thermostat target.
    If custom_temp is None (or null), clears the override to re-engage dynamic weather calculations.
    To ensure the 24-hour time-series telemetry charts reflect the change instantly,
    re-generates the rolling historical telemetry based on the new temperature profile.
    """
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Plant with ID {plant_id} not found"
        )
    
    # 1. Update the database override field
    plant.custom_temp = payload.custom_temp
    db.commit()
    
    # 2. Delete existing telemetry history to rebuild it cleanly matching the new thermostat profile
    db.query(TelemetryLog).filter(TelemetryLog.plant_id == plant_id).delete()
    db.commit()
    
    # 3. Regenerate the historical 24-hour rolling logs based on the new climate setting
    generate_historical_data(db, plant, hours_to_simulate=24)
    
    db.refresh(plant)
    populate_calculated_fields(plant, db)
    return plant


@app.get("/api/plants/{plant_id}", response_model=PlantDetail)
def get_plant_details(plant_id: int, db: Session = Depends(get_db)):
    """
    Returns complete details of a single plant, including historical care logs,
    and structured AI recovery schedule events.
    """
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Plant with ID {plant_id} not found"
        )
    populate_calculated_fields(plant, db)
    return plant


@app.get("/api/plants/{plant_id}/telemetry", response_model=List[TelemetryLogRead])
def get_plant_telemetry_history(plant_id: int, db: Session = Depends(get_db)):
    """
    Returns the last 24 hours of telemetry log points for a specific plant.
    Sorted chronologically (timestamp ascending) to cleanly feed front-end line charts.
    """
    plant_exists = db.query(Plant).filter(Plant.id == plant_id).count() > 0
    if not plant_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Plant with ID {plant_id} not found"
        )
        
    logs = db.query(TelemetryLog).filter(
        TelemetryLog.plant_id == plant_id
    ).order_by(TelemetryLog.timestamp.desc()).limit(24).all()
    
    # Reverse to ensure chronological order (left-to-right on graphs)
    logs.reverse()
    return logs


@app.post("/api/plants/{plant_id}/telemetry", response_model=TelemetryLogRead)
async def add_plant_telemetry(plant_id: int, payload: TelemetryLogCreate, db: Session = Depends(get_db)):
    """
    Appends a live telemetry log point (moisture, temperature, light) for a specific plant.
    Typically triggered by smart home integrations (Google Nest, Home Assistant).
    Automatically evaluates plant health status based on new soil moisture values.
    Also includes:
    1. Autonomous watering surge detection (jump to >=90% from <50% soil moisture).
    2. Real-time WebSocket broadcasting to all active dashboard streams.
    """
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Plant with ID {plant_id} not found"
        )
        
    now = datetime.datetime.utcnow()
    
    # 1. Fetch latest prior telemetry record to check for watering surge
    latest_telemetry = db.query(TelemetryLog).filter(
        TelemetryLog.plant_id == plant_id
    ).order_by(TelemetryLog.timestamp.desc()).first()
    
    # Autonomous Watering surge trigger: moisture jump >= 90% from previously dry (< 50%)
    auto_watered = False
    if latest_telemetry and latest_telemetry.soil_moisture < 50.0 and payload.soil_moisture >= 90.0:
        care_log = CareLog(
            plant_id=plant_id,
            care_type="Watering",
            date_completed=now
        )
        db.add(care_log)
        auto_watered = True
        print(f"💧 Auto-Detection: Sudden soil moisture surge from {latest_telemetry.soil_moisture}% to {payload.soil_moisture}% on '{plant.name}'. Auto-logged a watering event!")
    
    # 2. Create a TelemetryLog
    telemetry_log = TelemetryLog(
        plant_id=plant_id,
        soil_moisture=payload.soil_moisture,
        temperature=payload.temperature,
        light_level=payload.light_level,
        timestamp=now
    )
    db.add(telemetry_log)
    
    # 3. Check and dynamically update plant health status based on new readings
    if payload.soil_moisture < 20.0:
        plant.status = "Critical"
    elif payload.soil_moisture < 40.0:
        plant.status = "Needs Water"
    else:
        plant.status = "Healthy"
        
    db.commit()
    db.refresh(telemetry_log)
    
    # 4. Broadcast live sensor updates to WebSocket clients in real-time
    await ws_manager.broadcast({
        "event_type": "telemetry_update",
        "plant_id": plant_id,
        "soil_moisture": payload.soil_moisture,
        "temperature": payload.temperature,
        "light_level": payload.light_level,
        "timestamp": now.isoformat(),
        "status": plant.status,
        "auto_watered": auto_watered
    })
    
    print(f"🔌 Integration Sync: Received sensor telemetry for '{plant.name}'. Moisture={payload.soil_moisture}%, Temp={payload.temperature}°C. Status marked {plant.status}.")
    return telemetry_log


@app.post("/api/plants/{plant_id}/water", response_model=CareLogRead)
def water_plant(plant_id: int, db: Session = Depends(get_db)):
    """
    Waters the plant. 
    1. Inserts a 'Watering' CareLog event.
    2. Inserts an immediate 100% moisture telemetry tick to update graphs in real-time.
    3. Triggers anomaly check to reset status flag to 'Healthy'.
    """
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Plant with ID {plant_id} not found"
        )
        
    now = datetime.datetime.utcnow()
    
    # 1. Create the Care Log entry
    care_log = CareLog(
        plant_id=plant_id,
        care_type="Watering",
        date_completed=now
    )
    db.add(care_log)
    
    # 2. Add an immediate 100% moisture telemetry event to reflect instantly on charts
    # Use the plant's latest logged temperature and light to preserve chart continuity and avoid sudden jumps
    latest_telemetry = db.query(TelemetryLog).filter(
        TelemetryLog.plant_id == plant_id
    ).order_by(TelemetryLog.timestamp.desc()).first()
    
    current_temp = latest_telemetry.temperature if latest_telemetry else 21.5
    current_light = latest_telemetry.light_level if latest_telemetry else 300.0
    
    telemetry_log = TelemetryLog(
        plant_id=plant_id,
        soil_moisture=100.0,
        temperature=current_temp,
        light_level=current_light,
        timestamp=now
    )
    db.add(telemetry_log)
    
    # 3. Reset plant status to Healthy
    plant.status = "Healthy"
    
    db.commit()
    db.refresh(care_log)
    
    print(f"💧 Live Event: User watered '{plant.name}'. Telemetry reset to 100% and status marked Healthy.")
    return care_log


@app.post("/api/plants/{plant_id}/snooze-water", response_model=PlantRead)
def snooze_watering(plant_id: int, snooze_days: int = 3, db: Session = Depends(get_db)):
    """
    Snoozes watering task for a specified duration (defaults to 3 days).
    1. Sets `snoozed_until` to `now + timedelta(days=snooze_days)`.
    2. Appends a `CareLog` event representing `"Soil Check (Wet)"`.
    3. Seeds a `TelemetryLog` with `65.0%` soil moisture. This instantly updates the moisture chart 
       and organically resolves the critical dehydration task since it's no longer below the 40% alert threshold.
    """
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Plant with ID {plant_id} not found"
        )
        
    now = datetime.datetime.utcnow()
    
    # 1. Update plant's `snoozed_until` column and status to Healthy
    plant.snoozed_until = now + datetime.timedelta(days=snooze_days)
    plant.status = "Healthy"
    
    # 2. Save a Care Log event representing "Soil Check (Wet)"
    care_log = CareLog(
        plant_id=plant_id,
        care_type="Soil Check (Wet)",
        date_completed=now
    )
    db.add(care_log)
    
    # 3. Seed an immediate TelemetryLog with 65.0% soil moisture
    latest_telemetry = db.query(TelemetryLog).filter(
        TelemetryLog.plant_id == plant_id
    ).order_by(TelemetryLog.timestamp.desc()).first()
    
    current_temp = latest_telemetry.temperature if latest_telemetry else 21.5
    current_light = latest_telemetry.light_level if latest_telemetry else 300.0
    
    telemetry_log = TelemetryLog(
        plant_id=plant_id,
        soil_moisture=65.0,
        temperature=current_temp,
        light_level=current_light,
        timestamp=now
    )
    db.add(telemetry_log)
    db.commit()
    
    db.refresh(plant)
    populate_calculated_fields(plant, db)
    return plant


@app.post("/api/plants/{plant_id}/care-log", response_model=CareLogRead)
def add_custom_care_log(plant_id: int, payload: CareLogCreate, db: Session = Depends(get_db)):
    """
    Appends a custom care log entry (e.g. "Fertilizing", "Repotting", "Pruning") to a plant's history.
    """
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Plant with ID {plant_id} not found"
        )
    now = datetime.datetime.utcnow()
    care_log = CareLog(
        plant_id=plant_id,
        care_type=payload.care_type,
        date_completed=now
    )
    db.add(care_log)
    db.commit()
    db.refresh(care_log)
    return care_log


async def run_background_diagnose(plant_id: int, image_bytes: Optional[bytes], mime_type: Optional[str]):
    """
    Asynchronous Thread-Safe Background Worker for executing leaf diagnostics.
    Runs completely outside of the main FastAPI thread request-response loop.
    1. Spawns its own isolated, thread-safe database session.
    2. Invokes the Gemini AI diagnostics engine.
    3. Persists the leaf diagnosis scan into the historical database.
    4. Broadcasts completion notifications in real-time over WebSockets.
    """
    print(f"⚡ Background Task Started: Commencing AI diagnostics for Plant ID {plant_id}...")
    
    # 1. Spawn a thread-safe local session connection (our separate database pen)
    db = SessionLocal()
    try:
        plant = db.query(Plant).filter(Plant.id == plant_id).first()
        if not plant:
            print(f"❌ Background Task Error: Plant ID {plant_id} not found.")
            return

        # 2. Invoke our AI diagnostics model logic
        diagnosis_result = diagnose_plant_image(
            db=db,
            plant_id=plant_id,
            image_bytes=image_bytes,
            mime_type=mime_type
        )
        
        # 3. Log diagnostic scan record permanently to SQLite
        scanned_img = plant.image_url or "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=400"
        scan_record = DiagnosticScan(
            plant_id=plant_id,
            diagnosed_issue=diagnosis_result["diagnosed_issue"],
            confidence_score=diagnosis_result["confidence_score"],
            short_summary=diagnosis_result["short_summary"],
            scanned_image_url=scanned_img,
            date_scanned=datetime.datetime.utcnow()
        )
        db.add(scan_record)
        db.commit()
        
        # 4. Broadcast the 'diagnosis_complete' message over WebSockets to trigger frontend UI updates
        await ws_manager.broadcast({
            "event_type": "diagnosis_complete",
            "plant_id": plant_id,
            "result": {
                "diagnosed_issue": diagnosis_result["diagnosed_issue"],
                "confidence_score": diagnosis_result["confidence_score"],
                "short_summary": diagnosis_result["short_summary"]
            }
        })
        print(f"⚡ Background Task Completed: WebSocket broadcast dispatched successfully for Plant '{plant.name}'.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Background Task Failed: Error processing diagnosis for Plant ID {plant_id}: {e}")
        # Broadcast failure status so the UI stops spinning and shows error
        await ws_manager.broadcast({
            "event_type": "diagnosis_failed",
            "plant_id": plant_id,
            "error": str(e)
        })
    finally:
        db.close()  # Put the database pen back! Essential to prevent connection leaks.


@app.post("/api/plants/{plant_id}/diagnose", response_model=DiagnosisTaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def diagnose_plant(
    plant_id: int, 
    background_tasks: BackgroundTasks, 
    file: Optional[UploadFile] = File(None), 
    db: Session = Depends(get_db)
):
    """
    AI Multimodal Diagnostic Engine. Accepts a leaf image file upload.
    Immediately schedules the AI analysis as a non-blocking background queue task,
    returning a 202 Accepted status instantly.
    """
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Plant with ID {plant_id} not found"
        )
        
    image_bytes = None
    mime_type = None
    
    if file:
        image_bytes = await file.read()
        mime_type = file.content_type
        print(f"📸 Image received for Plant ID {plant_id}. Queueing diagnosis task.")
        
    # Queue the heavy AI analysis in the background thread pool
    background_tasks.add_task(
        run_background_diagnose, 
        plant_id=plant_id, 
        image_bytes=image_bytes, 
        mime_type=mime_type
    )
    
    return DiagnosisTaskResponse(
        status="processing",
        message="Botanical foliage diagnostic task has been successfully queued in the background.",
        plant_id=plant_id
    )


@app.get("/api/plants/{plant_id}/scans", response_model=List[DiagnosticScanRead])
def get_plant_scans(plant_id: int, db: Session = Depends(get_db)):
    """
    Returns the complete list of all historical AI pathological leaf scans executed on a plant.
    Sorted chronologically descending (newest scans displayed first).
    """
    plant_exists = db.query(Plant).filter(Plant.id == plant_id).count() > 0
    if not plant_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Plant with ID {plant_id} not found"
        )
    scans = db.query(DiagnosticScan).filter(
        DiagnosticScan.plant_id == plant_id
    ).order_by(DiagnosticScan.date_scanned.desc()).all()
    return scans


@app.post("/api/telemetry/tick")
async def trigger_telemetry_tick():
    """
    Triggers an autonomous 'hour tick' telemetry simulation event for all plants.
    Decays soil moisture, updates daylight curves, and runs anomaly status flags.
    Also broadcasts a 'tick' event to all active WebSocket dashboards to auto-refresh clients.
    """
    try:
        simulate_live_tick()
        await ws_manager.broadcast({"event_type": "tick"})
        return {"status": "success", "message": "Simulation tick logged for all plants."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Simulation tick failed: {str(e)}"
        )


@app.put("/api/schedules/{schedule_id}/complete", response_model=TreatmentScheduleRead)
def update_schedule_status(schedule_id: int, payload: TreatmentScheduleUpdate, db: Session = Depends(get_db)):
    """
    Marks an AI-generated recovery calendar task as completed or pending.
    Applies Option A state transitions: updates plant status to "Treatments Completed"
    when all tasks are finished, and reverts to "Critical" if any task is uncompleted.
    """
    schedule = db.query(TreatmentSchedule).filter(TreatmentSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Treatment task with ID {schedule_id} not found"
        )
        
    schedule.is_completed = payload.is_completed
    db.commit()
    db.refresh(schedule)
    
    # --- Option A: Automated Healing State Machine ---
    plant = db.query(Plant).filter(Plant.id == schedule.plant_id).first()
    if plant:
        all_schedules = db.query(TreatmentSchedule).filter(
            TreatmentSchedule.plant_id == plant.id
        ).all()
        
        if all_schedules and all(s.is_completed for s in all_schedules):
            # All tasks completed! Update status to Treatments Completed
            plant.status = "Treatments Completed"
            print(f"🏥 Auto-healing callback: All recovery tasks completed for '{plant.name}'. Status shifted to 'Treatments Completed'.")
        else:
            # If any task is incomplete, the recovery protocol is unfinished.
            # If it was in "Treatments Completed" or "Healthy" state, revert back to "Critical".
            if plant.status in ["Treatments Completed", "Healthy"]:
                plant.status = "Critical"
                print(f"🚨 Auto-critical callback: Recovery tasks are incomplete for '{plant.name}'. Status reverted to 'Critical'.")
                
        db.commit()
        db.refresh(plant)
        
    return schedule

