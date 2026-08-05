'use client';

import { type Layout, presets } from '@wavegrid/layout/client';
import { useEffect, useState } from 'react';

export interface GridConfig {
  simulatorUrl: string;
  runMode?: string;
  layout: Layout;
  numCannons: number;
  gridColumns: number;
}

/**
 * Fetch the resolved layout/config from the runtime API route.
 * A single UI build serves any installation — the layout (fixtures,
 * topology, counts) is the source of geometry.
 */
export function useConfig(): GridConfig | null {
  const [config, setConfig] = useState<GridConfig | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: GridConfig) => setConfig(data))
      .catch(() => {
        const layout = presets['grid-7x7']();
        setConfig({
          simulatorUrl: 'ws://localhost:3000',
          layout,
          numCannons: layout.count,
          gridColumns: layout.cols
        });
      });
  }, []);

  return config;
}
