import { Heart, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Plant } from '../types';

export interface PlantListProps {
  plants: Plant[];
  activePlantId: number | null;
  setActivePlantId: (id: number) => void;
  onAddPlantClick?: () => void;
}

export default function PlantList({ plants, activePlantId, setActivePlantId, onAddPlantClick }: PlantListProps) {
  // Health Badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Healthy':
        return <span className="badge badge-healthy"><Heart size={10} fill="currentColor"/> Healthy</span>;
      case 'Needs Water':
        return <span className="badge badge-warning"><AlertCircle size={10}/> Needs Water</span>;
      case 'Critical':
        return <span className="badge badge-critical"><AlertCircle size={10}/> Critical</span>;
      case 'Treatments Completed':
        return <span className="badge badge-completed"><CheckCircle size={10}/> Treatments Completed</span>;
      default:
        return <span className="badge badge-healthy">{status}</span>;
    }
  };

  // Framer Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -15 },
    show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 15 } }
  };

  return (
    <motion.section 
      className="sidebar"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, type: 'spring' as const, damping: 20 }}
    >
      <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            My Plants
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>({plants.length} Active)</span>
          </span>
          <motion.button 
            className="btn-icon-only" 
            onClick={onAddPlantClick}
            title="Register New Plant"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{ width: '32px', height: '32px', padding: '0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={16} />
          </motion.button>
        </h2>
        <motion.div 
          className="plant-list"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {plants.map((plant) => (
            <motion.div 
              key={plant.id} 
              className={`plant-card ${plant.id === activePlantId ? 'active' : ''}`}
              onClick={() => setActivePlantId(plant.id)}
              variants={itemVariants}
              whileHover={{ scale: 1.018, x: 2 }}
              whileTap={{ scale: 0.985 }}
              style={{ cursor: 'pointer' }}
            >
              <div className="plant-card-header">
                <div>
                  <h3 className="plant-name">{plant.name}</h3>
                  <span className="plant-species">{plant.species}</span>
                </div>
                {getStatusBadge(plant.status)}
              </div>
              
              {/* Soil Moisture Mini-Meter */}
              <div className="metric-bar-container">
                <div className="metric-bar-label">
                  <span>Soil Moisture</span>
                  <span>{plant.latest_moisture !== null ? `${plant.latest_moisture}%` : 'N/A'}</span>
                </div>
                <div className="progress-track">
                  <motion.div 
                    className={`progress-fill ${
                      (plant.latest_moisture || 100) < 20 ? 'moisture-critical' : 
                      (plant.latest_moisture || 100) < 40 ? 'moisture-low' : ''
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${plant.latest_moisture !== null ? plant.latest_moisture : 0}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  ></motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
