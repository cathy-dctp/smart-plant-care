import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Thermometer, 
  Wifi, 
  Copy, 
  Check, 
  Terminal, 
  Code, 
  Activity, 
  Settings, 
  Database,
  Cpu
} from 'lucide-react';
import { Plant } from '../types';

export interface SmartHomeIntegrationProps {
  activePlant: Plant;
  onSimulateSync: (moisture: number, temp: number, light: number) => Promise<void>;
}

export default function SmartHomeIntegration({ activePlant, onSimulateSync }: SmartHomeIntegrationProps) {
  const [activeSubTab, setActiveSubTab] = useState<'nest' | 'homeassistant' | 'daemon'>('homeassistant');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Generate dynamic slug for YAML
  const plantSlug = activePlant.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const speciesSlug = activePlant.species.toLowerCase().split(' ')[0].replace(/[^a-z0-9]+/g, '');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleTestSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Establishing tunnel to local Home Assistant API...');
    
    // Simulate smart home delays
    setTimeout(async () => {
      try {
        // Generate healthy, realistic moisture/temp/light
        const simulatedMoisture = Math.floor(Math.random() * 25) + 65; // 65% - 90%
        const simulatedTemp = parseFloat((Math.random() * 3 + 21.0).toFixed(1)); // 21.0°C - 24.0°C
        const simulatedLight = Math.floor(Math.random() * 200) + 300; // 300 - 500 lx
        
        setSyncStatus(`Syncing: Soil Moisture = ${simulatedMoisture}%, Ambient Temp = ${simulatedTemp}°C...`);
        
        await onSimulateSync(simulatedMoisture, simulatedTemp, simulatedLight);
        
        setTimeout(() => {
          setIsSyncing(false);
          setSyncStatus(`🟢 Smart Sync Complete! Telemetry reset for '${activePlant.name}'.`);
          setTimeout(() => setSyncStatus(null), 4000);
        }, 1000);
      } catch (err: any) {
        setIsSyncing(false);
        setSyncStatus(`❌ Sync Failed: ${err.message}`);
      }
    }, 1200);
  };

  // 1. Google Nest SDM API Framework
  const nestCodeSnippet = `# Google Device Access Console Integration Daemon
import requests
import json

# OAuth2 credentials obtained from Google Cloud Console
ACCESS_TOKEN = "ya29.a0AfH6SM..."
ENTERPRISE_ID = "c4d7d3d1-4475-4f40-8b0d-..."
DEVICE_ID = "enterprises/{enterprise_id}/devices/..."

headers = {
    'Authorization': f'Bearer {ACCESS_TOKEN}',
    'Content-Type': 'application/json'
}

# Fetch ambient temperature/humidity from Google Nest Thermostat
url = f"https://smartdevicemanagement.googleapis.com/v1/enterprises/{ENTERPRISE_ID}/devices/{DEVICE_ID}"
res = requests.get(url, headers=headers)
device_data = res.json()

# Extract Nest thermometer readings
temp_celsius = device_data["traits"]["sdm.devices.traits.Temperature"]["ambientTemperatureCelsius"]
humidity_pct = device_data["traits"]["sdm.devices.traits.Humidity"]["ambientHumidityPercent"]

print(f"Nest sync: Temp={temp_celsius}°C, Humidity={humidity_pct}%")

# Push live ambient temperature to our Smart Plant Care server
sync_url = "http://127.0.0.1:8000/api/plants/${activePlant.id}/telemetry"
payload = {
    "soil_moisture": 78.0,  # Or fetch from physical capacitive sensor
    "temperature": temp_celsius,
    "light_level": 350.0
}
requests.post(sync_url, json=payload)
`;

  // 2. Home Assistant Automation YAML Configuration
  const haYamlSnippet = `# Place this automation in your Home Assistant /config/automations.yaml
alias: "Smart Sync: ${activePlant.name} Telemetry"
description: "Pushes capacitive soil readings and room temperature to Smart Plant Care App"
trigger:
  - platform: state
    entity_id: sensor.${plantSlug}_soil_moisture
  - platform: time_pattern
    hours: "/1"  # Sync every hour
condition: []
action:
  - service: http.request
    data:
      url: "http://localhost:8000/api/plants/${activePlant.id}/telemetry"
      method: POST
      headers:
        Content-Type: "application/json"
      payload: >-
        {
          "soil_moisture": {{ states('sensor.${plantSlug}_soil_moisture') | float | default(70) }},
          "temperature": {{ states('sensor.nest_thermostat_temperature') | float | default(21.5) }},
          "light_level": {{ states('sensor.${plantSlug}_light_intensity') | float | default(350) }}
        }
mode: restart
`;

  // 3. Custom Python REST Sync Daemon
  const daemonSnippet = `# cron_sync_sensors.py - Executes inside your local Raspberry Pi / Home Server
import os
import requests
import sqlite3

# Reads capacitive sensor values from locally mounted SQLite or BLE beacons
# and routes them straight to the FastAPI Smart Care service.
PLANT_API_URL = "http://127.0.0.1:8000/api/plants/${activePlant.id}/telemetry"

def get_ble_sensor_reading():
    # Placeholder: reads from Xiaomi Mi Flora Bluetooth LE sensor
    return {
        "soil_moisture": 68.5,
        "temperature": 22.1,
        "light_level": 480.0
    }

try:
    telemetry = get_ble_sensor_reading()
    response = requests.post(PLANT_API_URL, json=telemetry)
    if response.status_code == 200:
        print("Successfully synchronized Smart Plant BLE metrics.")
except Exception as e:
    print("Smart Home Sync Daemon Exception:", e)
`;

  return (
    <motion.div 
      className="glass-panel"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <h2 className="section-title" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wifi size={18} style={{ color: 'var(--secondary)', filter: 'drop-shadow(0 0 4px var(--secondary-glow))' }} />
          <span>🔌 Smart Home Integration Sync</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--secondary)', border: '1px solid var(--secondary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
          DEV SYSTEM
        </span>
      </h2>

      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
        Enable absolute reading accuracy by pulling live, physics-aligned home data. Set up webhooks or OAuth triggers to link your Google Nest Thermostat or Home Assistant entity arrays.
      </p>

      {/* Integration Options Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)', marginBottom: '16px', gap: '4px' }}>
        {[
          { id: 'homeassistant', label: '🏠 Home Assistant', icon: <Home size={13} /> },
          { id: 'nest', label: '🌡️ Google Nest', icon: <Thermometer size={13} /> },
          { id: 'daemon', label: '🐍 Sync Daemon', icon: <Code size={13} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              background: 'transparent',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              color: activeSubTab === tab.id ? 'var(--secondary)' : 'var(--text-muted)',
              borderBottom: activeSubTab === tab.id ? '2px solid var(--secondary)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, x: 5 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -5 }}
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === 'homeassistant' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Database size={13} style={{ color: 'var(--secondary)' }} />
                  HA REST Webhook Automation
                </span>
                <button
                  className="btn-icon-only"
                  style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', display: 'flex', gap: '4px' }}
                  onClick={() => copyToClipboard(haYamlSnippet, 'HA_YAML')}
                >
                  {copiedText === 'HA_YAML' ? <Check size={12} style={{ color: 'var(--status-healthy)' }} /> : <Copy size={12} />}
                  {copiedText === 'HA_YAML' ? 'Copied!' : 'Copy YAML'}
                </button>
              </div>

              <div 
                style={{ 
                  background: 'var(--input-bg)', 
                  border: '1px solid var(--panel-border)', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '180px',
                  color: 'var(--text-main)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {haYamlSnippet}
              </div>

              <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                💡 <strong>How to configure:</strong> Open Home Assistant, go to Automations & Scenes, create a new manual automation, switch to YAML mode, paste this block, and save. HA will automatically push updates whenever your soil sensors change!
              </span>
            </div>
          )}

          {activeSubTab === 'nest' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Cpu size={13} style={{ color: 'var(--status-warning)' }} />
                  Google Smart Device Management API (SDM)
                </span>
                <button
                  className="btn-icon-only"
                  style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', display: 'flex', gap: '4px' }}
                  onClick={() => copyToClipboard(nestCodeSnippet, 'NEST_CODE')}
                >
                  {copiedText === 'NEST_CODE' ? <Check size={12} style={{ color: 'var(--status-healthy)' }} /> : <Copy size={12} />}
                  {copiedText === 'NEST_CODE' ? 'Copied!' : 'Copy Python'}
                </button>
              </div>

              <div 
                style={{ 
                  background: 'var(--input-bg)', 
                  border: '1px solid var(--panel-border)', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '180px',
                  color: 'var(--text-main)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {nestCodeSnippet}
              </div>

              <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                💡 <strong>Authentication Blueprint:</strong> Uses Google Device Access Console credentials to authenticate and query Nest Thermostat status. The local daemon script extracts ambient temperature and forwards it straight to this plant's telemetry feed!
              </span>
            </div>
          )}

          {activeSubTab === 'daemon' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Terminal size={13} style={{ color: 'var(--primary)' }} />
                  BLE Capacitive Sensor Cron Daemon
                </span>
                <button
                  className="btn-icon-only"
                  style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', display: 'flex', gap: '4px' }}
                  onClick={() => copyToClipboard(daemonSnippet, 'DAEMON_CODE')}
                >
                  {copiedText === 'DAEMON_CODE' ? <Check size={12} style={{ color: 'var(--status-healthy)' }} /> : <Copy size={12} />}
                  {copiedText === 'DAEMON_CODE' ? 'Copied!' : 'Copy Daemon'}
                </button>
              </div>

              <div 
                style={{ 
                  background: 'var(--input-bg)', 
                  border: '1px solid var(--panel-border)', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '180px',
                  color: 'var(--text-main)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {daemonSnippet}
              </div>

              <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                💡 <strong>Standalone Daemon:</strong> A lightweight background Python script suitable for a local server or Raspberry Pi. Interrogates Bluetooth LE moisture probes (like Xiaomi Mi Flora) and posts readings straight to our HTTP server.
              </span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Simulator Terminal Component */}
      <div 
        style={{ 
          marginTop: '20px', 
          paddingTop: '16px', 
          borderTop: '1px solid var(--panel-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={14} style={{ color: 'var(--secondary)' }} />
          Live Connection Status & Simulation
        </span>

        <div 
          style={{ 
            background: '#090e0c', 
            borderRadius: '12px', 
            padding: '12px', 
            fontSize: '11px', 
            fontFamily: 'monospace',
            color: '#34d399',
            border: '1px solid rgba(52, 211, 153, 0.15)',
            minHeight: '60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)'
          }}
        >
          {isSyncing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="override-dot" style={{ background: 'var(--secondary)' }}></span>
              <span style={{ color: '#67e8f9' }}>{syncStatus}</span>
            </div>
          ) : syncStatus ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{syncStatus}</span>
            </div>
          ) : (
            <div style={{ color: '#8ba598', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>$ smart-sync --status</span>
              <span>- Status: STANDBY (Ready to receive home assistant webhooks)</span>
              <span>- Target endpoint: /api/plants/{activePlant.id}/telemetry</span>
            </div>
          )}
        </div>

        <motion.button
          onClick={handleTestSync}
          disabled={isSyncing}
          className="btn btn-secondary"
          style={{
            borderColor: 'var(--secondary)',
            color: 'var(--secondary)',
            justifyContent: 'center',
            fontSize: '12px',
            padding: '8px 16px',
            borderRadius: '10px',
            fontWeight: 600
          }}
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(8, 145, 178, 0.05)' }}
          whileTap={{ scale: 0.98 }}
        >
          🔌 Trigger Simulated BLE Sensor Sync (100% functional API)
        </motion.button>
      </div>
    </motion.div>
  );
}
