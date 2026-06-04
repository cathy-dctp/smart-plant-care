import { motion } from 'framer-motion';

export interface AmbientHydroGaugeProps {
  percentage: number; // 0 to 100
  size?: number; // Outer diameter in pixels
  label?: string; // e.g. "Soil Moisture"
  unit?: string; // e.g. "%"
}

export default function AmbientHydroGauge({ percentage, size = 120, label, unit = "%" }: AmbientHydroGaugeProps) {
  // Normalize percentage
  const pct = Math.min(Math.max(percentage, 0), 100);
  
  // Choose theme colors dynamically based on hydration levels
  let colorTheme = {
    primary: 'var(--primary)',
    secondary: '#10b981',
    glow: 'rgba(16, 185, 129, 0.15)',
    gradientId: 'hydro-healthy',
    stopStart: '#10b981',
    stopEnd: '#059669',
    waveSpeed: 10 // slower
  };

  if (pct < 20.0) {
    // Critical Dehydration: Pulse Coral Red
    colorTheme = {
      primary: 'var(--status-critical)',
      secondary: '#f87171',
      glow: 'rgba(239, 68, 68, 0.35)',
      gradientId: 'hydro-critical',
      stopStart: '#ef4444',
      stopEnd: '#b91c1c',
      waveSpeed: 4 // highly urgent ripples
    };
  } else if (pct < 40.0) {
    // Dry / Warning: Amber Orange
    colorTheme = {
      primary: 'var(--status-warning)',
      secondary: '#fbbf24',
      glow: 'rgba(245, 158, 11, 0.2)',
      gradientId: 'hydro-warning',
      stopStart: '#f59e0b',
      stopEnd: '#d97706',
      waveSpeed: 7
    };
  } else {
    // Healthy / Hydrated: Aquamarine Blue-Green
    colorTheme = {
      primary: 'var(--secondary)',
      secondary: '#22d3ee',
      glow: 'rgba(8, 145, 178, 0.15)',
      gradientId: 'hydro-healthy',
      stopStart: '#06b6d4',
      stopEnd: '#0891b2',
      waveSpeed: 12
    };
  }

  // Circle path calculations
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  // Wave ripple math
  // We represent the water body using a Framer Motion-animated y shift
  const waveHeight = radius * 2 * (1 - pct / 100) + strokeWidth;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div 
        style={{ 
          position: 'relative', 
          width: `${size}px`, 
          height: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          boxShadow: pct < 20 ? `0 0 20px ${colorTheme.glow}` : 'none',
          transition: 'box-shadow 0.3s ease'
        }}
      >
        {/* Animated glowing backdrop ring */}
        {pct < 20 && (
          <motion.div
            style={{
              position: 'absolute',
              width: '94%',
              height: '94%',
              borderRadius: '50%',
              border: `2px solid ${colorTheme.primary}`,
              opacity: 0.15,
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <svg 
          width={size} 
          height={size} 
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          <defs>
            {/* Color Gradients */}
            <linearGradient id={colorTheme.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorTheme.stopStart} />
              <stop offset="100%" stopColor={colorTheme.stopEnd} />
            </linearGradient>
            
            {/* Wave Clipping Mask */}
            <clipPath id={`hydro-clip-${colorTheme.gradientId}`}>
              <motion.path
                d={`M -20,${waveHeight} 
                    Q ${radius * 0.5},${waveHeight - 4} ${radius},${waveHeight} 
                    T ${radius * 2 + 20},${waveHeight} 
                    L ${size},${size} 
                    L -20,${size} Z`}
                animate={{
                  d: [
                    `M -20,${waveHeight} Q ${radius * 0.5},${waveHeight - 5} ${radius},${waveHeight} T ${radius * 2 + 20},${waveHeight} L ${size},${size} L -20,${size} Z`,
                    `M -20,${waveHeight} Q ${radius * 0.5},${waveHeight + 5} ${radius},${waveHeight} T ${radius * 2 + 20},${waveHeight} L ${size},${size} L -20,${size} Z`,
                    `M -20,${waveHeight} Q ${radius * 0.5},${waveHeight - 5} ${radius},${waveHeight} T ${radius * 2 + 20},${waveHeight} L ${size},${size} L -20,${size} Z`
                  ]
                }}
                transition={{
                  duration: colorTheme.waveSpeed,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />
            </clipPath>
          </defs>

          {/* Background Ring Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(0,0,0,0.05)"
            strokeWidth={strokeWidth}
          />

          {/* Translucent Frosted Glass Inside Fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 2}
            fill="var(--card-bg)"
            style={{ backdropFilter: 'blur(4px)' }}
          />

          {/* Rippling Liquid Fill (using wave mask clip) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth / 2}
            fill={`url(#${colorTheme.gradientId})`}
            clipPath={`url(#hydro-clip-${colorTheme.gradientId})`}
            style={{ opacity: 0.85, transform: 'rotate(90deg)', transformOrigin: 'center' }}
          />

          {/* Active Progress Rim Ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={`url(#${colorTheme.gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </svg>

        {/* Text Readout in Center of Circle */}
        <div 
          style={{ 
            position: 'absolute', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <span 
            style={{ 
              fontSize: '22px', 
              fontWeight: 800, 
              color: 'var(--text-heading)',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '-0.5px'
            }}
          >
            {pct.toFixed(0)}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>{unit}</span>
          </span>
          {label && (
            <span 
              style={{ 
                fontSize: '9.5px', 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                fontWeight: 600,
                letterSpacing: '0.2px',
                marginTop: '1px'
              }}
            >
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
