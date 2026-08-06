// Store facade
export { openStore, type SettingsStore, type StoreOptions } from './store';

// Device identity
export { type DeviceIdentity } from './device';

// Project device registry
export { type DeviceRecord, type DeviceRegistration } from './registry';

// Portable project export/import
export {
  type ExportOptions,
  type ImportOptions,
  type ImportResult,
  parseBundle,
  type PortableProject
} from './portable';

// Config synchronization (revisioned, server-mediated + peer fallback)
export {
  type ApplyResult,
  type ConfigUpdate,
  deviceScope,
  type DivergentDevice,
  isValidScope,
  projectScope,
  type SyncEntry,
  type SyncScope,
  type SyncState
} from './sync';

// Paths
export {
  projectLogsDir,
  projectSecretsFile,
  projectStateDir,
  resolvePaths,
  type StorePaths,
  TOOL
} from './paths';

// Projects
export {
  type CreateProjectOptions,
  type ProjectConfig
} from './projects';

// Secrets
export {
  type GenerateResult,
  type ProjectSecrets,
  SECRET_NAMES,
  type SecretName
} from './secrets';

// Required-secrets report
export { type RequiredSecret } from './required';

// Users
export { type StoredUser } from './users';
