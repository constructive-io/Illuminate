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
  autoMapStrategies,
  type AutoMapStrategy,
  availableStrategies,
  identityMap,
  isIdentityMap,
  normalizeLightMap
} from './light-map';

// Unified → per-device routing generation (shard + zone re-basing, validation)
export {
  type DeviceCannon,
  type DeviceRouting,
  generateDeviceRouting,
  type GenerateRoutingResult,
  looksDeviceLocal,
  type RoutingDevice,
  type RoutingTarget,
  RoutingValidationError,
  type ShardCheckOptions,
  summarizeRanges,
  uncoveredFixtures,
  type UnifiedCannon,
  type UnifiedRouting,
  unifiedRoutingForSingleTarget,
  validateShards,
  validateUnifiedRouting
} from './routing';

// Config loading (confstash) + run-mode derivation
export {
  createWavegridLoader,
  DEFAULT_CONFIG,
  type LoadOptions,
  loadWavegridConfig,
  type ResolvedConfig,
  resolveMode
} from './config';
