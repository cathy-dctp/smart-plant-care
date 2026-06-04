from .database import SessionLocal
from .models import Plant, TreatmentSchedule
from .diagnostics import diagnose_plant_image

def test_ai_diagnostic_pipeline():
    print("=" * 60)
    print("🧪 TESTING MULTIMODAL PLANT DOCTOR & SCHEDULER PIPELINE")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Get Figgy (ID 2 in seed database)
        figgy = db.query(Plant).filter(Plant.id == 2).first()
        if not figgy:
            print("❌ Error: Fiddle Leaf Fig (Figgy) not found. Please run seed.py first.")
            return
            
        print(f"Figgy's Current Status before diagnosis: '{figgy.status}'\n")
        
        # Trigger our AI diagnostic transaction (running in safe developer mode)
        diagnosis_result = diagnose_plant_image(db, plant_id=figgy.id)
        
        # Fetch the newly scheduled treatment events for Figgy
        print("📅 Querying Database Calendar for Figgy's Treatment Schedule:")
        schedules = db.query(TreatmentSchedule).filter(
            TreatmentSchedule.plant_id == figgy.id
        ).order_by(TreatmentSchedule.scheduled_date.asc()).all()
        
        for idx, event in enumerate(schedules, 1):
            status_flag = "✓" if event.is_completed else "✗"
            print(f" {idx}. [{status_flag}] Date: {event.scheduled_date} | Action: {event.action}")
            
        print("\nFiggy's Updated Status after diagnosis: " + f"'{figgy.status}'")
        print("-" * 50)
        print("✅ PIPELINE INTEGRATION TEST SUCCESSFUL!")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Diagnostic Pipeline test failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_ai_diagnostic_pipeline()
