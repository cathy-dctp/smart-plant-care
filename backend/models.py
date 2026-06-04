import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Date
from sqlalchemy.orm import relationship
from .database import Base

class Plant(Base):
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    species = Column(String)
    watering_interval_days = Column(Integer)
    date_added = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="Healthy")  # Healthy, Needs Water, Critical
    custom_temp = Column(Float, nullable=True)  # Custom indoor temperature override set by the user
    
    # Planta-inspired onboarding metadata
    image_url = Column(String, nullable=True)
    last_watered_date = Column(DateTime, nullable=True)
    pot_size = Column(String, nullable=True)
    pot_height = Column(String, nullable=True)
    potting_mix = Column(String, nullable=True)
    location = Column(String, nullable=True)
    light_condition = Column(String, nullable=True)
    maturity_stage = Column(String, nullable=True)
    repotted_status = Column(String, nullable=True)
    snoozed_until = Column(DateTime, nullable=True)
    propagation_methods = Column(String, nullable=True)
    fertilizer_guideline = Column(String, nullable=True)



    # Relationships to child tables
    telemetry_logs = relationship("TelemetryLog", back_populates="plant", cascade="all, delete-orphan")
    care_logs = relationship("CareLog", back_populates="plant", cascade="all, delete-orphan")
    treatment_schedules = relationship("TreatmentSchedule", back_populates="plant", cascade="all, delete-orphan")
    diagnostic_scans = relationship("DiagnosticScan", back_populates="plant", cascade="all, delete-orphan")


class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=False)
    soil_moisture = Column(Float)  # Percentage (0-100)
    temperature = Column(Float)    # Celsius
    light_level = Column(Float)    # Lux or index value
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    # Reference back to plant
    plant = relationship("Plant", back_populates="telemetry_logs")


class CareLog(Base):
    __tablename__ = "care_logs"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=False)
    care_type = Column(String)     # e.g., "Watering", "Fertilizing"
    date_completed = Column(DateTime, default=datetime.datetime.utcnow)

    # Reference back to plant
    plant = relationship("Plant", back_populates="care_logs")


class TreatmentSchedule(Base):
    __tablename__ = "treatment_schedules"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=False)
    action = Column(String)        # e.g., "Wipe leaves with damp cloth", "Apply neem oil"
    scheduled_date = Column(Date, nullable=False)
    is_completed = Column(Boolean, default=False)

    # Reference back to plant
    plant = relationship("Plant", back_populates="treatment_schedules")


class DiagnosticScan(Base):
    __tablename__ = "diagnostic_scans"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=False)
    diagnosed_issue = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)
    short_summary = Column(String, nullable=False)
    scanned_image_url = Column(String, nullable=True)
    date_scanned = Column(DateTime, default=datetime.datetime.utcnow)

    # Reference back to plant
    plant = relationship("Plant", back_populates="diagnostic_scans")
