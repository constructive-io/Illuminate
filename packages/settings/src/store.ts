import { type DeviceIdentity, getDevice, setDeviceName } from './device';
import {
  projectLogsDir,
  projectStateDir,
  resolvePaths,
  type StorePaths
} from './paths';
import {
  createProject,
  type CreateProjectOptions,
  deleteProject,
  getActiveProject,
  getProjectConfig,
  hasProject,
  listProjects,
  type ProjectConfig,
  saveProjectConfig,
  setActiveProject
} from './projects';
import {
  type DeviceRecord,
  type DeviceRegistration,
  getDeviceRecord,
  listDevices,
  registerDevice,
  removeDevice,
  renameDevice
} from './registry';
import { type RequiredSecret,requiredSecrets } from './required';
import {
  type GenerateResult,
  generateSecrets,
  hasSecret,
  type ProjectSecrets,
  readSecrets,
  requireSecret,
  type SecretName
} from './secrets';
import { addUser, listUsernames, removeUser, verifyUser } from './users';

export interface StoreOptions {
  /** Override the store root (defaults to ~/.wavegrid). Used by tests and hosts. */
  baseDir?: string;
}

/**
 * A handle to the Wavegrid settings store. All project/secret/user operations
 * hang off this so callers never juggle paths.
 */
export interface SettingsStore {
  readonly paths: StorePaths;

  // Projects
  listProjects(): string[];
  hasProject(name: string): boolean;
  getActiveProject(): string | null;
  createProject(name: string, config: ProjectConfig, opts?: CreateProjectOptions): void;
  setActiveProject(name: string): void;
  deleteProject(name: string): boolean;
  getProjectConfig(name: string): ProjectConfig | null;
  saveProjectConfig(name: string, config: ProjectConfig): void;

  // Secrets (generated once; runtime reads must be explicit)
  generateSecrets(project: string, opts?: { force?: boolean }): GenerateResult;
  hasSecret(project: string, name: SecretName): boolean;
  requireSecret(project: string, name: SecretName): string;
  readSecrets(project: string): Partial<ProjectSecrets>;
  requiredSecrets(project: string): RequiredSecret[];

  // Users
  listUsers(project: string): string[];
  addUser(project: string, username: string, password: string): void;
  removeUser(project: string, username: string): boolean;
  verifyUser(project: string, username: string, password: string): boolean;

  // Device identity (machine-local; never travels with project exports)
  getDevice(): DeviceIdentity;
  setDeviceName(name: string): DeviceIdentity;

  // Project device registry (which devices have joined a project)
  listDevices(project: string): DeviceRecord[];
  getDeviceRecord(project: string, id: string): DeviceRecord | null;
  registerDevice(project: string, reg: DeviceRegistration): DeviceRecord;
  renameDevice(project: string, idOrName: string, newName: string): DeviceRecord | null;
  removeDevice(project: string, idOrName: string): boolean;

  // Runtime paths
  stateDir(project: string): string;
  logsDir(project: string): string;
}

export function openStore(opts: StoreOptions = {}): SettingsStore {
  const paths = resolvePaths(opts.baseDir);
  return {
    paths,

    listProjects: () => listProjects(paths),
    hasProject: (name) => hasProject(paths, name),
    getActiveProject: () => getActiveProject(paths),
    createProject: (name, config, o) => createProject(paths, name, config, o),
    setActiveProject: (name) => setActiveProject(paths, name),
    deleteProject: (name) => deleteProject(paths, name),
    getProjectConfig: (name) => getProjectConfig(paths, name),
    saveProjectConfig: (name, config) => saveProjectConfig(paths, name, config),

    generateSecrets: (project, o) => generateSecrets(paths, project, o),
    hasSecret: (project, name) => hasSecret(paths, project, name),
    requireSecret: (project, name) => requireSecret(paths, project, name),
    readSecrets: (project) => readSecrets(paths, project),
    requiredSecrets: (project) => requiredSecrets(paths, project),

    listUsers: (project) => listUsernames(paths, project),
    addUser: (project, username, password) => addUser(paths, project, username, password),
    removeUser: (project, username) => removeUser(paths, project, username),
    verifyUser: (project, username, password) => verifyUser(paths, project, username, password),

    getDevice: () => getDevice(paths),
    setDeviceName: (name) => setDeviceName(paths, name),

    listDevices: (project) => listDevices(paths, project),
    getDeviceRecord: (project, id) => getDeviceRecord(paths, project, id),
    registerDevice: (project, reg) => registerDevice(paths, project, reg),
    renameDevice: (project, idOrName, newName) => renameDevice(paths, project, idOrName, newName),
    removeDevice: (project, idOrName) => removeDevice(paths, project, idOrName),

    stateDir: (project) => projectStateDir(paths, project),
    logsDir: (project) => projectLogsDir(paths, project)
  };
}
