import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface LightMapConfig {
  version: 1;
  numCannons: number;
  gridColumns: number;
  physicalLights: number[];
  updatedAt?: string;
}

interface NovaSlotsProps {
  /** Number of logical ring slots (fixtures). */
  numCannons: number;
  gridColumns: number;
  send: (msg: Record<string, unknown>) => void;
}

function identityMap(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function normalizeMap(values: number[], n: number): number[] {
  const used = new Set<number>();
  const result = values.slice(0, n).map(value => {
    if (!Number.isInteger(value) || value < 0 || value >= n || used.has(value)) return -1;
    used.add(value);
    return value;
  });
  for (let i = 0; i < n; i++) {
    if (result[i] !== undefined && result[i] >= 0) continue;
    const next = identityMap(n).find(v => !used.has(v));
    result[i] = next ?? i;
    used.add(result[i]);
  }
  return result;
}

/** Position of ring slot i on a unit circle, 12 o'clock clockwise (matches ringLayout). */
function slotPoint(i: number, n: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/**
 * Ring-aware light-map editor: pick a physical laser for each logical ring slot.
 * Reads/writes the same `/api/light-map` the receiver consumes, and can export
 * the mapping as a downloadable JSON config to apply to a project.
 */
export function NovaSlots({ numCannons, gridColumns, send }: NovaSlotsProps) {
  const n = numCannons;
  const [physicalLights, setPhysicalLights] = useState(() => identityMap(n));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [hoveredPhysical, setHoveredPhysical] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const physicalOptions = useMemo(() => identityMap(n), [n]);

  const previewPhysical = useCallback((physicalIndex: number | null) => {
    setHoveredPhysical(physicalIndex);
    if (physicalIndex === null) {
      send({ type: 'physical_preview_clear' });
      return;
    }
    send({ type: 'physical_preview', physicalIndex });
  }, [send]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch('/api/light-map')
      .then(res => res.json())
      .then((config: LightMapConfig) => {
        if (cancelled) return;
        setPhysicalLights(normalizeMap(config.physicalLights, n));
        setUpdatedAt(config.updatedAt ?? null);
        setStatus('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setPhysicalLights(identityMap(n));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [n]);

  useEffect(() => {
    send({ type: 'calibration_mode', enabled: true });
    send({ type: 'physical_preview_clear' });
    return () => {
      send({ type: 'physical_preview_clear' });
      send({ type: 'calibration_mode', enabled: false });
    };
  }, [send]);

  const assignPhysical = useCallback((slot: number, physicalIndex: number) => {
    setPhysicalLights(current => {
      const next = [...current];
      const prevPhysical = next[slot];
      const prevOwner = next.findIndex(v => v === physicalIndex);
      next[slot] = physicalIndex;
      if (prevOwner >= 0 && prevOwner !== slot) next[prevOwner] = prevPhysical;
      return next;
    });
    previewPhysical(physicalIndex);
  }, [previewPhysical]);

  const configPayload = useCallback((): LightMapConfig => ({
    version: 1,
    numCannons: n,
    gridColumns,
    physicalLights,
    updatedAt: new Date().toISOString()
  }), [n, gridColumns, physicalLights]);

  const save = useCallback(() => {
    setStatus('saving');
    fetch('/api/light-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configPayload())
    })
      .then(res => res.json())
      .then((config: LightMapConfig) => {
        setPhysicalLights(normalizeMap(config.physicalLights, n));
        setUpdatedAt(config.updatedAt ?? null);
        setStatus('saved');
      })
      .catch(() => setStatus('error'));
  }, [configPayload, n]);

  const download = useCallback(() => {
    const blob = new Blob([`${JSON.stringify(configPayload(), null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = linkRef.current;
    if (a) {
      a.href = url;
      a.download = 'light-map.json';
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [configPayload]);

  const resetIdentity = useCallback(() => {
    setPhysicalLights(identityMap(n));
    setSelectedSlot(null);
    previewPhysical(null);
  }, [n, previewPhysical]);

  const box = 300;
  const cx = box / 2;
  const cy = box / 2;
  const ringR = box * 0.36;
  const dotR = box * 0.1;

  return (
    <div className="flex flex-col gap-3" style={{ color: '#e8e8f0' }}>
      <span className="text-xs" style={{ color: '#888898' }}>
        Tap a ring slot, then choose which physical laser drives it. Hovering previews the laser on the canvas.
      </span>

      <div className="flex flex-wrap gap-4 items-start">
        <svg
          width={box}
          height={box}
          style={{ background: '#0a0a12', borderRadius: 16, border: '1px solid #1f2330', flex: '0 0 auto' }}
          onMouseLeave={() => previewPhysical(null)}
        >
          <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="#1f2330" strokeWidth={1.5} />
          {physicalLights.map((physicalIndex, slot) => {
            const p = slotPoint(slot, n);
            const px = cx + p.x * ringR;
            const py = cy + p.y * ringR;
            const isSelected = selectedSlot === slot;
            const isHovered = hoveredPhysical === physicalIndex;
            return (
              <g key={slot} style={{ cursor: 'pointer' }} onClick={() => { setSelectedSlot(slot); previewPhysical(physicalIndex); }}>
                <circle
                  cx={px}
                  cy={py}
                  r={dotR}
                  fill={isSelected ? 'rgba(124,74,255,0.28)' : '#101119'}
                  stroke={isSelected ? '#a06bff' : isHovered ? '#fff' : '#2a2d38'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                <text x={px} y={py - 4} textAnchor="middle" fontSize={10} fill="#6f7280">
                  slot {slot + 1}
                </text>
                <text x={px} y={py + 9} textAnchor="middle" fontSize={12} fontWeight={800} fill="#e8e8f0">
                  P{physicalIndex + 1}
                </text>
              </g>
            );
          })}
        </svg>

        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          {selectedSlot === null ? (
            <div style={{ padding: 12, color: '#888898', fontSize: 13 }}>No slot selected</div>
          ) : (
            <div className="flex flex-col gap-2">
              <span style={{ fontSize: 13, fontWeight: 800 }}>
                Ring slot {selectedSlot + 1} → physical laser
              </span>
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 6 }}
                onMouseLeave={() => previewPhysical(null)}
              >
                {physicalOptions.map(physicalIndex => (
                  <button
                    key={physicalIndex}
                    type="button"
                    onMouseEnter={() => previewPhysical(physicalIndex)}
                    onFocus={() => previewPhysical(physicalIndex)}
                    onClick={() => assignPhysical(selectedSlot, physicalIndex)}
                    style={{
                      minHeight: 36,
                      borderRadius: 7,
                      border: physicalIndex === physicalLights[selectedSlot] ? '1px solid #a06bff' : '1px solid #202432',
                      background: physicalIndex === physicalLights[selectedSlot] ? 'rgba(124,74,255,0.22)' : '#151722',
                      color: physicalIndex === physicalLights[selectedSlot] ? '#fff' : '#b8bccb',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    Laser {physicalIndex + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={save}
          disabled={status === 'saving'}
          style={{ minHeight: 38, padding: '0 16px', borderRadius: 8, border: '1px solid #7c4aff', background: status === 'saving' ? 'rgba(124,74,255,0.16)' : '#5a2ec8', color: '#fff', fontWeight: 800 }}
        >
          {status === 'saving' ? 'Applying' : 'Apply to project'}
        </button>
        <button
          type="button"
          onClick={download}
          style={{ minHeight: 38, padding: '0 14px', borderRadius: 8, border: '1px solid #2a2d38', background: '#12131d', color: '#c8ccdb', fontWeight: 700 }}
        >
          Download config
        </button>
        <button
          type="button"
          onClick={resetIdentity}
          style={{ minHeight: 38, padding: '0 14px', borderRadius: 8, border: '1px solid #2a2d38', background: '#12131d', color: '#9aa0b4', fontWeight: 700 }}
        >
          Reset
        </button>
        <span style={{ color: status === 'error' ? '#ff6b6b' : '#6f7280', fontSize: 12 }}>
          {status === 'loading'
            ? 'Loading'
            : status === 'saved'
              ? 'Applied'
              : status === 'error'
                ? 'Config unavailable'
                : updatedAt
                  ? `Applied ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
        </span>
        <a ref={linkRef} style={{ display: 'none' }} aria-hidden />
      </div>
    </div>
  );
}
