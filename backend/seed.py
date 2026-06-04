import datetime
from .database import engine, Base, SessionLocal
from .models import Plant, CareLog

def seed_database():
    print("=" * 60)
    print("🌱 INITIALIZING DATABASE & SEEDING PLANT RECORDS")
    print("=" * 60)
    
    # Create SQLite database tables if they do not exist
    print("Creating database tables based on SQLAlchemy models...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully.")
    
    db = SessionLocal()
    try:
        # Check if plants table is already seeded
        plant_count = db.query(Plant).count()
        if plant_count > 0:
            print(f"⚠️ Database already has {plant_count} plant records. Skipping seeding.")
            return
            
        print("Seeding initial household plants...")
        
        # Define seed plants
        monstera = Plant(
            name="Monty",
            species="Monstera Deliciosa",
            watering_interval_days=7,
            status="Healthy",
            date_added=datetime.datetime.utcnow() - datetime.timedelta(days=30),
            image_url="https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=400",
            last_watered_date=datetime.datetime.utcnow() - datetime.timedelta(days=4),
            pot_size="10\"",
            pot_height="Standard",
            potting_mix="Aerated Aroid Mix",
            location="Living Room",
            light_condition="Full Indirect Sun",
            maturity_stage="Mature Plant",
            repotted_status="6 months ago",
            propagation_methods="Stem Cuttings, Air Layering",
            fertilizer_guideline="High-nitrogen liquid fertilizer, feed monthly in spring/summer."
        )
        
        fiddle = Plant(
            name="Figgy",
            species="Fiddle Leaf Fig",
            watering_interval_days=10,
            status="Healthy",
            date_added=datetime.datetime.utcnow() - datetime.timedelta(days=20),
            image_url="https://images.unsplash.com/photo-1597055181300-e3633a207518?auto=format&fit=crop&q=80&w=400",
            last_watered_date=datetime.datetime.utcnow() - datetime.timedelta(days=9),
            pot_size="8\"",
            pot_height="Standard",
            potting_mix="Standard Soil",
            location="Bedroom",
            light_condition="Part Shade / Part Sun",
            maturity_stage="Mature Plant",
            repotted_status="1 year ago",
            propagation_methods="Stem Cuttings, Air Layering",
            fertilizer_guideline="Balanced liquid fertilizer at half strength every 4-6 weeks."
        )
        
        rubber = Plant(
            name="Bouncy",
            species="Rubber Plant (Ficus Elastica)",
            watering_interval_days=9,
            status="Healthy",
            date_added=datetime.datetime.utcnow() - datetime.timedelta(days=15),
            image_url="https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&q=80&w=400",
            last_watered_date=datetime.datetime.utcnow() - datetime.timedelta(days=2),
            pot_size="6\"",
            pot_height="Standard",
            potting_mix="Standard Soil",
            location="Office",
            light_condition="Full Indirect Sun",
            maturity_stage="Mature Plant",
            repotted_status="Never / Nursery Pot",
            propagation_methods="Stem Cuttings, Air Layering",
            fertilizer_guideline="Apply liquid plant food monthly during active growth."
        )

        
        db.add_all([monstera, fiddle, rubber])
        db.commit()
        print("✅ Plants successfully seeded.")
        
        # Add initial care logs to establish baseline watering history
        print("Adding baseline care events (Initial Watering)...")
        # Monstera watered 4 days ago
        db.add(CareLog(plant_id=monstera.id, care_type="Watering", date_completed=datetime.datetime.utcnow() - datetime.timedelta(days=4)))
        # Fiddle Leaf Fig watered 9 days ago (almost dry!)
        db.add(CareLog(plant_id=fiddle.id, care_type="Watering", date_completed=datetime.datetime.utcnow() - datetime.timedelta(days=9)))
        # Rubber Plant watered 2 days ago
        db.add(CareLog(plant_id=rubber.id, care_type="Watering", date_completed=datetime.datetime.utcnow() - datetime.timedelta(days=2)))
        
        db.commit()
        print("✅ Care logs seeded.")
        
        # Pre-generate 24h historical telemetry for each seeded plant to bootstrap metrics
        print("Pre-generating historical telemetry for seeded plants...")
        from .telemetry_simulator import generate_historical_data
        generate_historical_data(db, monstera, hours_to_simulate=24)
        generate_historical_data(db, fiddle, hours_to_simulate=24)
        generate_historical_data(db, rubber, hours_to_simulate=24)
        print("✅ Seeding completed fully.")
        print("-" * 50)

        
    except Exception as e:
        db.rollback()
        print(f"❌ Error during database seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
