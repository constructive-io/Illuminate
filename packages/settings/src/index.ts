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

// Light-map library (named correction maps + active selection)
export {
  type LightMapSummary,
  type StoredLightMap
} from './light-maps';

// Required-secrets report
export { type RequiredSecret } from './required';

// Users
export { type StoredUser, type UserInfo, type UserRole } from './users';

// Shared guest access (one low-privilege operator passphrase)
export { GUEST_USERNAME, type GuestStatus } from './guest';

// UI sessions (cheap server-visible login records)
export {
  type CreateSessionInput,
  DEFAULT_SESSION_TTL_MS,
  type Session
} from './sessions';
