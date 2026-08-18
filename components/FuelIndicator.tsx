'use client';

interface FuelIndicatorProps {
  value: number; // 0-100
  onChange?: (v: number) => void;
  readOnly?: boolean;
  vehicleType?: 'petrol' | 'ev';
}

// Visual growing vertical bars for Petrol/BBM dashboard style
function FuelBars({ value }: { value: number }) {
  const numBars = 8;
  const barWidth = 8;
  const barGap = 3;
  
  const getBarColor = (index: number, isActive: boolean) => {
    if (!isActive) return 'var(--border)'; // gray/inactive border color
    
    // Dashboard colors based on segment position
    if (index < 2) return '#ef4444'; // Red for low fuel (1/4 or less)
    if (index < 4) return '#f59e0b'; // Amber/Yellow for mid fuel (1/2 or less)
    return '#10b981'; // Green for high fuel
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: `${barGap}px`, height: '24px' }}>
      {Array.from({ length: numBars }).map((_, i) => {
        const threshold = ((i + 1) / numBars) * 100;
        const isActive = value >= threshold - 5; // slight margin for slider steps
        const barHeight = 6 + i * 2.5; // growing height
        return (
          <div
            key={i}
            style={{
              width: `${barWidth}px`,
              height: `${barHeight}px`,
              backgroundColor: getBarColor(i, isActive),
              borderRadius: '1.5px',
              transition: 'background-color 0.2s ease'
            }}
          />
        );
      })}
    </div>
  );
}

export default function FuelIndicator({
  value,
  onChange,
  readOnly,
  vehicleType = 'petrol',
}: FuelIndicatorProps) {
  const isEv = vehicleType === 'ev';

  // Choose Icon based on vehicle type
  const renderIcon = () => {
    if (isEv) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', flexShrink: 0 }}>
          <rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect>
          <line x1="22" y1="11" x2="22" y2="13"></line>
        </svg>
      );
    }
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', flexShrink: 0 }}>
        <path d="M3 22V2h11v20H3zM14 6h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4M9 8h2M9 12h2"></path>
      </svg>
    );
  };

  // Color logic for horizontal EV bar indicator
  const barColor = value < 20 ? 'var(--danger)' : value < 50 ? 'var(--warning)' : 'var(--success)';

  // ─── READ ONLY VIEW ───
  if (readOnly) {
    if (!isEv) {
      // Petrol: growing dashboard bars
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: '240px', background: 'var(--bg-hover)', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
          {renderIcon()}
          <FuelBars value={value} />
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{value}%</span>
        </div>
      );
    }

    // EV: horizontal battery bar
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '240px', background: 'var(--bg-hover)', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
        {renderIcon()}
        <div style={{ flex: 1, height: '12px', background: '#cbd5e1', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            width: `${value}%`,
            height: '100%',
            background: barColor,
            transition: 'width 0.3s ease'
          }} />
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{value}%</span>
      </div>
    );
  }

  // ─── INTERACTIVE MODE (EDITABLE) ───
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
        <span>{isEv ? 'KAPASITAS BATERAI:' : 'LEVEL BBM:'}</span>
        <span style={{ color: 'var(--accent)' }}>{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={value}
        onChange={(e) => onChange && onChange(Number(e.target.value))}
        style={{ width: '100%', height: '6px', accentColor: 'var(--accent)', cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-hover)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        {renderIcon()}
        {isEv ? (
          // EV: battery progress bar
          <div style={{ flex: 1, height: '14px', background: '#cbd5e1', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: `${value}%`,
              height: '100%',
              background: barColor,
              transition: 'width 0.2s ease, background-color 0.2s ease'
            }} />
          </div>
        ) : (
          // Petrol: growing segments
          <div style={{ display: 'flex', alignItems: 'center', height: '24px', marginLeft: '0.25rem' }}>
            <FuelBars value={value} />
          </div>
        )}
      </div>
    </div>
  );
}
