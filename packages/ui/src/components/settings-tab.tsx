import { useCallback, useEffect, useMemo, useState } from 'react';

interface LightMapConfig {
  version: 1;
  numCannons: number;
  gridColumns: number;
  physicalLights: number[];
  updatedAt?: string;
}

interface SettingsTabProps {
  numCannons: number;
  gridColumns: number;
  send: (msg: Record<string, unknown>) => void;
}

function identityMap(numCannons: number): number[] {
  return Array.from({ length: numCannons }, (_, index) => index);
}

function labelFor(index: number, columns: number): string {
  const row = Math.floor(index / columns) + 1;
  const col = (index % columns) + 1;
  return `${row}.${col}`;
}

function normalizeMap(values: number[], numCannons: number): number[] {
  const used = new Set<number>();
  const result = values.slice(0, numCannons).map(value => {
    if (!Number.isInteger(value) || value < 0 || value >= numCannons || used.has(value)) return -1;
    used.add(value);
    return value;
  });

  for (let index = 0; index < numCannons; index++) {
    if (result[index] !== undefined && result[index] >= 0) continue;
    const next = identityMap(numCannons).find(value => !used.has(value));
    result[index] = next ?? index;
    used.add(result[index]);
  }

  return result;
}

export function SettingsTab({ numCannons, gridColumns, send }: SettingsTabProps) {
  const [physicalLights, setPhysicalLights] = useState(() => identityMap(numCannons));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [hoveredPhysical, setHoveredPhysical] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const physicalOptions = useMemo(() => identityMap(numCannons), [numCannons]);

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
        setPhysicalLights(normalizeMap(config.physicalLights, numCannons));
        setUpdatedAt(config.updatedAt ?? null);
        setStatus('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setPhysicalLights(identityMap(numCannons));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [numCannons]);

  useEffect(() => {
    send({ type: 'calibration_mode', enabled: true });
    send({ type: 'physical_preview_clear' });
    return () => {
      send({ type: 'physical_preview_clear' });
      send({ type: 'calibration_mode', enabled: false });
    };
  }, [send]);

  const assignPhysical = useCallback((logicalIndex: number, physicalIndex: number) => {
    setPhysicalLights(current => {
      const next = [...current];
      const previousPhysical = next[logicalIndex];
      const previousOwner = next.findIndex(value => value === physicalIndex);
      next[logicalIndex] = physicalIndex;
      if (previousOwner >= 0 && previousOwner !== logicalIndex) {
        next[previousOwner] = previousPhysical;
      }
      return next;
    });
    setOpenIndex(null);
    previewPhysical(physicalIndex);
  }, [previewPhysical]);

  const save = useCallback(() => {
    setStatus('saving');
    fetch('/api/light-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        numCannons,
        gridColumns,
        physicalLights
      })
    })
      .then(res => res.json())
      .then((config: LightMapConfig) => {
        setPhysicalLights(normalizeMap(config.physicalLights, numCannons));
        setUpdatedAt(config.updatedAt ?? null);
        setStatus('saved');
      })
      .catch(() => setStatus('error'));
  }, [gridColumns, numCannons, physicalLights]);

  const resetIdentity = useCallback(() => {
    const next = identityMap(numCannons);
    setPhysicalLights(next);
    setSelectedIndex(null);
    setOpenIndex(null);
    previewPhysical(null);
  }, [numCannons, previewPhysical]);

  const rows = Math.ceil(numCannons / gridColumns);
  const selectedPhysical = selectedIndex === null ? null : physicalLights[selectedIndex];

  return (
    <div className="flex flex-col gap-4" style={{ color: '#e8e8f0' }}>
      <div
        className="flex flex-wrap gap-3 items-start"
        style={{ width: '100%', maxWidth: 760 }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${gridColumns}, minmax(34px, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(34px, 1fr))`,
            gap: 6,
            flex: '1 1 300px',
            maxWidth: 430,
            width: '100%',
            alignSelf: 'start'
          }}
          onMouseLeave={() => previewPhysical(null)}
        >
          {physicalLights.map((physicalIndex, logicalIndex) => {
            const isSelected = selectedIndex === logicalIndex;
            const isHoveredPhysical = hoveredPhysical === physicalIndex;

            return (
              <button
                key={logicalIndex}
                type="button"
                onClick={() => {
                  setSelectedIndex(logicalIndex);
                  setOpenIndex(openIndex === logicalIndex ? null : logicalIndex);
                  previewPhysical(physicalIndex);
                }}
                className="relative transition-all"
                style={{
                  minHeight: 40,
                  aspectRatio: '1',
                  borderRadius: 8,
                  border: isSelected ? '2px solid #4a7cff' : isHoveredPhysical ? '2px solid #fff' : '1px solid #1f2330',
                  background: isSelected ? 'rgba(74,124,255,0.18)' : '#101119',
                  color: '#e8e8f0',
                  display: 'grid',
                  placeItems: 'center',
                  padding: 4
                }}
              >
                <span style={{ fontSize: 10, color: '#6f7280', lineHeight: 1 }}>{labelFor(logicalIndex, gridColumns)}</span>
                <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>P{physicalIndex + 1}</span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            flex: '0 1 280px',
            minWidth: 220,
            border: '1px solid #1f2330',
            borderRadius: 8,
            background: '#0f1018',
            overflow: 'hidden'
          }}
        >
          {selectedIndex === null ? (
            <div
              style={{
                minHeight: 104,
                padding: 12,
                display: 'grid',
                alignContent: 'center',
                gap: 6
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 800, color: '#e8e8f0' }}>
                No spot selected
              </span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === selectedIndex ? null : selectedIndex)}
                className="w-full flex items-center justify-between"
                style={{
                  minHeight: 44,
                  padding: '0 12px',
                  color: '#e8e8f0',
                  background: '#12131d',
                  border: 0,
                  borderBottom: openIndex === selectedIndex ? '1px solid #1f2330' : 0
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  Grid {labelFor(selectedIndex, gridColumns)}
                </span>
                <span style={{ fontSize: 13, color: '#9aa0b4' }}>
                  Physical {selectedPhysical === null ? '-' : selectedPhysical + 1}
                </span>
              </button>

              {openIndex === selectedIndex && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                    gap: 6,
                    maxHeight: 210,
                    overflowY: 'auto',
                    padding: 8
                  }}
                  onMouseLeave={() => previewPhysical(null)}
                >
                  {physicalOptions.map(physicalIndex => (
                    <button
                      key={physicalIndex}
                      type="button"
                      onMouseEnter={() => previewPhysical(physicalIndex)}
                      onFocus={() => previewPhysical(physicalIndex)}
                      onClick={() => assignPhysical(selectedIndex, physicalIndex)}
                      style={{
                        minHeight: 36,
                        borderRadius: 7,
                        border: physicalIndex === selectedPhysical ? '1px solid #4a7cff' : '1px solid #202432',
                        background: physicalIndex === selectedPhysical ? 'rgba(74,124,255,0.2)' : '#151722',
                        color: physicalIndex === selectedPhysical ? '#ffffff' : '#b8bccb',
                        fontSize: 12,
                        fontWeight: 700
                      }}
                    >
                      Light {physicalIndex + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" style={{ maxWidth: 760 }}>
        <button
          type="button"
          onClick={save}
          disabled={status === 'saving'}
          style={{
            minHeight: 40,
            padding: '0 16px',
            borderRadius: 8,
            border: '1px solid #4a7cff',
            background: status === 'saving' ? 'rgba(74,124,255,0.16)' : '#1b3d8f',
            color: '#fff',
            fontWeight: 800
          }}
        >
          {status === 'saving' ? 'Saving' : 'Save'}
        </button>
        <button
          type="button"
          onClick={resetIdentity}
          style={{
            minHeight: 40,
            padding: '0 14px',
            borderRadius: 8,
            border: '1px solid #2a2d38',
            background: '#12131d',
            color: '#9aa0b4',
            fontWeight: 700
          }}
        >
          Reset
        </button>
        <span
          style={{
            alignSelf: 'center',
            color: status === 'error' ? '#ff6b6b' : '#6f7280',
            fontSize: 12,
            minHeight: 18
          }}
        >
          {status === 'loading'
            ? 'Loading'
            : status === 'saved'
              ? 'Saved'
              : status === 'error'
                ? 'Config unavailable'
                : updatedAt
                  ? `Saved ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
        </span>
      </div>
    </div>
  );
}
