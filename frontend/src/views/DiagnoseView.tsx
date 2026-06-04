import { motion, AnimatePresence } from 'framer-motion';
import ScanVault from '../components/ScanVault';
import AIDoctor from '../components/AIDoctor';
import RecoverySchedule from '../components/RecoverySchedule';
import { Plant, PlantDetail, DiagnosisResult } from '../types';

export interface DiagnoseViewProps {
  activePlant: Plant | undefined;
  scanTrigger: number;
  diagnosing: boolean;
  uploadError: string | null;
  diagnosisResult: DiagnosisResult | null;
  onImageUpload: (file: File) => Promise<void>;
  onRunMockDiagnosis: () => Promise<void>;
  plantDetail: PlantDetail | null;
  onToggleSchedule: (scheduleId: number, currentCompletedStatus: boolean) => Promise<void>;
  onWater: () => Promise<void>;
  onLogFertilizer: () => Promise<void>;
}

export default function DiagnoseView({
  activePlant,
  scanTrigger,
  diagnosing,
  uploadError,
  diagnosisResult,
  onImageUpload,
  onRunMockDiagnosis,
  plantDetail,
  onToggleSchedule,
  onWater,
  onLogFertilizer,
}: DiagnoseViewProps) {
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
            {/* Doctor Banner */}
            <motion.div 
              className="glass-panel dashboard-hero"
              style={{ background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                {activePlant.image_url && (
                  <img 
                    src={activePlant.image_url} 
                    alt={activePlant.name} 
                    style={{ width: '74px', height: '74px', borderRadius: '18px', objectFit: 'cover' }}
                  />
                )}
                <div className="hero-text" style={{ flex: 1 }}>
                  <h1 style={{ color: 'var(--text-heading)' }}>🩺 AI Pathological Clinic</h1>
                  <p style={{ color: 'var(--text-main)' }}>
                    Perform botanical leaf diagnostic scans and manage treatment schedules for <strong>{activePlant.name}</strong> ({activePlant.species}).
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="bottom-split-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Historical Scan Vault */}
                <ScanVault activePlantId={activePlant.id} refreshTrigger={scanTrigger} />

                {/* Gemini Multimodal Plant Doctor */}
                <AIDoctor 
                  diagnosing={diagnosing}
                  uploadError={uploadError}
                  diagnosisResult={diagnosisResult}
                  handleImageUpload={onImageUpload}
                  runMockDiagnosis={onRunMockDiagnosis}
                />
              </div>

              {/* Recovery Task Schedule */}
              <RecoverySchedule 
                plantDetail={plantDetail}
                activePlant={activePlant}
                handleToggleSchedule={onToggleSchedule}
                handleWater={onWater}
                handleLogFertilizer={onLogFertilizer}
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
            Select a plant from the list to engage pathological diagnostic scanning.
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
