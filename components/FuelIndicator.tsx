'use client';

interface FuelIndicatorProps {
  value: number; // 0-100
  onChange?: (v: number) => void;
  readOnly?: boolean;
}

const SEGMENTS = 8; // E, 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8, F

function FuelGauge({ value }: { value: number }) {
  // Arc from 225° to -45° (270° sweep)
  const cx = 70, cy = 70, r = 54;
  const startAngle = 225;
  const endAngle = 315; // going clockwise, total 270°
  const totalAngle = 270;

  // Needle angle
  const needleAngle = startAngle + (value / 100) * totalAngle;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcX = (angle: number, radius: number) => {
    const val = cx + radius * Math.cos(toRad(angle));
    return Math.round(val * 1000) / 1000;
  };
  const arcY = (angle: number, radius: number) => {
    const val = cy + radius * Math.sin(toRad(angle));
    return Math.round(val * 1000) / 1000;
  };

  // Gradient arc — split into colored segments
  const segmentColors = (seg: number, total: number) => {
    const pct = seg / total;
    if (pct <= 0.25) return '#e53e3e';
    if (pct <= 0.5) return '#d69e2e';
    return '#38a169';
  };

  const segments = 36; // smooth arc
  const arcPath = () => {
    const paths: string[] = [];
    for (let i = 0; i < segments; i++) {
      const a1 = startAngle + (i / segments) * totalAngle;
      const a2 = startAngle + ((i + 1) / segments) * totalAngle;
      const x1 = arcX(a1, r), y1 = arcY(a1, r);
      const x2 = arcX(a2, r), y2 = arcY(a2, r);
      paths.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${segmentColors(i, segments)}" stroke-width="10" stroke-linecap="round"/>`
      );
    }
    return paths.join('');
  };

  // Filled portion
  const filledAngle = startAngle + (value / 100) * totalAngle;

  const needleLen = 40;
  const nx = Math.round((cx + needleLen * Math.cos(toRad(needleAngle))) * 1000) / 1000;
  const ny = Math.round((cy + needleLen * Math.sin(toRad(needleAngle))) * 1000) / 1000;

  return (
    <svg
      viewBox="0 0 140 140"
      width="140"
      height="140"
      className="fuel-gauge-svg"
    >
      {/* Background track */}
      {Array.from({ length: segments }).map((_, i) => {
        const a1 = startAngle + (i / segments) * totalAngle;
        const a2 = startAngle + ((i + 1) / segments) * totalAngle;
        const x1 = arcX(a1, r), y1 = arcY(a1, r);
        const x2 = arcX(a2, r), y2 = arcY(a2, r);
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#e2e8f0"
            strokeWidth="10"
            strokeLinecap="round"
          />
        );
      })}
      {/* Filled arc */}
      {Array.from({ length: segments }).map((_, i) => {
        const pct = (i + 0.5) / segments;
        const currAngle = startAngle + pct * totalAngle;
        if (currAngle > filledAngle) return null;
        const a1 = startAngle + (i / segments) * totalAngle;
        const a2 = startAngle + ((i + 1) / segments) * totalAngle;
        const x1 = arcX(a1, r), y1 = arcY(a1, r);
        const x2 = arcX(a2, r), y2 = arcY(a2, r);
        return (
          <line
            key={`f${i}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={segmentColors(i, segments)}
            strokeWidth="10"
            strokeLinecap="round"
          />
        );
      })}
      {/* Tick marks */}
      {Array.from({ length: 9 }).map((_, i) => {
        const angle = startAngle + (i / 8) * totalAngle;
        const inner = r - 12, outer = r - 6;
        return (
          <line
            key={`tick${i}`}
            x1={arcX(angle, inner)} y1={arcY(angle, inner)}
            x2={arcX(angle, outer)} y2={arcY(angle, outer)}
            stroke="#718096"
            strokeWidth="1.5"
          />
        );
      })}
      {/* Needle */}
      <line
        x1={cx} y1={cy} x2={nx} y2={ny}
        stroke="#1a202c"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="5" fill="#1a202c" />
      {/* Labels */}
      <text x={arcX(startAngle, r + 14)} y={arcY(startAngle, r + 14) + 4}
        textAnchor="middle" fontSize="9" fill="#e53e3e" fontWeight="700">E</text>
      <text x={arcX(endAngle, r + 14)} y={arcY(endAngle, r + 14) + 4}
        textAnchor="middle" fontSize="9" fill="#38a169" fontWeight="700">F</text>
      {/* Value text */}
      <text x={cx} y={cy + 26} textAnchor="middle" fontSize="11" fill="#4a5568" fontWeight="600">
        {value}%
      </text>
    </svg>
  );
}

export default function FuelIndicator({ value, onChange, readOnly }: FuelIndicatorProps) {
  return (
    <div className="fuel-indicator">
      <FuelGauge value={value} />
      {!readOnly && onChange && (
        <div className="fuel-slider-wrap">
          <span className="fuel-label-e">E</span>
          <input
            type="range"
            min={0}
            max={100}
            step={12.5}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="fuel-slider"
          />
          <span className="fuel-label-f">F</span>
        </div>
      )}
    </div>
  );
}
