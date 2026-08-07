import fs from 'fs';
import path from 'path';

import { projectDir, projectLogsDir, projectSecretsFile, type StorePaths } from './paths';

/** What a reset removed — reported back so callers can show it, not guess. */
export interface ResetSummary {
  /** Projects that existed (by name) and were removed. */
  projects: string[];
  /** Secret files removed (one per project that had them). */
  secrets: number;
  /** Log directories removed. */
  logs: number;
  /** Whether the machine-local device identity was removed too. */
  device: boolean;
}

export interface ResetOptions {
  /**
   * Keep `config/device.json` — this machine's identity and name. Off by
   * default: a full reset means the next run introduces itself as a new device.
   */
  keepDevice?: boolean;
}

function rm(target: string): boolean {
  if (!fs.existsSync(target)) return false;
  fs.rmSync(target, { recursive: true, force: true });
  return true;
}

/** Every directory whose *contents* a reset clears (the dirs themselves stay). */
function emptyDir(dir: string): number {
  let removed = 0;
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (rm(path.join(dir, entry))) removed += 1;
  }
  return removed;
}

/**
 * Wipe the whole store: every project, its config, users, access keys,
 * sessions, devices, light maps, runtime state, secrets and logs. Only paths
 * under `paths.root` are touched, and the `{config,data,logs}` scaffold itself
 * survives so the store stays usable without re-initializing.
 *
 * This is irreversible — secrets are generated once and are not recoverable, so
 * callers must confirm before calling it.
 */
export function resetStore(paths: StorePaths, opts: ResetOptions = {}): ResetSummary {
  const projectsRoot = path.join(paths.data, 'projects');
  let projects: string[];
  try {
    projects = fs
      .readdirSync(projectsRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    projects = [];
  }

  let secrets = 0;
  let logs = 0;
  for (const project of projects) {
    rm(projectDir(paths, project));
    if (rm(projectSecretsFile(paths, project))) secrets += 1;
    if (rm(projectLogsDir(paths, project))) logs += 1;
  }

  // Anything left over — a stale secrets file for a project already gone, an
  // unregistered project dir, older log dirs — goes too. "Clear all" must not
  // leave a half-populated store behind.
  emptyDir(projectsRoot);
  secrets += emptyDir(path.join(paths.config, 'secrets'));
  logs += emptyDir(paths.logs);

  // The registry (project list + active pointer) and the resolved active-config
  // layer are derived state; removing them returns the store to "no projects".
  rm(paths.registryFile);
  rm(paths.activeConfigFile);

  const device = opts.keepDevice === true ? false : rm(paths.deviceFile);

  return { projects, secrets, logs, device };
}
