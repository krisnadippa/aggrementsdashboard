'use client';

import { DamageMarker } from '@/types';

interface VehicleConditionDiagramProps {
  markers: DamageMarker[];
  onChange?: (markers: DamageMarker[]) => void;
  readOnly?: boolean;
}

type ViewType = 'front' | 'back' | 'left' | 'right';

const VIEW_CONFIG: { view: ViewType; label: string }[] = [
  { view: 'front', label: 'Depan' },
  { view: 'back', label: 'Belakang' },
  { view: 'left', label: 'Kiri' },
  { view: 'right', label: 'Kanan' },
];

const imgMap: Record<ViewType, string> = {
  front: '/images/depan.png',
  back: '/images/belakang.png',
  left: '/images/kiri.png',
  right: '/images/kanan.png',
};

function CarView({
  view,
  label,
  markers,
  readOnly,
  onClick,
}: {
  view: ViewType;
  label: string;
  markers: DamageMarker[];
  readOnly?: boolean;
  onClick?: (x: number, y: number) => void;
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !onClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onClick(x, y);
  };

  return (
    <div className="car-view-container">
      <p className="car-view-label">{label}</p>
      <div
        className={`car-view-canvas ${readOnly ? '' : 'car-view-interactive'}`}
        onClick={handleClick}
        style={{ position: 'relative', width: '100%', aspectRatio: '200 / 140', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: '#ffffff', overflow: 'hidden' }}
      >
        <img
          src={imgMap[view]}
          alt={label}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
        {markers
          .filter((m) => m.view === view)
          .map((m, i) => (
            <div
              key={i}
              className="damage-marker"
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
              title={`Kerusakan di ${label}`}
            />
          ))}
      </div>
      {!readOnly && (
        <p className="car-view-hint">Klik untuk tandai kerusakan</p>
      )}
    </div>
  );
}

export default function VehicleConditionDiagram({
  markers,
  onChange,
  readOnly,
}: VehicleConditionDiagramProps) {
  const handleClick = (view: ViewType) => (x: number, y: number) => {
    if (!onChange) return;
    // Toggle: if marker at same approximate position exists, remove it
    const threshold = 8;
    const existing = markers.findIndex(
      (m) => m.view === view && Math.abs(m.x - x) < threshold && Math.abs(m.y - y) < threshold
    );
    if (existing !== -1) {
      onChange(markers.filter((_, i) => i !== existing));
    } else {
      onChange([...markers, { x, y, view }]);
    }
  };

  return (
    <div>
      <div className="car-diagram-grid">
        {VIEW_CONFIG.map(({ view, label }) => (
          <CarView
            key={view}
            view={view}
            label={label}
            markers={markers}
            readOnly={readOnly}
            onClick={!readOnly ? handleClick(view) : undefined}
          />
        ))}
      </div>
      {!readOnly && markers.length > 0 && (
        <p className="damage-count">
          {markers.length} titik kerusakan ditandai ·{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => onChange && onChange([])}
          >
            Hapus semua
          </button>
        </p>
      )}
    </div>
  );
}
