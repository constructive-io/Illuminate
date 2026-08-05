/**
 * Server-side bridge to the centralized Wavegrid store (~/.wavegrid). The UI
 * reads its JWT secret and login users from the same project the CLI created,
 * so there is no separate `.users` file or manual `WG_JWT_SECRET` to set.
 *
 * Node-only — imported exclusively from route handlers / server code.
 */
import { openStore, type SettingsStore } from '@wavegrid/settings';

let cachedStore: SettingsStore | null = null;

function store(): SettingsStore {
  if (!cachedStore) cachedStore = openStore();
  return cachedStore;
}

/**
 * Which project the UI serves. Explicit `WAVEGRID_PROJECT` wins, else the
 * store's active project. Throws when nothing is configured — the operator
 * must run `wavegrid init` first (no silent defaults).
 */
export function activeProject(): string {
  const explicit = process.env.WAVEGRID_PROJECT;
  if (explicit) return explicit;
  const active = store().getActiveProject();
  if (!active) {
    throw new Error('No Wavegrid project configured. Run `wavegrid init` to create one.');
  }
  return active;
}

/** JWT signing secret: explicit env override, else the project secret. Throws if unset. */
export function jwtSecret(): string {
  const fromEnv = process.env.WG_JWT_SECRET;
  if (fromEnv) return fromEnv;
  return store().requireSecret(activeProject(), 'jwtSecret');
}

/** Verify a UI login against the project's hashed user store. */
export function verifyLogin(username: string, password: string): boolean {
  return store().verifyUser(activeProject(), username, password);
}

/** Number of UI users configured for the active project. */
export function userCount(): number {
  return store().listUsers(activeProject()).length;
}
