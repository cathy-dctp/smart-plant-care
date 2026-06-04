import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { TelemetryLog } from '../types';

export interface TelemetryChartProps {
  telemetryHistory: TelemetryLog[];
  activePlantId: number;
}

export default function TelemetryChart({ telemetryHistory, activePlantId }: TelemetryChartProps) {
  // Helper to parse naive UTC datetime strings from backend as actual UTC dates
  const parseUTCDate = (timeStr: string) => {
    try {
      if (!timeStr) return new Date();
      // If the string doesn't specify any timezone offset, append 'Z' to force parsing as UTC
      let formattedStr = timeStr;
      if (!timeStr.endsWith('Z') && !timeStr.includes('+') && !timeStr.match(/-\d{2}:\d{2}$/)) {
        // Replace space with T to make it ISO compliant
        formattedStr = timeStr.replace(' ', 'T');
        if (!formattedStr.endsWith('Z')) {
          formattedStr += 'Z';
        }
      }
      return new Date(formattedStr);
    } catch (e) {
      return new Date(timeStr);
    }
  };

  // Format charts time x-axis
  const formatTime = (timeStr: string) => {
    try {
      const date = parseUTCDate(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeStr;
    }
  };

  const lastTemp = telemetryHistory.length > 0 ? telemetryHistory[telemetryHistory.length - 1].temperature : 0;
  const lastMoisture = telemetryHistory.length > 0 ? telemetryHistory[telemetryHistory.length - 1].soil_moisture : 0;
  const chartKey = `${activePlantId}-${telemetryHistory.length}-${lastTemp}-${lastMoisture}`;

  return (
    <motion.div 
      className="glass-panel chart-panel"
      key={chartKey} // Force clean re-mount and spring animation when active plant or data updates
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, type: 'spring', damping: 20 }}
    >
      <h2 className="section-title">24-Hour Rolling Time-Series Telemetry</h2>
      {telemetryHistory.length > 0 ? (
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={telemetryHistory}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--status-warning)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--status-warning)" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="var(--text-muted)"/>
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime} 
                stroke="var(--text-muted)" 
                fontSize={11}
              />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip 
                labelFormatter={(label) => parseUTCDate(label).toLocaleString()}
                contentStyle={{ 
                  background: 'var(--panel-bg)', 
                  border: '1px solid var(--panel-border)',
                  borderRadius: '12px',
                  color: 'var(--text-heading)' 
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
              <Area 
                type="monotone" 
                name="Soil Moisture (%)" 
                dataKey="soil_moisture" 
                stroke="var(--secondary)" 
                fillOpacity={1} 
                fill="url(#colorMoisture)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                name="Temperature (°C)" 
                dataKey="temperature" 
                stroke="var(--status-warning)" 
                fillOpacity={1} 
                fill="url(#colorTemp)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">No time-series data found. Click "Simulate Hour Tick" to bootstrap log queues.</div>
      )}
    </motion.div>
  );
}
