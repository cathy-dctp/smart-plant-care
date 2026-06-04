from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# SQLite database file URL
# Will create 'plant_care.db' in the backend directory
SQLALCHEMY_DATABASE_URL = "sqlite:///./plant_care.db"

# Create database engine
# check_same_thread=False is required ONLY for SQLite to allow multi-threaded access (FastAPI)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Session local factory for creating DB transactions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for models
Base = declarative_base()

# Dependency to get db session in FastAPI endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
