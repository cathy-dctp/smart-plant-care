import { Sprout, Moon, SunMedium, LayoutDashboard, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

export interface HeaderProps {
  theme: string;
  toggleTheme: () => void;
  activeTab: 'home' | 'plants' | 'diagnose';
  setActiveTab: (tab: 'home' | 'plants' | 'diagnose') => void;
}

export default function Header({ theme, toggleTheme, activeTab, setActiveTab }: HeaderProps) {
  return (
    <motion.header 
      className="glass-header"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Sprout size={28} className="brand-icon" />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.3px' }}>smart.homecare</span>
          <span style={{ fontSize: '10px', opacity: 0.75, fontWeight: 500, marginTop: '2px' }}>
            📍 Kitchener, ON • Apartment
          </span>
        </div>
      </div>

      {/* Modern Center Tabs Navigation */}
      <div 
        className="nav-tabs-wrapper"
        style={{
          display: 'flex',
          gap: '4px',
          padding: '4px',
          background: theme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
          borderRadius: '100px',
          border: '1px solid var(--card-border)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {[
          { id: 'home', label: 'Home Center', icon: LayoutDashboard },
          { id: 'plants', label: 'My Plants', icon: Sprout },
          { id: 'diagnose', label: 'AI Doctor', icon: Brain }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '100px',
                border: 'none',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-main)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="nav-controls">
        <motion.button 
          className="btn-icon-only" 
          onClick={toggleTheme} 
          title="Toggle Theme"
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
        >
          {theme === 'light' ? <Moon size={18} /> : <SunMedium size={18} />}
        </motion.button>
      </div>
    </motion.header>
  );
}
