import { useCallback, useRef, useState } from 'react';

const DIAL_SIZE = 130;
const KNOB_SIZE = 24;
const RADIUS = (DIAL_SIZE - KNOB_SIZE) / 2;
const MAX_SPEED = 6;

interface ShiftDialProps {
  onShift: (vx: number, vy: number) => void;
}

export function ShiftDial({ onShift }: ShiftDialProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const lastSent = useRef({ vx: 0, vy: 0 });

  const sendShift = useCallback((x: number, y: number) => {
    const mag = Math.sqrt(x * x + y * y);
    const clamped = Math.min(mag, 1);
    const vx = mag > 0 ? (x / mag) * clamped * MAX_SPEED : 0;
    const vy = mag > 0 ? (y / mag) * clamped * MAX_SPEED : 0;
    const rvx = Math.round(vx * 10) / 10;
    const rvy = Math.round(vy * 10) / 10;
    if (rvx !== lastSent.current.vx || rvy !== lastSent.current.vy) {
      lastSent.current = { vx: rvx, vy: rvy };
      onShift(rvx, rvy);
    }
  }, [onShift]);

  const posFromEvent = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (clientX - cx) / RADIUS;
    const dy = (clientY - cy) / RADIUS;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 1) return { x: dx / mag, y: dy / mag };
    return { x: dx, y: dy };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    activeRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = posFromEvent(e.clientX, e.clientY);
    setPos(p);
    sendShift(p.x, p.y);
  }, [posFromEvent, sendShift]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!activeRef.current) return;
    const p = posFromEvent(e.clientX, e.clientY);
    setPos(p);
    sendShift(p.x, p.y);
  }, [posFromEvent, sendShift]);

  const handlePointerUp = useCallback(() => {
    activeRef.current = false;
  }, []);

  const handleReset = useCallback(() => {
    setPos({ x: 0, y: 0 });
    sendShift(0, 0);
  }, [sendShift]);

  const isActive = pos.x !== 0 || pos.y !== 0;
  const knobX = DIAL_SIZE / 2 + pos.x * RADIUS - KNOB_SIZE / 2;
  const knobY = DIAL_SIZE / 2 + pos.y * RADIUS - KNOB_SIZE / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative select-none"
        style={{
          width: DIAL_SIZE,
          height: DIAL_SIZE,
          borderRadius: '50%',
          background: '#0a0a12',
          border: `2px solid ${isActive ? '#4a7cff' : '#1a1a25'}`,
          touchAction: 'none',
          cursor: 'pointer'
        }}
      >
        {/* Crosshair lines */}
        <div
          className="absolute"
          style={{
            left: DIAL_SIZE / 2 - 0.5,
            top: 12,
            width: 1,
            height: DIAL_SIZE - 24,
            background: '#1a1a25'
          }}
        />
        <div
          className="absolute"
          style={{
            left: 12,
            top: DIAL_SIZE / 2 - 0.5,
            width: DIAL_SIZE - 24,
            height: 1,
            background: '#1a1a25'
          }}
        />
        {/* Direction labels */}
        <span className="absolute text-center" style={{ fontSize: 8, color: '#555', left: 0, right: 0, top: 3 }}>
          U
        </span>
        <span className="absolute text-center" style={{ fontSize: 8, color: '#555', left: 0, right: 0, bottom: 3 }}>
          D
        </span>
        <span className="absolute" style={{ fontSize: 8, color: '#555', left: 4, top: '50%', transform: 'translateY(-50%)' }}>
          L
        </span>
        <span className="absolute" style={{ fontSize: 8, color: '#555', right: 4, top: '50%', transform: 'translateY(-50%)' }}>
          R
        </span>
        {/* Knob */}
        <div
          className="absolute rounded-full"
          style={{
            left: knobX,
            top: knobY,
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            background: isActive
              ? 'radial-gradient(circle, #6b9bff, #4a7cff)'
              : 'radial-gradient(circle, #555, #333)',
            boxShadow: isActive
              ? '0 0 12px rgba(74,124,255,0.5)'
              : '0 0 6px rgba(0,0,0,0.5)',
            transition: activeRef.current ? 'none' : 'left 0.15s, top 0.15s'
          }}
        />
      </div>
      {isActive && (
        <button
          onClick={handleReset}
          className="text-xs px-3 py-1 rounded-lg transition-all"
          style={{
            background: '#12121a',
            border: '1px solid #1a1a25',
            color: '#888898'
          }}
        >
          Stop
        </button>
      )}
    </div>
  );
}
