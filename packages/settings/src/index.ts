// Store facade
export { openStore, type SettingsStore, type StoreOptions } from './store';

// Paths
export {
  projectLogsDir,
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
