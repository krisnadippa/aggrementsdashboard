'use client';

import { useRef, useEffect, useCallback } from 'react';

interface SignaturePadProps {
  value: string; // base64 data URL
  onChange: (dataUrl: string) => void;
  label?: string;
  width?: number;
  height?: number;
  readOnly?: boolean;
}

export default function SignaturePad({
  value,
  onChange,
  label,
  width = 300,
  height = 120,
  readOnly = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas with white background to support high-compression JPEG
  const initCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Restore saved signature on mount or value change (from outside)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear and fill white background
    initCanvas(canvas);
    
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    }
  }, [value, initCanvas]);

  const getPos = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      drawing.current = true;
      const canvas = canvasRef.current!;
      lastPos.current = getPos(e, canvas);
    },
    []
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!drawing.current) return;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      const pos = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 2.0; // thicker for compressed jpeg clarity
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      lastPos.current = pos;
    },
    []
  );

  const endDraw = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current!;
    // Use low-quality JPEG to keep base64 string extremely small (approx 1KB - 2KB)
    onChange(canvas.toDataURL('image/jpeg', 0.2));
  }, [onChange]);

  const clear = () => {
    const canvas = canvasRef.current!;
    initCanvas(canvas);
    onChange('');
  };

  return (
    <div className="sig-pad-wrapper">
      {label && <p className="sig-pad-label">{label}</p>}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="sig-pad-canvas"
        onMouseDown={readOnly ? undefined : startDraw}
        onMouseMove={readOnly ? undefined : draw}
        onMouseUp={readOnly ? undefined : endDraw}
        onMouseLeave={readOnly ? undefined : endDraw}
        onTouchStart={readOnly ? undefined : startDraw}
        onTouchMove={readOnly ? undefined : draw}
        onTouchEnd={readOnly ? undefined : endDraw}
        style={{ cursor: readOnly ? 'default' : 'crosshair' }}
      />
      {!readOnly && (
        <button type="button" className="sig-pad-clear" onClick={clear}>
          Hapus Tanda Tangan
        </button>
      )}
    </div>
  );
}
