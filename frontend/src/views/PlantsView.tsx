import { motion, AnimatePresence } from 'framer-motion';
import TelemetryWidgets from '../components/TelemetryWidgets';
import TelemetryChart from '../components/TelemetryChart';
import RecoverySchedule from '../components/RecoverySchedule';
import SmartHomeIntegration from '../components/SmartHomeIntegration';
import { Plant, PlantDetail, TelemetryLog } from '../types';

export interface PlantsViewProps {
  activePlant: Plant | undefined;
  plantDetail: PlantDetail | null;
  telemetryHistory: TelemetryLog[];
  onOpenEditModal: () => void;
  onUpdateCustomTemp: (temp: number | null) => Promise<void>;
  onSimulateSmartSync: (moisture: number, temp: number, light: number) => Promise<void>;
  onToggleSchedule: (scheduleId: number, currentCompletedStatus: boolean) => Promise<void>;
  onWater: () => Promise<void>;
  onLogFertilizer: () => Promise<void>;
}

export default function PlantsView({
  activePlant,
  plantDetail,
  telemetryHistory,
  onOpenEditModal,
  onUpdateCustomTemp,
  onSimulateSmartSync,
  onToggleSchedule,
  onWater,
  onLogFertilizer,
}: PlantsViewProps) {
  return (
    <section className="main-portal">
      <AnimatePresence mode="wait">
        {activePlant ? (
          <motion.div
            key={activePlant.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}
          >
            {/* Plant Detail Hero Card */}
            <motion.div 
              className="glass-panel dashboard-hero"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                {activePlant.image_url && (
                  <img 
                    src={activePlant.image_url} 
                    alt={activePlant.name} 
                    style={{ 
                      width: '74px', 
                      height: '74px', 
                      borderRadius: '18px', 
                      objectFit: 'cover', 
                      border: '2px solid rgba(255,255,255,0.15)', 
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)' 
                    }}
                  />
                )}
                <div className="hero-text" style={{ flex: 1 }}>
                  <h1>{activePlant.name}'s Care Portal</h1>
                  <p>
                    Botanical Classification: <strong style={{ color: 'var(--text-heading)' }}>{activePlant.species}</strong> • 
                    Watering Schedule: every <strong style={{ color: 'var(--text-heading)' }}>{activePlant.watering_interval_days} days</strong>
                  </p>
                </div>
                <div className="hero-actions" style={{ display: 'flex', gap: '10px' }}>
                  <motion.button 
                    className="btn btn-secondary" 
                    onClick={onOpenEditModal}
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    ⚙️ Modify Specs
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Plant Onboarding Blueprint Specifications Panel */}
            <motion.div 
              className="glass-panel" 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                gap: '16px', 
                padding: '16px 20px', 
                borderRadius: '20px',
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                boxShadow: 'var(--card-shadow)'
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              {[
                { label: 'Room Placement', val: activePlant.location || 'Living Room', icon: '🏠' },
                { label: 'Light Condition', val: activePlant.light_condition || 'Bright Indirect', icon: '☀️' },
                { label: 'Substrate Blend', val: activePlant.potting_mix || 'Standard Soil', icon: '🟫' },
                { label: 'Container Size', val: `${activePlant.pot_size || '8"'} (${activePlant.pot_height || 'Standard'})`, icon: '🪴' },
                { label: 'Maturity Profile', val: activePlant.maturity_stage || 'Mature Plant', icon: '🌱' },
                { label: 'Repotting status', val: activePlant.repotted_status || 'Recently', icon: '📅' }
              ].map((spec, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '4px' }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{spec.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ 
                      fontSize: '9.5px', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.04em', 
                      color: 'var(--text-muted)', 
                      fontWeight: 700 
                    }}>
                      {spec.label}
                    </span>
                    <strong style={{ 
                      fontSize: '12.5px', 
                      color: 'var(--text-heading)', 
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {spec.val}
                    </strong>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Rolling Live Status Metrics Widgets */}
            <TelemetryWidgets 
              activePlant={activePlant} 
              onUpdateTemp={onUpdateCustomTemp}
            />

            {/* Time-Series Analytical Charts */}
            <TelemetryChart 
              telemetryHistory={telemetryHistory} 
              activePlantId={activePlant.id} 
            />

            {/* Bottom Layout: Care Hub & Smart Home Integration */}
            <div className="bottom-split-grid">
              <RecoverySchedule 
                plantDetail={plantDetail}
                activePlant={activePlant}
                handleToggleSchedule={onToggleSchedule}
                handleWater={onWater}
                handleLogFertilizer={onLogFertilizer}
              />
              <SmartHomeIntegration 
                activePlant={activePlant}
                onSimulateSync={onSimulateSmartSync}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            className="empty-state" 
            style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Select a plant from the list to view its home care telemetry.
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
