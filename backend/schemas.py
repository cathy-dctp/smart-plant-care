from pydantic import BaseModel
from datetime import datetime, date
from typing import List, Optional

# --- Telemetry Schemas ---
class TelemetryLogBase(BaseModel):
    soil_moisture: float
    temperature: float
    light_level: float
    timestamp: datetime

class TelemetryLogRead(TelemetryLogBase):
    id: int
    plant_id: int

    model_config = {"from_attributes": True}


class TelemetryLogCreate(BaseModel):
    soil_moisture: float
    temperature: float
    light_level: float



# --- Care Log Schemas ---
class CareLogBase(BaseModel):
    care_type: str
    date_completed: datetime

class CareLogCreate(BaseModel):
    care_type: str

class CareLogRead(CareLogBase):
    id: int
    plant_id: int

    model_config = {"from_attributes": True}


# --- Treatment Schedule Schemas ---
class TreatmentScheduleBase(BaseModel):
    action: str
    scheduled_date: date
    is_completed: bool

class TreatmentScheduleUpdate(BaseModel):
    is_completed: bool

class TreatmentScheduleRead(TreatmentScheduleBase):
    id: int
    plant_id: int

    model_config = {"from_attributes": True}


# --- Plant Schemas ---
class PlantBase(BaseModel):
    name: str
    species: str
    watering_interval_days: int

class PlantCreate(PlantBase):
    image_url: Optional[str] = None
    last_watered_date: Optional[datetime] = None
    pot_size: Optional[str] = None
    pot_height: Optional[str] = None
    potting_mix: Optional[str] = None
    location: Optional[str] = None
    light_condition: Optional[str] = None
    maturity_stage: Optional[str] = None
    repotted_status: Optional[str] = None
    propagation_methods: Optional[str] = None
    fertilizer_guideline: Optional[str] = None

class PlantUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    watering_interval_days: Optional[int] = None
    image_url: Optional[str] = None
    pot_size: Optional[str] = None
    pot_height: Optional[str] = None
    potting_mix: Optional[str] = None
    location: Optional[str] = None
    light_condition: Optional[str] = None
    maturity_stage: Optional[str] = None
    repotted_status: Optional[str] = None
    propagation_methods: Optional[str] = None
    fertilizer_guideline: Optional[str] = None

class PlantTempUpdate(BaseModel):
    custom_temp: Optional[float] = None

class PlantRead(PlantBase):
    id: int
    date_added: datetime
    status: str
    custom_temp: Optional[float] = None
    
    # Onboarding details
    image_url: Optional[str] = None
    last_watered_date: Optional[datetime] = None
    pot_size: Optional[str] = None
    pot_height: Optional[str] = None
    potting_mix: Optional[str] = None
    location: Optional[str] = None
    light_condition: Optional[str] = None
    maturity_stage: Optional[str] = None
    repotted_status: Optional[str] = None
    snoozed_until: Optional[datetime] = None
    propagation_methods: Optional[str] = None
    fertilizer_guideline: Optional[str] = None
    
    # Calculated metrics to optimize dashboard performance
    latest_moisture: Optional[float] = None
    latest_temperature: Optional[float] = None
    latest_light_level: Optional[float] = None
    next_watering_date: Optional[date] = None

    model_config = {"from_attributes": True}



# --- Diagnostic Scan Schemas ---
class DiagnosticScanBase(BaseModel):
    diagnosed_issue: str
    confidence_score: float
    short_summary: str
    scanned_image_url: Optional[str] = None

class DiagnosticScanCreate(DiagnosticScanBase):
    pass

class DiagnosticScanRead(DiagnosticScanBase):
    id: int
    plant_id: int
    date_scanned: datetime

    model_config = {"from_attributes": True}


class PlantDetail(PlantRead):
    # Full nested details for the plant's detail overview screen
    telemetry_logs: List[TelemetryLogRead] = []
    care_logs: List[CareLogRead] = []
    treatment_schedules: List[TreatmentScheduleRead] = []
    diagnostic_scans: List[DiagnosticScanRead] = []

    model_config = {"from_attributes": True}


# --- AI Diagnostics Schemas ---
class RecoveryStep(BaseModel):
    day: int
    action: str

class DiagnosisResponse(BaseModel):
    diagnosed_issue: str
    confidence_score: float
    short_summary: str
    recovery_steps: List[RecoveryStep]


# --- Consolidated Dashboard Task Schema ---
class DashboardTask(BaseModel):
    id: str  # e.g., "water-1" or "treatment-15"
    task_type: str  # "water" or "treatment"
    plant_id: int
    plant_name: str
    plant_species: str
    action: str
    severity: str  # "critical", "warning", "info"
    target_id: Optional[int] = None  # schedule_id for treatment
    scheduled_date: Optional[date] = None

    model_config = {"from_attributes": True}


# --- Asynchronous Task Tracking ---
class DiagnosisTaskResponse(BaseModel):
    status: str  # "queued", "processing", "completed", "failed"
    message: str
    plant_id: int


