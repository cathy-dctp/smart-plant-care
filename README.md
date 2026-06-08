# Smart Plant Care App

An IoT and AI-powered telemetry and diagnostics portal for monitoring and managing household plants.

## Backend Setup

From the root directory, navigate to the `backend` directory:

```bash
cd backend
```

1. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Seed the database:**
   ```bash
   python3 -m seed
   ```

4. **Start the FastAPI server:**
   ```bash
   uvicorn main:app --reload
   ```
   *The backend will be running at `http://127.0.0.1:8000`.*

5. **Run tests:**
   From the root directory (with the virtual environment activated):
   ```bash
   python -m backend.test_api
   python -m backend.test_diagnostics
   ```
   *(Ensure you run the database seed step first, as the tests verify seeded database state).*

---

## Frontend Setup

Open a new terminal window, navigate to the `frontend` directory:

```bash
cd frontend
```

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   *The frontend will be running at `http://localhost:5173` (or the URL output in your terminal).*
