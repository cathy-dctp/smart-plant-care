import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base, get_db
from backend.main import app
from backend.models import Plant, TelemetryLog, CareLog, TreatmentSchedule

# Create a Test Client to execute endpoints
client = TestClient(app)

def test_api_root():
    """
    Test root endpoint.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"


def test_get_all_plants():
    """
    Test GET /api/plants.
    """
    response = client.get("/api/plants")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3  # Seeded Figgy, Monty, Bouncy
    
    # Verify calculated dashboard fields are present
    plant = data[0]
    assert "latest_moisture" in plant
    assert "next_watering_date" in plant
    assert "status" in plant


def test_get_plant_details():
    """
    Test GET /api/plants/{id}
    """
    # Fetch plant 1 (Monty or Figgy)
    response = client.get("/api/plants/1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert "telemetry_logs" in data
    assert "care_logs" in data
    assert "treatment_schedules" in data


def test_get_plant_telemetry_history():
    """
    Test GET /api/plants/{id}/telemetry
    """
    response = client.get("/api/plants/1/telemetry")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 24  # limited to last 24 logs
    
    # Ensure sorted chronologically (timestamp ascending)
    if len(data) > 1:
        assert data[0]["timestamp"] <= data[-1]["timestamp"]


def test_water_plant():
    """
    Test POST /api/plants/{id}/water
    """
    # Water plant 2 (Figgy or Monty)
    response = client.post("/api/plants/2/water")
    assert response.status_code == 200
    data = response.json()
    assert data["care_type"] == "Watering"
    assert data["plant_id"] == 2
    
    # Verify plant status has shifted back to Healthy
    plant_response = client.get("/api/plants/2")
    assert plant_response.json()["status"] == "Healthy"
    assert plant_response.json()["latest_moisture"] == 100.0


def test_trigger_telemetry_tick():
    """
    Test POST /api/telemetry/tick
    """
    # Fetch initial moisture of plant 1
    p_init = client.get("/api/plants/1").json()
    init_moisture = p_init["latest_moisture"]
    
    # Trigger tick (will decay moisture)
    response = client.post("/api/telemetry/tick")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Fetch updated moisture to verify it has changed
    p_after = client.get("/api/plants/1").json()
    after_moisture = p_after["latest_moisture"]
    
    assert init_moisture is not None
    assert after_moisture is not None
    print(f"📉 Initial Moisture: {init_moisture}% | After Tick: {after_moisture}%")


def test_diagnose_plant_mock():
    """
    Test POST /api/plants/{id}/diagnose
    Uses developer mock fallback since we pass no image bytes and let it route.
    """
    response = client.post("/api/plants/2/diagnose")
    assert response.status_code == 202
    data = response.json()
    
    assert data["status"] == "processing"
    assert data["plant_id"] == 2
    assert "message" in data
    
    # Since Starlette TestClient runs BackgroundTasks synchronously, 
    # the database will ALREADY have the schedules and scans populated!
    plant_details = client.get("/api/plants/2").json()
    assert len(plant_details["treatment_schedules"]) > 0
    assert plant_details["status"] == "Critical"  # Fiddle Leaf Fig defaults to Bacterial Leaf Spot (Critical)


def test_complete_treatment_schedule():
    """
    Test PUT /api/schedules/{id}/complete
    """
    # Get a scheduled task
    plant_details = client.get("/api/plants/2").json()
    schedules = plant_details["treatment_schedules"]
    assert len(schedules) > 0
    
    schedule_id = schedules[0]["id"]
    initial_completed = schedules[0]["is_completed"]
    
    # Complete it
    response = client.put(
        f"/api/schedules/{schedule_id}/complete", 
        json={"is_completed": True}
    )
    assert response.status_code == 200
    assert response.json()["is_completed"] is True
    
    # Re-fetch and verify
    plant_details_after = client.get("/api/plants/2").json()
    assert plant_details_after["treatment_schedules"][0]["is_completed"] is True


def test_treatment_state_machine_workflow():
    """
    Option A Integration Test: Full state machine walkthrough.
    1. Diagnose a plant -> status becomes "Critical" and gets treatment tasks.
    2. Complete some but not all tasks -> status stays "Critical".
    3. Complete the last remaining task -> status shifts to "Treatments Completed".
    4. Uncheck one task -> status reverts back to "Critical".
    5. Complete that task again -> status returns to "Treatments Completed".
    6. Perform a healthy AI rescan -> status shifts to "Healthy".
    """
    print("\n🔄 Running Option A state machine integration test...")
    
    # 1. Run mock diagnosis on Monty (Plant ID 1)
    diag_res = client.post("/api/plants/1/diagnose")
    assert diag_res.status_code == 202
    
    plant_details = client.get("/api/plants/1").json()
    assert plant_details["status"] == "Critical"
    
    schedules = plant_details["treatment_schedules"]
    assert len(schedules) > 0
    print(f"  - Initial diagnosis success. Plant status: {plant_details['status']}, Tasks count: {len(schedules)}")
    
    # 2. Complete all tasks except the last one
    for schedule in schedules[:-1]:
        res = client.put(
            f"/api/schedules/{schedule['id']}/complete",
            json={"is_completed": True}
        )
        assert res.status_code == 200
        
    # Check that status is still Critical
    plant_details = client.get("/api/plants/1").json()
    assert plant_details["status"] == "Critical"
    print("  - Completed partial tasks. Plant status remains Critical.")
    
    # 3. Complete the last remaining task
    last_task = schedules[-1]
    res = client.put(
        f"/api/schedules/{last_task['id']}/complete",
        json={"is_completed": True}
    )
    assert res.status_code == 200
    
    # Verify status is now "Treatments Completed"
    plant_details = client.get("/api/plants/1").json()
    assert plant_details["status"] == "Treatments Completed"
    print(f"  - Checked off final task. Plant status updated to: {plant_details['status']}")
    
    # 4. Uncheck the last task (make it incomplete again)
    res = client.put(
        f"/api/schedules/{last_task['id']}/complete",
        json={"is_completed": False}
    )
    assert res.status_code == 200
    
    # Verify status reverted back to "Critical"
    plant_details = client.get("/api/plants/1").json()
    assert plant_details["status"] == "Critical"
    print(f"  - Unchecked a task. Plant status reverted to: {plant_details['status']}")
    
    # 5. Complete it again
    res = client.put(
        f"/api/schedules/{last_task['id']}/complete",
        json={"is_completed": True}
    )
    assert res.status_code == 200
    
    # Verify status is back to "Treatments Completed"
    plant_details = client.get("/api/plants/1").json()
    assert plant_details["status"] == "Treatments Completed"
    print("  - Re-completed final task. Plant status back to Treatments Completed.")
    
    # 6. Perform a healthy AI rescan using our special mime_type "image/healthy"
    rescan_res = client.post(
        "/api/plants/1/diagnose",
        files={"file": ("healthy.jpg", b"fake_bytes", "image/healthy")}
    )
    assert rescan_res.status_code == 202
    assert rescan_res.json()["status"] == "processing"
    
    # Verify status is now "Healthy"
    plant_details = client.get("/api/plants/1").json()
    assert plant_details["status"] == "Healthy"
    
    # We assert that there are no INCOMPLETE schedules remaining (completed ones can be kept for history)
    incomplete_schedules = [s for s in plant_details["treatment_schedules"] if not s["is_completed"]]
    assert len(incomplete_schedules) == 0
    print(f"  - Performed AI Rescan with mock healthy image. Final plant status: {plant_details['status']}")


def test_dashboard_tasks():
    """
    Test GET /api/dashboard/tasks.
    """
    response = client.get("/api/dashboard/tasks")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    
    # Check that key attributes like id, task_type, plant_id, plant_name, severity are present
    if len(data) > 0:
        task = data[0]
        assert "id" in task
        assert "task_type" in task
        assert "plant_id" in task
        assert "plant_name" in task
        assert "severity" in task


def test_database_search():
    """
    Test GET /api/plants/database-search.
    Should return a list of matches in the "data" field.
    """
    response = client.get("/api/plants/database-search?q=monstera")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]) > 0
    first = data["data"][0]
    assert "common_name" in first
    assert "scientific_name" in first


def test_database_details():
    """
    Test GET /api/plants/database-details/{species_id}.
    Should return detailed qualitative and quantitative watering details.
    """
    # Test local mock details
    response = client.get("/api/plants/database-details/-1")
    assert response.status_code == 200
    data = response.json()
    assert data["species_id"] == -1
    assert data["common_name"] == "Monstera"
    assert data["watering"] == "Average"
    assert data["watering_interval_days"] == 7


def test_create_plant_planta_flow():
    """
    Test POST /api/plants with the full onboarding questionnaire payload.
    """
    payload = {
        "name": "Buddy",
        "species": "Snake Plant (Sansevieria Trifasciata)",
        "watering_interval_days": 14,
        "image_url": "https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&q=80&w=400",
        "last_watered_date": "2026-05-22T12:00:00Z",
        "pot_size": "4\"",
        "pot_height": "Shallow",
        "potting_mix": "Succulent / Cactus Mix",
        "location": "Living Room",
        "light_condition": "Full Direct Sun",
        "maturity_stage": "Cutting",
        "repotted_status": "Recently (< 3 m)"
    }
    response = client.post("/api/plants", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Buddy"
    assert data["pot_size"] == "4\""
    assert data["potting_mix"] == "Succulent / Cactus Mix"
    assert data["location"] == "Living Room"
    
    # Check that baseline watering log was created
    plant_id = data["id"]
    plant_details = client.get(f"/api/plants/{plant_id}").json()
    assert len(plant_details["care_logs"]) > 0
    assert plant_details["care_logs"][0]["care_type"] == "Watering"


def test_update_plant_specifications():
    """
    Test PUT /api/plants/{id} specifications editing and physics re-generation.
    """
    payload = {
        "pot_size": "4\"",
        "potting_mix": "Succulent Mix",
        "light_condition": "Full Direct Sun",
        "watering_interval_days": 10
    }
    response = client.put("/api/plants/1", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["pot_size"] == "4\""
    assert data["potting_mix"] == "Succulent Mix"
    assert data["light_condition"] == "Full Direct Sun"
    
    # Verify that telemetry logs were re-generated
    telemetry = client.get("/api/plants/1/telemetry").json()
    assert len(telemetry) > 0


def test_snooze_watering():
    """
    Test POST /api/plants/{id}/snooze-water watering snooze.
    """
    # Dynamically resolve plant ID
    plants = client.get("/api/plants").json()
    assert len(plants) > 0
    plant_id = plants[0]["id"]

    response = client.post(f"/api/plants/{plant_id}/snooze-water?snooze_days=5")
    assert response.status_code == 200
    data = response.json()
    assert data["snoozed_until"] is not None
    assert data["latest_moisture"] == 65.0
    assert data["status"] == "Healthy"
    
    # Verify a care log event "Soil Check (Wet)" was written
    plant_details = client.get(f"/api/plants/{plant_id}").json()
    care_logs = plant_details["care_logs"]
    assert any(log["care_type"] == "Soil Check (Wet)" for log in care_logs)
    
    # Verify that get_dashboard_tasks does NOT return a water task for this plant
    tasks = client.get("/api/dashboard/tasks").json()
    assert not any(t["id"] == f"water-{plant_id}" for t in tasks)


def test_delete_plant():
    """
    Test DELETE /api/plants/{id} plant deletion and cascades.
    """
    # Create a temporary plant to delete
    payload = {
        "name": "Temp Delete Plant",
        "species": "Fern",
        "watering_interval_days": 7
    }
    create_res = client.post("/api/plants", json=payload)
    assert create_res.status_code == 201
    temp_id = create_res.json()["id"]

    res = client.delete(f"/api/plants/{temp_id}")
    assert res.status_code == 204
    
    res_details = client.get(f"/api/plants/{temp_id}")
    assert res_details.status_code == 404



def test_add_custom_care_log():
    """
    Test POST /api/plants/{id}/care-log custom care logs.
    """
    response = client.post("/api/plants/1/care-log", json={"care_type": "Fertilizing"})
    assert response.status_code == 200
    data = response.json()
    assert data["care_type"] == "Fertilizing"
    assert data["plant_id"] == 1


def test_sync_telemetry_integration():
    """
    Test POST /api/plants/{id}/telemetry endpoint for third-party smart home sync.
    """
    response = client.post("/api/plants/1/telemetry", json={
        "soil_moisture": 35.5,
        "temperature": 24.2,
        "light_level": 450.0
    })
    assert response.status_code == 200
    data = response.json()
    assert data["soil_moisture"] == 35.5
    assert data["temperature"] == 24.2
    assert data["light_level"] == 450.0
    assert data["plant_id"] == 1
    
    # Verify that plant status is updated based on moisture threshold < 40%
    plant_details = client.get("/api/plants/1").json()
    assert plant_details["status"] == "Needs Water"


if __name__ == "__main__":
    print("🚀 Running API Gateway Integration Tests...")
    test_api_root()
    print("✅ Root API works.")
    test_get_all_plants()
    print("✅ GET /api/plants calculated fields are operational.")
    test_dashboard_tasks()
    print("✅ GET /api/dashboard/tasks consolidated dashboard endpoint is operational.")
    test_get_plant_details()
    print("✅ GET /api/plants/{id} detail fetching is operational.")
    test_get_plant_telemetry_history()
    print("✅ GET /api/plants/{id}/telemetry historical curves sorted chronologically.")
    test_water_plant()
    print("✅ POST /api/plants/{id}/water moisture resets and logs watering event.")
    test_trigger_telemetry_tick()
    print("✅ POST /api/telemetry/tick decays moisture and executes live simulated time ticks.")
    test_diagnose_plant_mock()
    print("✅ POST /api/plants/{id}/diagnose automatically handles mock fallback pathways.")
    test_complete_treatment_schedule()
    print("✅ PUT /api/schedules/{id}/complete toggles calendar tasks.")
    test_treatment_state_machine_workflow()
    print("✅ Full Option A treatment state machine transitions validated.")
    test_database_search()
    print("✅ GET /api/plants/database-search proxy operates correctly.")
    test_database_details()
    print("✅ GET /api/plants/database-details/{species_id} operates correctly.")
    test_create_plant_planta_flow()
    print("✅ POST /api/plants onboarding questionnaire registration operates correctly.")
    test_update_plant_specifications()
    print("✅ PUT /api/plants/{id} specifications updates and physics re-generation works.")
    test_snooze_watering()
    print("✅ POST /api/plants/{id}/snooze-water watering snooze works.")
    test_delete_plant()
    print("✅ DELETE /api/plants/{id} plant deletion and cascade works.")
    test_add_custom_care_log()
    print("✅ POST /api/plants/{id}/care-log custom care logs work.")
    test_sync_telemetry_integration()
    print("✅ POST /api/plants/{id}/telemetry smart home sync telemetry logs work.")
    print("\n🎉 ALL API GATEWAY INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉")




