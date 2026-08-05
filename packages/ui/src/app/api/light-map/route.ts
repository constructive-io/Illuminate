import { loadWavegridConfig } from '@wavegrid/layout';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { dirname, resolve } from 'path';

const LIGHT_MAP_FILE = process.env.LIGHT_MAP_CONFIG || resolve(process.cwd(), '../../deploy/light-map.json');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Physical light mapping is sized to the resolved installation layout.
function layoutDims(): { numCannons: number; gridColumns: number } {
  const { layout } = loadWavegridConfig();
  return { numCannons: layout.count, gridColumns: layout.cols };
}

interface LightMapConfig {
  version: 1;
  numCannons: number;
  gridColumns: number;
  physicalLights: number[];
  updatedAt?: string;
}

function identityMap(numCannons: number): number[] {
  return Array.from({ length: numCannons }, (_, index) => index);
}

function normalizeConfig(input: Partial<LightMapConfig> | null): LightMapConfig {
  const dims = layoutDims();
  const numCannons = input?.numCannons ?? dims.numCannons;
  const gridColumns = input?.gridColumns ?? dims.gridColumns;
  const fallback = identityMap(numCannons);
  const source = Array.isArray(input?.physicalLights) ? input.physicalLights : fallback;
  const used = new Set<number>();
  const physicalLights = source.slice(0, numCannons).map((value) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n >= numCannons || used.has(n)) {
      return -1;
    }
    used.add(n);
    return n;
  });

  for (let index = 0; index < numCannons; index++) {
    if (physicalLights[index] !== undefined && physicalLights[index] >= 0) continue;
    const next = fallback.find(value => !used.has(value));
    physicalLights[index] = next ?? index;
    used.add(physicalLights[index]);
  }

  return {
    version: 1,
    numCannons,
    gridColumns,
    physicalLights,
    updatedAt: input?.updatedAt
  };
}

function loadConfig(): LightMapConfig {
  try {
    const raw = readFileSync(LIGHT_MAP_FILE, 'utf8');
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return normalizeConfig(null);
  }
}

export async function GET() {
  return NextResponse.json(loadConfig());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const dims = layoutDims();
  const config = normalizeConfig({
    version: 1,
    numCannons: Number(body.numCannons) || dims.numCannons,
    gridColumns: Number(body.gridColumns) || dims.gridColumns,
    physicalLights: body.physicalLights,
    updatedAt: new Date().toISOString()
  });

  mkdirSync(dirname(LIGHT_MAP_FILE), { recursive: true });
  writeFileSync(LIGHT_MAP_FILE, `${JSON.stringify(config, null, 2)}\n`);

  return NextResponse.json(config);
}
