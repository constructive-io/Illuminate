// Browser-safe entry point — everything except the Node-only config loader
// (which pulls in confstash/`fs`). Import this from client/UI code.

// Types
export type {
  Fixture,
  Layout,
  LayoutSpec,
  RunMode,
  ServerConfig,
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
