import type { ReactNode } from 'react';

interface ControlGridProps {
  children: ReactNode;
  /** Minimum width (px) each cell needs before columns collapse to stack */
  minCellWidth?: number;
  gap?: number;
}

/**
 * Responsive grid for control panels. Lays children out in columns when
 * there is enough horizontal space, stacks them vertically when narrow.
 * Uses CSS `auto-fit` + `minmax` so it adapts to any container width
 * without explicit breakpoints or orientation props.
 */
export function ControlGrid({ children, minCellWidth = 200, gap = 20 }: ControlGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minCellWidth}px, 1fr))`,
        gap,
        alignItems: 'start'
      }}
    >
      {children}
    </div>
  );
}

interface ControlGroupProps {
  children: ReactNode;
  /** Optional label displayed above the group */
  label?: string;
}

/**
 * A labeled group of controls within a ControlGrid cell.
 */
export function ControlGroup({ children, label }: ControlGroupProps) {
  return (
    <div className="space-y-3">
      {label && (
        <p
          className="text-xs font-medium"
          style={{ color: '#888898', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {label}
        </p>
      )}
      {children}
    </div>
  );
}
