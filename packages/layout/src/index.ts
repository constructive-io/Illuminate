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

// Config loading (confstash) + run-mode derivation
export {
  createWavegridLoader,
  DEFAULT_CONFIG,
  type LoadOptions,
  loadWavegridConfig,
  type ResolvedConfig,
  resolveMode
} from './config';
