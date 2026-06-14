// Color conversion
export type { RGB } from './color';
export { hsbToRgb, hsbToRgb100, hsbToRgb255 } from './color';

// OSC adapters
export type {
  BeyondOscConfig,
  CannonRoute,
  FB4OscConfig,
  OscMessage,
  OscTarget,
  RoutingConfig
} from './osc-adapters';
export {
  BeyondOscOutput,
  FB4OscOutput,
  RoutedOscOutput,
  createRoutedOutput,
  encodeBeyondMessages,
  encodeFB4Messages
} from './osc-adapters';
