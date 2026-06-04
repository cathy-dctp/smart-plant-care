import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Sprout, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Sub-Components & Modals
import Header from './components/Header';
import PlantList from './components/PlantList';
import AddPlantModal from './components/AddPlantModal';
import EditPlantModal from './components/EditPlantModal';

// Tab Views
import HomeView from './views/HomeView';
import PlantsView from './views/PlantsView';
import DiagnoseView from './views/DiagnoseView';

// Types
import { Plant, PlantDetail, TelemetryLog, DiagnosisResult, DashboardTask } from './types';

const API_BASE = 'http://127.0.0.1:8000';

function App() {
  const [theme, setTheme] = useState<string>('light');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [location, setLocation] = useLocation();

  // Determine activeTab based on URL path
  let activeTab: 'home' | 'plants' | 'diagnose' = 'home';
  if (location.startsWith('/plants')) {
    activeTab = 'plants';
  } else if (location.startsWith('/diagnose')) {
    activeTab = 'diagnose';
  }

  // Determine activePlantId based on URL route parameter
  let activePlantId: number | null = null;
  const matchPlants = location.match(/^\/plants\/(\d+)/);
  const matchDiagnose = location.match(/^\/diagnose\/(\d+)/);
  if (activeTab === 'plants' && matchPlants) {
    activePlantId = parseInt(matchPlants[1], 10);
  } else if (activeTab === 'diagnose' && matchDiagnose) {
    activePlantId = parseInt(matchDiagnose[1], 10);
  }

  // Router-aware setters that update the browser address bar
  const setActiveTab = (tab: 'home' | 'plants' | 'diagnose') => {
    if (tab === 'home') {
      setLocation('/');
    } else {
      const targetId = activePlantId || (plants.length > 0 ? plants[0].id : null);
      if (targetId) {
        setLocation(`/${tab}/${targetId}`);
      } else {
        setLocation(`/${tab}`);
      }
    }
  };

  const setActivePlantId = (id: number | null) => {
    if (id === null) {
      setLocation(`/${activeTab === 'home' ? '' : activeTab}`);
    } else {
      const targetTab = activeTab === 'home' ? 'plants' : activeTab;
      setLocation(`/${targetTab}/${id}`);
    }
  };

  const [plantDetail, setPlantDetail] = useState<PlantDetail | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Consolidated care tasks state
  const [tasks, setTasks] = useState<DashboardTask[]>([]);

  // AI Diagnostics State
  const [diagnosing, setDiagnosing] = useState<boolean>(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Add & Edit Modals Visibility States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // selectedRoom state for Greenhouse room maps filtering
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Trigger scan timeline reload upon completing background scans
  const [scanTrigger, setScanTrigger] = useState<number>(0);

  // WebSocket and polling fallback state
  const activePlantIdRef = useRef<number | null>(activePlantId);
  
  useEffect(() => {
    activePlantIdRef.current = activePlantId;
  }, [activePlantId]);

  // Auto-redirect if tab is plants or diagnose but no plant is selected in URL
  useEffect(() => {
    if (activeTab !== 'home' && activePlantId === null && plants.length > 0) {
      setLocation(`/${activeTab}/${plants[0].id}`, { replace: true });
    }
  }, [activeTab, activePlantId, plants, setLocation]);

  // Resilient WebSocket Client hook with 10-second REST fallback
  useEffect(() => {
    let socket: WebSocket | null = null;
    let fallbackInterval: any = null;
    let reconnectTimeout: any = null;
    let isMounted = true;

    const startFallbackPolling = () => {
      if (fallbackInterval) return;
      console.log('⚠️ Downgrading to REST API 10s fallback polling...');
      fallbackInterval = setInterval(() => {
        if (!isMounted) return;
        fetchPlants();
        fetchTasks();
        const activeId = activePlantIdRef.current;
        if (activeId) {
          fetchPlantDetails(activeId);
          fetchTelemetryHistory(activeId);
        }
      }, 10000);
    };

    const stopFallbackPolling = () => {
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
        console.log('🛑 Stopped REST API 10s fallback polling.');
      }
    };

    const connectWebSocket = () => {
      if (!isMounted) return;
      
      const wsUrl = `ws://127.0.0.1:8000/api/ws/telemetry`;
      console.log(`🔌 Attempting WebSocket connection to: ${wsUrl}`);
      
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          if (!isMounted) return;
          console.log('🔌 WebSocket connection established!');
          stopFallbackPolling();
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            const activeId = activePlantIdRef.current;

            if (data.event_type === 'telemetry_update') {
              console.log('📡 WebSocket received telemetry update:', data);
              
              // 1. Update in plants array
              setPlants(prevPlants => prevPlants.map(p => {
                if (p.id === data.plant_id) {
                  return {
                    ...p,
                    latest_moisture: data.soil_moisture,
                    latest_temperature: data.temperature,
                    latest_light_level: data.light_level,
                    status: data.status
                  };
                }
                return p;
              }));

              // 2. Update detail if active
              if (activeId === data.plant_id) {
                setPlantDetail(prevDetail => {
                  if (prevDetail && prevDetail.id === data.plant_id) {
                    return {
                      ...prevDetail,
                      latest_moisture: data.soil_moisture,
                      latest_temperature: data.temperature,
                      latest_light_level: data.light_level,
                      status: data.status
                    };
                  }
                  return prevDetail;
                });

                // 3. Update telemetry chart history
                setTelemetryHistory(prevHistory => {
                  const newLog: TelemetryLog = {
                    id: Date.now(),
                    plant_id: data.plant_id,
                    timestamp: data.timestamp,
                    soil_moisture: data.soil_moisture,
                    temperature: data.temperature,
                    light_level: data.light_level
                  };
                  if (prevHistory.length > 0 && prevHistory[prevHistory.length - 1].timestamp === data.timestamp) {
                    return prevHistory;
                  }
                  return [...prevHistory, newLog].slice(-24);
                });
              }

              // 4. Handle auto watered trigger tasks reload
              if (data.auto_watered) {
                console.log('💧 Auto-watering surge detected! Syncing tasks and schedules...');
                fetchPlants();
                fetchTasks();
                if (activeId) {
                  fetchPlantDetails(activeId);
                }
              }
            } else if (data.event_type === 'tick') {
              console.log('⏰ Telemetry tick received, re-fetching dashboard...');
              fetchPlants();
              fetchTasks();
              if (activeId) {
                fetchPlantDetails(activeId);
              }
            } else if (data.event_type === 'diagnosis_complete') {
              console.log('🩺 WebSocket received background diagnosis complete signal:', data);
              if (activeId === data.plant_id) {
                setDiagnosisResult(data.result);
                setDiagnosing(false);
                setScanTrigger(prev => prev + 1);
                fetchPlants();
                fetchTasks();
                fetchPlantDetails(activeId);
              }
            }
          } catch (err) {
            console.error('❌ Failed parsing WebSocket message:', err);
          }
        };

        socket.onclose = () => {
          if (!isMounted) return;
          console.warn('🔌 WebSocket connection closed. Scheduling reconnection fallback...');
          startFallbackPolling();
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };

        socket.onerror = (err) => {
          console.error('❌ WebSocket encountered error:', err);
          socket?.close();
        };
      } catch (err) {
        console.error('❌ WebSocket instantiation failed:', err);
        startFallbackPolling();
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      stopFallbackPolling();
      if (socket) {
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // Initialize Theme and Fetch Data
  useEffect(() => {
    const savedTheme = localStorage.getItem('plant-theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    fetchPlants(true); // Initial load
    fetchTasks();      // Initial tasks load
  }, []);

  // Fetch active aggregated care and treatment tasks
  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/tasks`);
      if (!res.ok) throw new Error('Failed to retrieve action checklist');
      const data = (await res.json()) as DashboardTask[];
      setTasks(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlantAdded = async (newPlantId: number) => {
    await fetchPlants();
    await fetchTasks();
    setActivePlantId(newPlantId);
    setActiveTab('plants'); // Auto navigate to My Plants tab upon adding
  };

  // Fetch updated details whenever active plant changes
  useEffect(() => {
    if (activePlantId) {
      fetchPlantDetails(activePlantId);
      fetchTelemetryHistory(activePlantId);
      setDiagnosisResult(null); // Clear previous diagnostic results
    }
  }, [activePlantId]);

  // Theme Toggler
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('plant-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Fetch all plants in the dashboard
  const fetchPlants = async (setFirstActive = false) => {
    try {
      const res = await fetch(`${API_BASE}/api/plants`);
      if (!res.ok) throw new Error('Failed to retrieve plants catalog');
      const data = (await res.json()) as Plant[];
      setPlants(data);
      
      if (setFirstActive && data.length > 0) {
        setActivePlantId(data[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch specific details (treatment schedules & care logs)
  const fetchPlantDetails = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/plants/${id}`);
      if (!res.ok) throw new Error('Failed to retrieve plant details');
      const data = (await res.json()) as PlantDetail;
      setPlantDetail(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch rolling 24 hour historical telemetry
  const fetchTelemetryHistory = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/plants/${id}/telemetry`);
      if (!res.ok) throw new Error('Failed to retrieve sensor history');
      const data = (await res.json()) as TelemetryLog[];
      setTelemetryHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Log a watering event
  const handleWater = async () => {
    if (!activePlantId) return;
    try {
      const res = await fetch(`${API_BASE}/api/plants/${activePlantId}/water`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to execute watering protocol');
      
      await fetchPlants();
      await fetchPlantDetails(activePlantId);
      await fetchTelemetryHistory(activePlantId);
      await fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Snooze watering trigger
  const handleSnoozeWater = async (plantId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/plants/${plantId}/snooze-water?snooze_days=3`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to snooze watering');
      
      await fetchPlants();
      if (activePlantId) {
        await fetchPlantDetails(activePlantId);
        await fetchTelemetryHistory(activePlantId);
      }
      await fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Log a fertilization event
  const handleLogFertilizer = async () => {
    if (!activePlantId) return;
    try {
      const res = await fetch(`${API_BASE}/api/plants/${activePlantId}/care-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ care_type: 'Fertilizing' })
      });
      if (!res.ok) throw new Error('Failed to record fertilization log');
      
      await fetchPlants();
      await fetchPlantDetails(activePlantId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Simulate smart home telemetry sync
  const handleSimulateSmartSync = async (moisture: number, temp: number, light: number) => {
    if (!activePlantId) return;
    try {
      const res = await fetch(`${API_BASE}/api/plants/${activePlantId}/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          soil_moisture: moisture,
          temperature: temp,
          light_level: light
        })
      });
      if (!res.ok) throw new Error('Failed to sync smart home telemetry');
      
      await fetchPlants();
      await fetchPlantDetails(activePlantId);
      await fetchTelemetryHistory(activePlantId);
      await fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Update custom temperature override
  const handleUpdateCustomTemp = async (temp: number | null) => {
    if (!activePlantId) return;
    try {
      const res = await fetch(`${API_BASE}/api/plants/${activePlantId}/temp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ custom_temp: temp })
      });
      if (!res.ok) throw new Error('Failed to update thermostat target');
      
      await fetchPlants();
      await fetchPlantDetails(activePlantId);
      await fetchTelemetryHistory(activePlantId);
      await fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Update specifications via Edit Modal callback
  const handleUpdateSpecifications = async (updatedData: any) => {
    if (!activePlantId) return;
    try {
      const res = await fetch(`${API_BASE}/api/plants/${activePlantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });
      if (!res.ok) throw new Error('Failed to update plant specifications');
      
      setIsEditModalOpen(false);
      await fetchPlants();
      await fetchPlantDetails(activePlantId);
      await fetchTelemetryHistory(activePlantId);
      await fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete plant from backend
  const handleDeletePlant = async () => {
    if (!activePlantId) return;
    const confirmDelete = window.confirm(`Are you absolutely sure you want to remove ${activePlant?.name || 'this plant'}? This will permanently delete all its sensor telemetry history and logs.`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_BASE}/api/plants/${activePlantId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete plant');
      
      setIsEditModalOpen(false);
      await fetchPlants();
      await fetchTasks();
      
      const resPlants = await fetch(`${API_BASE}/api/plants`);
      const plantsData = await resPlants.json() as Plant[];
      if (plantsData.length > 0) {
        setActivePlantId(plantsData[0].id);
      } else {
        setActivePlantId(null);
        setPlantDetail(null);
        setTelemetryHistory([]);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Toggle recovery schedule task completion status
  const handleToggleSchedule = async (scheduleId: number, currentCompletedStatus: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/schedules/${scheduleId}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_completed: !currentCompletedStatus })
      });
      if (!res.ok) throw new Error('Failed to update task status');
      
      await fetchPlants();
      if (activePlantId) {
        await fetchPlantDetails(activePlantId);
      }
      await fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Upload foliage photo for diagnostics
  const handleImageUpload = async (file: File) => {
    if (!activePlantId || !file) return;
    setDiagnosing(true);
    setUploadError(null);
    setDiagnosisResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/plants/${activePlantId}/diagnose`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Gemini diagnostic pipeline encountered an error');
      console.log("📸 Foliage scan successfully queued for background diagnosis.");
    } catch (err: any) {
      setUploadError(err.message);
      setDiagnosing(false);
    }
  };

  // Trigger developer mock fallback path explicitly
  const runMockDiagnosis = async () => {
    if (!activePlantId) return;
    setDiagnosing(true);
    setUploadError(null);
    setDiagnosisResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/plants/${activePlantId}/diagnose`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Mock diagnostics triggered error');
      console.log("🔬 Mock foliage scan successfully queued for background diagnosis.");
    } catch (err: any) {
      setUploadError(err.message);
      setDiagnosing(false);
    }
  };

  // Find active plant object
  const activePlant = plants.find(p => p.id === activePlantId);

  // Filter tasks dynamically by selected room if one is active
  const filteredTasks = selectedRoom
    ? tasks.filter(task => {
        const plant = plants.find(p => p.id === task.plant_id);
        return plant && plant.location && plant.location.toLowerCase().trim() === selectedRoom.toLowerCase().trim();
      })
    : tasks;

  // Filter plants dynamically by selected room if one is active
  const filteredPlants = selectedRoom
    ? plants.filter(p => p.location && p.location.toLowerCase().trim() === selectedRoom.toLowerCase().trim())
    : plants;

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sprout size={48} className="brand-icon" />
        </motion.div>
        <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '18px' }}>Initializing IoT Telemetry Portal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <AlertCircle size={48} style={{ color: 'var(--status-critical)' }} />
        <p style={{ fontWeight: 600 }}>Connection Error: {error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry Connection</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 1. Header Navigation Bar with central command tabs */}
      <Header 
        theme={theme} 
        toggleTheme={toggleTheme} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* 2. Main Dashboard Portal */}
      <main className="dashboard-content" style={{ gridTemplateColumns: activeTab === 'home' ? '1fr' : '350px 1fr' }}>
        {/* Sidebar: Show only in My Plants and AI Doctor tabs */}
        {activeTab !== 'home' && (
          <PlantList 
            plants={filteredPlants} 
            activePlantId={activePlantId} 
            setActivePlantId={setActivePlantId} 
            onAddPlantClick={() => setIsAddModalOpen(true)}
          />
        )}

        {/* Tab 1: Home Center */}
        {activeTab === 'home' && (
          <HomeView 
            plants={plants}
            selectedRoom={selectedRoom}
            onSelectRoom={setSelectedRoom}
            setActivePlantId={setActivePlantId}
            setActiveTab={setActiveTab}
            tasks={filteredTasks}
            onWater={async (plantId) => {
              try {
                const res = await fetch(`${API_BASE}/api/plants/${plantId}/water`, { method: 'POST' });
                if (!res.ok) throw new Error('Watering action failed');
                await fetchPlants();
                if (activePlantId) {
                  await fetchPlantDetails(activePlantId);
                  await fetchTelemetryHistory(activePlantId);
                }
                await fetchTasks();
              } catch (err: any) {
                alert(err.message);
              }
            }}
            onToggleSchedule={handleToggleSchedule}
            onSnooze={handleSnoozeWater}
            activePlantId={activePlantId}
          />
        )}

        {/* Tab 2: My Plants */}
        {activeTab === 'plants' && (
          <PlantsView 
            activePlant={activePlant}
            plantDetail={plantDetail}
            telemetryHistory={telemetryHistory}
            onOpenEditModal={() => setIsEditModalOpen(true)}
            onUpdateCustomTemp={handleUpdateCustomTemp}
            onSimulateSmartSync={handleSimulateSmartSync}
            onToggleSchedule={handleToggleSchedule}
            onWater={handleWater}
            onLogFertilizer={handleLogFertilizer}
          />
        )}

        {/* Tab 3: AI Doctor */}
        {activeTab === 'diagnose' && (
          <DiagnoseView 
            activePlant={activePlant}
            scanTrigger={scanTrigger}
            diagnosing={diagnosing}
            uploadError={uploadError}
            diagnosisResult={diagnosisResult}
            onImageUpload={handleImageUpload}
            onRunMockDiagnosis={runMockDiagnosis}
            plantDetail={plantDetail}
            onToggleSchedule={handleToggleSchedule}
            onWater={handleWater}
            onLogFertilizer={handleLogFertilizer}
          />
        )}
      </main>

      {/* ADD PLANT MODAL */}
      <AddPlantModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onPlantAdded={handlePlantAdded} 
      />

      {/* EDIT SPECIFICATIONS MODAL */}
      {activePlant && (
        <EditPlantModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          plant={activePlant}
          onUpdate={handleUpdateSpecifications}
          onDelete={handleDeletePlant}
        />
      )}
    </div>
  );
}

export default App;
