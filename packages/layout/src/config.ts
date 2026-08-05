import { createConfigLoader } from 'confstash';

import { resolveLayout } from './presets';
import { Layout, RunMode, WavegridConfig } from './types';

export const DEFAULT_CONFIG: WavegridConfig = {
  layout: { preset: 'grid-7x7' },
  mode: 'auto',
  simpleModeMax: 40,
  server: { host: '0.0.0.0', port: 3000 },
  ui: { port: 3003 }
};

function toInt(value: string | undefined): number | undefined {
  if (value == null || value.trim() === '') return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Map environment variables into a config layer. Env sits just below CLI
 * overrides so a single build can be re-pointed at another layout at runtime.
 */
function envLayer(env: NodeJS.ProcessEnv): Partial<WavegridConfig> {
  const out: Partial<WavegridConfig> = {};

  if (env.WAVEGRID_LAYOUT) out.layout = { preset: env.WAVEGRID_LAYOUT };
  if (env.WAVEGRID_MODE === 'simple' || env.WAVEGRID_MODE === 'distributed' || env.WAVEGRID_MODE === 'auto') {
    out.mode = env.WAVEGRID_MODE;
  }
  const simpleMax = toInt(env.WAVEGRID_SIMPLE_MAX);
  if (simpleMax != null) out.simpleModeMax = simpleMax;

  const serverPort = toInt(env.PORT ?? env.SIM_PORT);
  if (serverPort != null || env.HOST) {
    out.server = {
      ...DEFAULT_CONFIG.server,
      ...(serverPort != null ? { port: serverPort } : {}),
      ...(env.HOST ? { host: env.HOST } : {})
    };
  }
  const uiPort = toInt(env.UI_PORT);
  if (uiPort != null) out.ui = { port: uiPort };

  return out;
}

export function createWavegridLoader() {
  return createConfigLoader<WavegridConfig>({
    tool: 'wavegrid',
    defaults: DEFAULT_CONFIG,
    envLayer
  });
}

export interface ResolvedConfig {
  config: WavegridConfig;
  layout: Layout;
  runMode: RunMode;
  filepath?: string;
}

/** Derive the run profile from the config + resolved cannon count. */
export function resolveMode(config: WavegridConfig, layout: Layout): RunMode {
  if (config.mode === 'simple' || config.mode === 'distributed') return config.mode;
  return layout.count < config.simpleModeMax ? 'simple' : 'distributed';
}

export interface LoadOptions {
  cwd?: string;
  configFile?: string;
  overrides?: Partial<WavegridConfig>;
  env?: NodeJS.ProcessEnv;
}

/** Load config from disk/env, resolve the layout, and derive the run mode. */
export function loadWavegridConfig(opts: LoadOptions = {}): ResolvedConfig {
  const loader = createWavegridLoader();
  const { config, filepath } = loader.loadSync({
    cwd: opts.cwd,
    configFile: opts.configFile,
    overrides: opts.overrides,
    env: opts.env
  });
  const layout = resolveLayout(config.layout);
  const runMode = resolveMode(config, layout);
  return { config, layout, runMode, filepath };
}
