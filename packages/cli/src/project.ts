import { openStore, type SettingsStore } from '@wavegrid/settings';

export type Flags = Record<string, string | number | boolean>;

/**
 * Open the shared Wavegrid store (~/.wavegrid). `APPSTASH_BASE_DIR` relocates
 * the whole store — and confstash's user layer resolves the same way — so the
 * two never diverge (used for isolated test/CI runs and multi-store hosts).
 */
export function getStore(): SettingsStore {
  return openStore();
}

/**
 * Resolve which project a command should act on. Precedence:
 *   `--project <name>` flag  →  `WAVEGRID_PROJECT` env  →  active project.
 * Throws an explicit, actionable error when nothing resolves — no silent
 * fallbacks, matching the "explicit or error" contract for setup state.
 */
export function resolveProjectName(store: SettingsStore, flags: Flags): string {
  const explicit =
    (typeof flags.project === 'string' ? flags.project : undefined) ?? process.env.WAVEGRID_PROJECT;

  if (explicit) {
    if (!store.hasProject(explicit)) {
      throw new Error(
        `Unknown project "${explicit}". Run \`wavegrid projects\` to list them, ` +
          `or \`wavegrid init ${explicit}\` to create it.`
      );
    }
    return explicit;
  }

  const active = store.getActiveProject();
  if (active) return active;

  throw new Error('No Wavegrid project configured. Run `wavegrid init` to create one.');
}
