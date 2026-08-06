// Types
export type {
  BeyondConfig,
  DebugConfig,
  Fb4Config,
  Fixture,
  Layout,
  LayoutSpec,
  OscConfig,
  ReceiverConfig,
  RunMode,
  ServerConfig,
  ShardConfig,
  SyncConfig,
  Topology,
  UiConfig,
  WavegridConfig
} from './types';

// Generators
export {
  filledRingLayout,
  type FilledRingParams,
  gridLayout,
  type GridParams,
  ringLayout,
  type RingParams
} from './generators';

// Presets + spec resolution
export { getPresetNames, presets, resolveLayout } from './presets';

// Light-map helpers (physical correction layer) + auto-map heuristics
export {
  autoMap,
  type AutoMapStrategy,
  autoMapStrategies,
  availableStrategies,
  identityMap,
  isIdentityMap,
  normalizeLightMap
} from './light-map';

// Config loading (confstash) + run-mode derivation
export {
  createWavegridLoader,
  DEFAULT_CONFIG,
  type LoadOptions,
  loadWavegridConfig,
  type ResolvedConfig,
  resolveMode
} from './config';
