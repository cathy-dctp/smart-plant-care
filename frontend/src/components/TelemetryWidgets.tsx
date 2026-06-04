import { useState, useEffect } from 'react';
import { Droplet, Thermometer, Sun, Sliders, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plant } from '../types';
import AmbientHydroGauge from './AmbientHydroGauge';

export interface TelemetryWidgetsProps {
  activePlant: Plant;
  onUpdateTemp: (temp: number | null) => Promise<void>;
}

export default function TelemetryWidgets({ activePlant, onUpdateTemp }: TelemetryWidgetsProps) {
  const [showThermostat, setShowThermostat] = useState(false);
  const [tempValue, setTempValue] = useState<number>(activePlant.custom_temp ?? 22.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever active plant changes
  useEffect(() => {
    setTempValue(activePlant.custom_temp ?? 22.0);
  }, [activePlant.id, activePlant.custom_temp]);

  // Staggered variants for widgets
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const widgetVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <motion.div 
        className="telemetry-summary-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        key={activePlant.id} // Re-animate when active plant changes
      >
        {/* 1. Soil Moisture Card with Premium AmbientHydroGauge */}
        <motion.div 
          className="stat-widget"
          variants={widgetVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{ justifyContent: 'center', padding: '12px', minHeight: '136px' }}
        >
          <AmbientHydroGauge 
            percentage={activePlant.latest_moisture ?? 0} 
            size={110} 
            label="Soil Moisture" 
          />
        </motion.div>

        {/* 2. Temperature Card (Clickable to trigger thermostat override panel) */}
        <motion.div 
          className={`stat-widget temp-widget-card ${activePlant.custom_temp !== null ? 'override-active' : ''} ${showThermostat ? 'dropdown-open' : ''}`}
          variants={widgetVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={() => setShowThermostat(!showThermostat)}
          style={{ cursor: 'pointer', position: 'relative' }}
          role="button"
          aria-expanded={showThermostat}
          title="Click to override target indoor temperature"
        >
          <div className="stat-icon-wrapper temp">
            <Thermometer size={20} />
          </div>
          <div className="stat-info" style={{ flex: 1 }}>
            <span className="stat-label">Environment Temperature</span>
            <span className="stat-value">
              {activePlant.latest_temperature !== null ? `${activePlant.latest_temperature.toFixed(1)}°C` : 'N/A'}
            </span>
            <span className="stat-badge-sub" style={{ 
              fontSize: '11px', 
              marginTop: '4px', 
              color: activePlant.custom_temp !== null ? 'var(--secondary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500
            }}>
              {activePlant.custom_temp !== null ? (
                <>
                  <span className="override-dot" /> Thermostat: {activePlant.custom_temp.toFixed(1)}°C
                </>
              ) : (
                'Dynamic Weather-Driven'
              )}
            </span>
          </div>
          
          <div className="thermostat-toggle-trigger" style={{ alignSelf: 'center', display: 'flex', alignItems: 'center' }}>
            <Sliders size={16} className={`thermostat-gear-icon ${showThermostat ? 'open' : ''}`} style={{ color: 'var(--text-muted)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          </div>
        </motion.div>

        {/* 3. Light Card */}
        <motion.div 
          className="stat-widget"
          variants={widgetVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="stat-icon-wrapper light">
            <Sun size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Windowsill Light Level</span>
            <span className="stat-value">
              {activePlant.latest_light_level !== null ? `${activePlant.latest_light_level.toFixed(0)} lx` : 'N/A'}
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Thermostat Control Sub-Panel */}
      <AnimatePresence>
        {showThermostat && (
          <motion.div 
            className="glass-panel thermostat-dropdown-panel"
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="thermostat-dropdown-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)' }}>
                  Thermostat Override Center
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Define target room temperature settings for <strong>{activePlant.name}</strong> ({activePlant.species}).
                </p>
              </div>
              <button 
                className="btn-icon-close" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowThermostat(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="thermostat-options-grid">
              {/* Pill selection mode */}
              <div className="thermostat-mode-toggles">
                <button 
                  className={`btn-mode-toggle ${activePlant.custom_temp === null ? 'selected' : ''}`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsSubmitting(true);
                    await onUpdateTemp(null);
                    setIsSubmitting(false);
                  }}
                  disabled={isSubmitting}
                >
                  <Sun size={14} />
                  Auto (Weather Live)
                </button>
                <button 
                  className={`btn-mode-toggle ${activePlant.custom_temp !== null ? 'selected' : ''}`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsSubmitting(true);
                    await onUpdateTemp(tempValue);
                    setIsSubmitting(false);
                  }}
                  disabled={isSubmitting}
                >
                  <Sliders size={14} />
                  Thermostat Override
                </button>
              </div>

              {/* Slider panel for target override values */}
              {activePlant.custom_temp !== null && (
                <motion.div 
                  className="thermostat-slider-container"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="thermostat-slider-metrics">
                    <span className="slider-label" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Adjust Thermostat Target
                    </span>
                    <span className="slider-current-value" style={{ 
                      fontSize: '18px', 
                      fontWeight: 700, 
                      color: 'var(--secondary)' 
                    }}>
                      {tempValue.toFixed(1)}°C
                    </span>
                  </div>
                  
                  <div className="slider-input-wrapper" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    margin: '12px 0' 
                  }}>
                    <span className="slider-bound" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>16°C</span>
                    <input 
                      type="range" 
                      min="16" 
                      max="30" 
                      step="0.5" 
                      value={tempValue} 
                      onChange={(e) => setTempValue(parseFloat(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="thermostat-range-slider"
                      style={{ flex: 1, height: '6px', borderRadius: '3px', accentColor: 'var(--secondary)', cursor: 'pointer' }}
                    />
                    <span className="slider-bound" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>30°C</span>
                  </div>

                  <div className="thermostat-slider-actions" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginTop: '8px'
                  }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setTempValue(22.0);
                        setIsSubmitting(true);
                        await onUpdateTemp(22.0);
                        setIsSubmitting(false);
                      }}
                      disabled={isSubmitting}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      Use Default (22.0°C)
                    </button>
                    
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setIsSubmitting(true);
                        await onUpdateTemp(tempValue);
                        setIsSubmitting(false);
                      }}
                      disabled={isSubmitting}
                      style={{ 
                        fontSize: '12px', 
                        padding: '6px 14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px' 
                      }}
                    >
                      {isSubmitting ? 'Applying...' : (
                        <>
                          <Check size={14} /> Set Override
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
