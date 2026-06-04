import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plant } from '../types';

export interface EditPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  plant: Plant;
  onUpdate: (updatedData: {
    name: string;
    species: string;
    watering_interval_days: number;
    pot_size: string;
    pot_height: string;
    potting_mix: string;
    location: string;
    light_condition: string;
    maturity_stage: string;
    repotted_status: string;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function EditPlantModal({
  isOpen,
  onClose,
  plant,
  onUpdate,
  onDelete,
}: EditPlantModalProps) {
  const [editName, setEditName] = useState(plant.name);
  const [editSpecies, setEditSpecies] = useState(plant.species);
  const [editWateringInterval, setEditWateringInterval] = useState(plant.watering_interval_days);
  const [editPotSize, setEditPotSize] = useState(plant.pot_size || '8"');
  const [editPotHeight, setEditPotHeight] = useState(plant.pot_height || 'Standard');
  const [editPottingMix, setEditPottingMix] = useState(plant.potting_mix || 'Standard Soil');
  const [editLocation, setEditLocation] = useState(plant.location || 'Living Room');
  const [editLightCondition, setEditLightCondition] = useState(plant.light_condition || 'Full Indirect Sun');
  const [editMaturityStage, setEditMaturityStage] = useState(plant.maturity_stage || 'Mature Plant');
  const [editRepottedStatus, setEditRepottedStatus] = useState(plant.repotted_status || 'Recently (< 3 months)');

  // Sync edits if active plant changes
  useEffect(() => {
    if (plant) {
      setEditName(plant.name);
      setEditSpecies(plant.species);
      setEditWateringInterval(plant.watering_interval_days);
      setEditPotSize(plant.pot_size || '8"');
      setEditPotHeight(plant.pot_height || 'Standard');
      setEditPottingMix(plant.potting_mix || 'Standard Soil');
      setEditLocation(plant.location || 'Living Room');
      setEditLightCondition(plant.light_condition || 'Full Indirect Sun');
      setEditMaturityStage(plant.maturity_stage || 'Mature Plant');
      setEditRepottedStatus(plant.repotted_status || 'Recently (< 3 months)');
    }
  }, [plant]);

  const handleSave = async () => {
    await onUpdate({
      name: editName,
      species: editSpecies,
      watering_interval_days: editWateringInterval,
      pot_size: editPotSize,
      pot_height: editPotHeight,
      potting_mix: editPottingMix,
      location: editLocation,
      light_condition: editLightCondition,
      maturity_stage: editMaturityStage,
      repotted_status: editRepottedStatus,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(5, 18, 12, 0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: -1 }}
          />
          <motion.div
            className="glass-panel"
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '24px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)', boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.18)', padding: '24px', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 0, 0, 0.05)', paddingBottom: '12px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px', color: 'var(--text-heading)' }}>
                Modify {plant.name}'s Specifications
              </h3>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                Cancel
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px', display: 'block' }}>Nickname</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13.5px', outline: 'none' }} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px', display: 'block' }}>Botanical Species</label>
                <input type="text" value={editSpecies} onChange={(e) => setEditSpecies(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13.5px', outline: 'none' }} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px', display: 'block' }}>Watering Interval (days)</label>
                <input type="number" value={editWateringInterval} onChange={(e) => setEditWateringInterval(parseInt(e.target.value) || 7)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13.5px', outline: 'none' }} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px', display: 'block' }}>Pot Diameter (Width)</label>
                <select value={editPotSize} onChange={(e) => setEditPotSize(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13.5px', outline: 'none', cursor: 'pointer' }}>
                  {['4"', '6"', '8"', '10"', '12"', '14"+'].map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px', display: 'block' }}>Pot Height / Depth</label>
                <select value={editPotHeight} onChange={(e) => setEditPotHeight(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13.5px', outline: 'none', cursor: 'pointer' }}>
                  {['Shallow', 'Standard', 'Tall'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px', display: 'block' }}>Potting Mix</label>
                <select value={editPottingMix} onChange={(e) => setEditPottingMix(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13.5px', outline: 'none', cursor: 'pointer' }}>
                  {['Standard Soil', 'Succulent / Cactus Mix', 'Aerated Aroid Mix', 'Orchid Bark Mix', 'Peat-based Mix', 'Nursery Soil'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px', display: 'block' }}>Placement Location</label>
                <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13.5px', outline: 'none' }} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px', display: 'block' }}>Light Condition</label>
                <select value={editLightCondition} onChange={(e) => setEditLightCondition(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13.5px', outline: 'none', cursor: 'pointer' }}>
                  {['Shade', 'Part Shade / Part Sun', 'Full Indirect Sun', 'Full Direct Sun'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px', display: 'block' }}>Maturity Stage</label>
                <select value={editMaturityStage} onChange={(e) => setEditMaturityStage(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13.5px', outline: 'none', cursor: 'pointer' }}>
                  {['Mature Plant', 'Cutting'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px', display: 'block' }}>Repotted Status</label>
                <input type="text" value={editRepottedStatus} onChange={(e) => setEditRepottedStatus(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13.5px', outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0, 0, 0, 0.05)', paddingTop: '16px', marginTop: '10px' }}>
              <button 
                type="button" 
                className="btn" 
                onClick={onDelete}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--status-critical)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🗑️ Remove Plant
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSave}>
                  Save Changes 🌿
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
