import { appstash, type AppStashResult } from 'appstash';
import fs from 'fs';
import path from 'path';

export const TOOL = 'wavegrid';

export interface StorePaths {
  root: string;
  config: string;
  data: string;
  logs: string;
  /** ~/.wavegrid/config/config.json — the confstash `userStash` layer. */
  activeConfigFile: string;
  /** ~/.wavegrid/config/projects.json — registry + active pointer. */
  registryFile: string;
  /** ~/.wavegrid/config/device.json — machine-local identity (never travels with exports). */
  deviceFile: string;
}

/**
 * Resolve the Wavegrid store directories. `baseDir` overrides the home dir
 * (used by tests and by any host that wants an isolated store); everything
 * else follows appstash's `~/.wavegrid/{config,data,logs}` layout.
 */
export function resolvePaths(baseDir?: string): StorePaths {
  const dirs: AppStashResult = appstash(TOOL, { baseDir, ensure: true });
  return {
    root: dirs.root,
    config: dirs.config,
    data: dirs.data,
    logs: dirs.logs,
    activeConfigFile: path.join(dirs.config, 'config.json'),
    registryFile: path.join(dirs.config, 'projects.json'),
    deviceFile: path.join(dirs.config, 'device.json')
  };
}

export function projectDir(paths: StorePaths, project: string): string {
  return path.join(paths.data, 'projects', project);
}

export function projectConfigFile(paths: StorePaths, project: string): string {
  return path.join(projectDir(paths, project), 'config.json');
}

export function projectUsersFile(paths: StorePaths, project: string): string {
  return path.join(projectDir(paths, project), 'users.json');
}

export function projectSecretsFile(paths: StorePaths, project: string): string {
  return path.join(paths.config, 'secrets', `${project}.json`);
}

export function projectStateDir(paths: StorePaths, project: string): string {
  return path.join(projectDir(paths, project), 'state');
}

export function projectDevicesFile(paths: StorePaths, project: string): string {
  return path.join(projectDir(paths, project), 'devices.json');
}

export function projectLogsDir(paths: StorePaths, project: string): string {
  return path.join(paths.logs, project);
}

/** Atomic write (temp file + rename). `mode` applies to the final file. */
export function writeFileAtomic(file: string, data: string, mode?: number): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, data, mode != null ? { mode } : undefined);
  fs.renameSync(tmp, file);
  if (mode != null) fs.chmodSync(file, mode);
}

/** Read + parse JSON. A file that exists but does not parse throws with its path. */
export function readJsonFile<T>(file: string): T | null {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new Error(`Corrupt Wavegrid store file at ${file}: ${(e as Error).message}`);
  }
}
