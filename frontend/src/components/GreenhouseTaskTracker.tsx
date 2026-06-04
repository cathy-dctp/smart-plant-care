import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplet, ClipboardList, Check, Sparkles, ChevronDown, AlertCircle, Calendar } from 'lucide-react';
import { DashboardTask } from '../types';

interface GreenhouseTaskTrackerProps {
  tasks: DashboardTask[];
  onWater: (plantId: number) => Promise<void>;
  onToggleSchedule: (scheduleId: number, currentCompletedStatus: boolean) => Promise<void>;
  onSnooze?: (plantId: number) => Promise<void>;
  activePlantId: number | null;
  setActivePlantId: (plantId: number) => void;
}

export default function GreenhouseTaskTracker({
  tasks,
  onWater,
  onToggleSchedule,
  onSnooze,
  activePlantId,
  setActivePlantId,
}: GreenhouseTaskTrackerProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Quick stats
  const pendingCount = tasks.length;
  const criticalCount = tasks.filter(t => t.severity === 'critical').length;

  const handleTaskCheck = async (task: DashboardTask) => {
    if (task.task_type === 'water') {
      await onWater(task.plant_id);
    } else if (task.task_type === 'treatment' && task.target_id !== undefined) {
      await onToggleSchedule(task.target_id, false); // Marking incomplete -> complete
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'badge badge-critical';
      case 'warning': return 'badge badge-warning';
      default: return 'badge badge-completed';
    }
  };

  const getTaskIcon = (task: DashboardTask) => {
    if (task.task_type === 'water') {
      return <Droplet size={14} className="text-secondary" style={{ filter: 'drop-shadow(0 0 4px var(--secondary-glow))' }} />;
    }
    return <Sparkles size={14} style={{ color: '#818cf8', filter: 'drop-shadow(0 0 4px rgba(99,102,241,0.25))' }} />;
  };

  return (
    <motion.div 
      className="glass-panel"
      style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Expandable Header Bar */}
      <div 
        className="section-title" 
        style={{ margin: 0, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ClipboardList size={22} className="brand-icon" style={{ animation: 'none' }} />
          <span>Greenhouse Action Center</span>
          <AnimatePresence>
            {pendingCount > 0 ? (
              <motion.span 
                className={criticalCount > 0 ? "badge badge-critical" : "badge badge-warning"}
                style={{ marginLeft: '8px' }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                {criticalCount > 0 && <AlertCircle size={10} style={{ marginRight: '2px' }} />}
                {pendingCount} {pendingCount === 1 ? 'Task' : 'Tasks'}
              </motion.span>
            ) : (
              <motion.span 
                className="badge badge-healthy"
                style={{ marginLeft: '8px' }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                Clear
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
        </motion.div>
      </div>

      {/* Task List Drawer */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {pendingCount === 0 ? (
              <motion.div 
                className="diagnosis-card"
                style={{ 
                  margin: '4px 0', 
                  border: '1px solid rgba(16, 185, 129, 0.25)', 
                  background: 'rgba(16, 185, 129, 0.05)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '24px'
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles size={28} style={{ color: 'var(--status-healthy)', filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.3))' }} />
                </motion.div>
                <h4 style={{ color: 'var(--text-heading)', fontWeight: 600, fontSize: '15px' }}>Greenhouse Thriving!</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                  All plants are healthy, fully watered, and treatment tasks are completed. Keep up the excellent work! 🌿
                </p>
              </motion.div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                <AnimatePresence mode="popLayout">
                  {tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, x: -10, y: 5 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      exit={{ opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.2 } }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className={`schedule-item ${activePlantId === task.plant_id ? 'active-border' : ''}`}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '12px', 
                        padding: '14px', 
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--card-bg)',
                        border: activePlantId === task.plant_id ? '1px solid var(--primary)' : '1px solid var(--card-border)',
                        boxShadow: activePlantId === task.plant_id ? '0 0 10px rgba(5, 150, 105, 0.1)' : 'none'
                      }}
                    >
                      {/* Interactive Task Checkbox */}
                      <motion.button
                        onClick={() => handleTaskCheck(task)}
                        className="checkbox-custom"
                        style={{ border: '2px solid var(--text-muted)', background: 'transparent', margin: '2px 0 0 0' }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                      >
                        <Check size={12} style={{ color: 'transparent' }} />
                      </motion.button>
 
                      {/* Task Info & Clickable Plant Nav Link */}
                      <div className="schedule-details" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span 
                            onClick={() => setActivePlantId(task.plant_id)}
                            style={{ 
                              cursor: 'pointer', 
                              fontWeight: 600, 
                              fontSize: '13px', 
                              color: 'var(--primary)',
                              textDecoration: 'underline',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {task.plant_name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            ({task.plant_species})
                          </span>
                          <span className={getSeverityBadgeClass(task.severity)}>
                            {task.severity === 'critical' ? 'CRITICAL' : task.severity === 'warning' ? 'WATER' : 'TREATMENT'}
                          </span>
                        </div>
                        <p className="schedule-action" style={{ fontSize: '13.5px', marginTop: '4px', fontWeight: 500 }}>
                          {task.action}
                        </p>
                        {task.task_type === 'water' && onSnooze && (
                          <motion.button
                            onClick={() => onSnooze(task.plant_id)}
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              borderRadius: '8px',
                              marginTop: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <span>☔ Soil Still Wet (Snooze 3d)</span>
                          </motion.button>
                        )}
                        {task.scheduled_date && (
                          <span className="schedule-date" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontSize: '10.5px' }}>
                            <Calendar size={10} />
                            Due: {task.scheduled_date}
                          </span>
                        )}
                      </div>

                      {/* Ambient Severity Category Icon */}
                      <div style={{ display: 'flex', alignSelf: 'center', opacity: 0.85 }}>
                        {getTaskIcon(task)}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
