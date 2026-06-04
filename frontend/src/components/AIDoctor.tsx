import { useRef, ChangeEvent } from 'react';
import { Sprout, UploadCloud, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DiagnosisResult } from '../types';

export interface AIDoctorProps {
  diagnosing: boolean;
  uploadError: string | null;
  diagnosisResult: DiagnosisResult | null;
  handleImageUpload: (file: File) => void;
  runMockDiagnosis: () => void;
}

export default function AIDoctor({ 
  diagnosing, 
  uploadError, 
  diagnosisResult, 
  handleImageUpload, 
  runMockDiagnosis 
}: AIDoctorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImageUpload(file);
  };

  return (
    <motion.div 
      className="glass-panel diagnostic-panel"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <h2 className="section-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sprout size={18} style={{ color: 'var(--secondary)' }} />
          AI Multimodal Plant Doctor
        </div>
      </h2>

      {/* Drag-and-drop Image Upload Zone */}
      <motion.div 
        className="diagnostic-dropzone" 
        onClick={() => fileInputRef.current?.click()}
        whileHover={{ scale: 1.01, borderColor: 'var(--secondary)' }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ cursor: 'pointer' }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={onFileChange}
        />
        <UploadCloud className="dropzone-icon" />
        <div className="dropzone-text">
          <h4>Upload Leaf Photo</h4>
          <p>Drag and drop or tap to scan diseased plant leaves</p>
        </div>
      </motion.div>

      {/* Diagnostic Trigger Actions */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
        <motion.button 
          className="btn btn-secondary" 
          onClick={runMockDiagnosis}
          disabled={diagnosing}
          style={{ fontSize: '12px', padding: '6px 12px' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {diagnosing ? 'Analyzing...' : '⚡ Quick Dev Mock Diagnosis'}
        </motion.button>
      </div>

      <AnimatePresence>
        {uploadError && (
          <motion.div 
            className="badge badge-critical" 
            style={{ alignSelf: 'center', textTransform: 'none', marginTop: '12px', width: 'fit-content' }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            Error: {uploadError}
          </motion.div>
        )}

        {/* Diagnosing Loader Overlay */}
        {diagnosing && (
          <motion.div 
            className="empty-state" 
            style={{ padding: '20px 0' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              style={{ display: 'inline-block' }}
            >
              <RefreshCw size={24} className="brand-icon" />
            </motion.div>
            <p style={{ marginTop: '8px' }}>Executing Botanical Pathological Analysis via Gemini API...</p>
          </motion.div>
        )}

        {/* Diagnostic Report Display */}
        {diagnosisResult && !diagnosing && (
          <motion.div 
            className="diagnosis-card"
            style={{ marginTop: '16px' }}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          >
            <div className="diagnosis-header">
              <span className="diagnosis-title">{diagnosisResult.diagnosed_issue}</span>
              <span className="badge badge-critical" style={{ animation: 'none' }}>
                {(diagnosisResult.confidence_score * 100).toFixed(0)}% Conf
              </span>
            </div>
            <p className="diagnosis-summary">{diagnosisResult.short_summary}</p>
            
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              ⚠️ Recovery steps have been dynamically injected into your treatment calendar above.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
