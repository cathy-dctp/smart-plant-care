import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, ShieldAlert, Award, Calendar, Activity, Loader2 } from 'lucide-react';

interface DiagnosticScan {
  id: number;
  plant_id: number;
  diagnosed_issue: string;
  confidence_score: number;
  short_summary: string;
  scanned_image_url?: string | null;
  date_scanned: string;
}

export interface ScanVaultProps {
  activePlantId: number;
  refreshTrigger?: number;
}

export default function ScanVault({ activePlantId, refreshTrigger = 0 }: ScanVaultProps) {
  const [scans, setScans] = useState<DiagnosticScan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedScan, setSelectedScan] = useState<DiagnosticScan | null>(null);

  const API_BASE = 'http://127.0.0.1:8000';

  const fetchScans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/plants/${activePlantId}/scans`);
      if (!res.ok) throw new Error('Failed to fetch scans archive');
      const data = (await res.json()) as DiagnosticScan[];
      setScans(data);
      if (data.length > 0) {
        setSelectedScan(data[0]); // Default focus on latest scan
      } else {
        setSelectedScan(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, [activePlantId, refreshTrigger]);

  return (
    <motion.div 
      className="glass-panel"
      style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="section-title" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} style={{ color: 'var(--primary)' }} />
          <span>🩺 AI Diagnostic Scan Vault</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Historical Clinic Record</span>
      </h2>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '120px' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      ) : scans.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 0', textAlign: 'center' }}>
          <ClipboardList size={36} style={{ opacity: 0.15, marginBottom: '8px' }} />
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-main)', fontWeight: 500 }}>No scans logged yet</p>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Use the Pathological Leaf Scanner below to log first scan.</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '20px', minHeight: '200px' }}>
          {/* Left Column: Vertical timeline nodes of past scan dates */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px', 
              borderRight: '1px solid var(--panel-border)', 
              paddingRight: '12px',
              maxHeight: '220px',
              overflowY: 'auto'
            }}
          >
            {scans.map((scan) => {
              const dateStr = new Date(scan.date_scanned).toISOString().split('T')[0];
              const isSelected = selectedScan?.id === scan.id;

              return (
                <button
                  key={scan.id}
                  onClick={() => setSelectedScan(scan)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                    background: isSelected ? 'var(--input-bg)' : 'transparent',
                    color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={11} />
                    {dateStr}
                  </span>
                  <span 
                    style={{ 
                      fontSize: '10.5px', 
                      color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {scan.diagnosed_issue}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Column: details of focused historical diagnosis */}
          <AnimatePresence mode="wait">
            {selectedScan && (
              <motion.div
                key={selectedScan.id}
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {/* Header title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={14} style={{ color: 'var(--status-critical)' }} />
                    {selectedScan.diagnosed_issue}
                  </span>

                  <span 
                    style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      color: 'var(--primary)',
                      background: 'var(--primary-glow)',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Award size={11} />
                    {(selectedScan.confidence_score * 100).toFixed(0)}% Conf
                  </span>
                </div>

                {/* Short summary block */}
                <p 
                  style={{ 
                    fontSize: '12.5px', 
                    color: 'var(--text-main)', 
                    lineHeight: 1.5, 
                    margin: 0,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    borderLeft: '3px solid var(--primary)'
                  }}
                >
                  {selectedScan.short_summary}
                </p>

                {/* Leaf Scan snapshot thumbnail */}
                {selectedScan.scanned_image_url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <img 
                      src={selectedScan.scanned_image_url} 
                      alt="Diagnostic Scan Snapshot" 
                      style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '8px', 
                        objectFit: 'cover',
                        border: '1px solid var(--card-border)'
                      }} 
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-heading)', fontWeight: 600 }}>Foliage Photograph Profile</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Registered during clinical scan</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
