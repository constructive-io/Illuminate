import { autoMap, resolveLayout } from '@wavegrid/layout';
import { openStore } from '@wavegrid/settings';
import { ipcMain } from 'electron';

import { sendToBrain, startBrain, status, stopBrain } from '@/main/brain';
import { type LaserSyncState, syncLaser } from '@/main/laser-view';
import { buildLightMapView, readLightMap, writeLightMap } from '@/main/light-map';
import {
  applyEditable,
  configForNewProject,
  knownPresets,
  toEditable
} from '@/main/project-config';
import type {
  DeviceInfo,
  EditableConfig,
  LightMapView,
  NewProjectInput,
  ProjectSummary,
  RequiredSecretInfo,
  ShardRange
} from '@/types/ipc';

/** Resolve the light-map debugger view for a project from the shared store:
 *  layout + device shards + the normalized on-disk map. */
function lightMapView(project: string): LightMapView | null {
  const store = openStore();
  if (!store.hasProject(project)) return null;
  const config = store.getProjectConfig(project);
  const devices = store.listDevices(project).map((d) => ({ name: d.name, shard: d.shard }));
  return buildLightMapView({
    project,
    config,
    devices,
    stored: readLightMapForProject(project)
  });
}

/** Read the normalized on-disk map for a project (dims come from its layout). */
function readLightMapForProject(project: string) {
  const store = openStore();
  const layout = resolveLayout(store.getProjectConfig(project)?.layout ?? { preset: 'grid-7x7' });
  return readLightMap(store.stateDir(project), {
    numCannons: layout.count,
    gridColumns: layout.cols
  });
}

/** Map the store's RequiredSecret[] to the sanitized IPC shape. Never touches
 *  secret values — only name/description/set cross the bridge. */
function secretStatus(project: string): RequiredSecretInfo[] {
  const store = openStore();
  if (!store.hasProject(project)) return [];
  return store.requiredSecrets(project).map((s) => ({
    name: s.name,
    description: s.description,
    set: s.set
  }));
}

function projectSummaries(): ProjectSummary[] {
  const store = openStore();
  const active = store.getActiveProject();
  return store.listProjects().map((name) => ({ name, active: name === active }));
}

function devices(project: string): DeviceInfo[] {
  if (!project) return [];
  const store = openStore();
  if (!store.hasProject(project)) return [];
  return store.listDevices(project);
}

/** Register every main-process IPC handler. Each is a thin wrapper over the
 *  store / brain — the renderer never touches the store or `fs` directly. */
export function registerAllIpc(): void {
  ipcMain.handle('brain:status', () => status());
  ipcMain.handle('brain:start', (_e, project: string) => startBrain(project));
  ipcMain.handle('brain:stop', () => stopBrain());

  ipcMain.handle('projects:list', () => projectSummaries());
  ipcMain.handle('projects:active', () => openStore().getActiveProject());
  ipcMain.handle('projects:use', (_e, name: string) => {
    const store = openStore();
    if (store.hasProject(name)) store.setActiveProject(name);
    return projectSummaries();
  });
  ipcMain.handle('projects:presets', () => knownPresets());
  ipcMain.handle('projects:create', (_e, input: NewProjectInput) => {
    const store = openStore();
    const name = (input.name ?? '').trim();
    if (store.hasProject(name)) throw new Error(`Project "${name}" already exists.`);
    // createProject validates the name; configForNewProject validates the layout.
    store.createProject(name, configForNewProject(input));
    // Secrets are generated exactly once, at creation — never lazily later.
    store.generateSecrets(name);
    return projectSummaries();
  });
  ipcMain.handle('projects:remove', (_e, name: string) => {
    const store = openStore();
    if (store.hasProject(name)) store.deleteProject(name);
    return projectSummaries();
  });
  ipcMain.handle('projects:getConfig', (_e, project: string) => {
    const store = openStore();
    if (!store.hasProject(project)) return null;
    return toEditable(store.getProjectConfig(project));
  });
  ipcMain.handle('projects:saveConfig', (_e, project: string, config: EditableConfig) => {
    const store = openStore();
    if (!store.hasProject(project)) return null;
    const next = applyEditable(store.getProjectConfig(project), config);
    store.saveProjectConfig(project, next);
    return toEditable(next);
  });

  ipcMain.handle('users:list', (_e, project: string) => {
    const store = openStore();
    return store.hasProject(project) ? store.listUsers(project) : [];
  });
  ipcMain.handle('users:add', (_e, project: string, username: string, password: string) => {
    const store = openStore();
    // addUser hashes with scrypt and throws on empty username/password; the
    // password is used here only to hash and is never echoed, returned, or logged.
    if (store.hasProject(project)) store.addUser(project, username, password);
    return store.hasProject(project) ? store.listUsers(project) : [];
  });
  ipcMain.handle('users:remove', (_e, project: string, username: string) => {
    const store = openStore();
    if (store.hasProject(project)) store.removeUser(project, username);
    return store.hasProject(project) ? store.listUsers(project) : [];
  });

  ipcMain.handle('secrets:status', (_e, project: string) => secretStatus(project));
  ipcMain.handle('secrets:generate', (_e, project: string, force: boolean) => {
    const store = openStore();
    // Explicit, operator-triggered generation/rotation only. `generateSecrets`
    // returns which names were generated/kept — never the values themselves.
    if (store.hasProject(project)) store.generateSecrets(project, { force });
    return secretStatus(project);
  });

  ipcMain.handle('devices:list', (_e, project: string) => devices(project));
  ipcMain.handle('devices:rename', (_e, project: string, idOrName: string, newName: string) => {
    const store = openStore();
    if (store.hasProject(project)) store.renameDevice(project, idOrName, newName);
    return devices(project);
  });
  ipcMain.handle('devices:assignShard', (_e, project: string, idOrName: string, shard: ShardRange | null) => {
    const store = openStore();
    if (store.hasProject(project)) store.assignShard(project, idOrName, shard);
    return devices(project);
  });

  ipcMain.handle('lights:view', (_e, project: string) => lightMapView(project));
  ipcMain.handle('lights:remap', (_e, project: string, physicalLights: number[]) => {
    const store = openStore();
    if (!store.hasProject(project)) return null;
    const layout = resolveLayout(store.getProjectConfig(project)?.layout ?? { preset: 'grid-7x7' });
    // Persist to the SAME file the running brain reads; normalization keeps the
    // map a valid permutation (drops dupes/out-of-range, back-fills identity).
    writeLightMap(
      store.stateDir(project),
      { numCannons: layout.count, gridColumns: layout.cols },
      physicalLights
    );
    return lightMapView(project);
  });
  ipcMain.handle('lights:autoMap', (_e, project: string, strategyId: string) => {
    const store = openStore();
    if (!store.hasProject(project)) return null;
    const layout = resolveLayout(store.getProjectConfig(project)?.layout ?? { preset: 'grid-7x7' });
    // Deterministic candidate only — never persisted here; the operator applies
    // it into the draft and Saves explicitly.
    return autoMap(layout, strategyId);
  });
  ipcMain.handle('lights:identify', (_e, project: string, physicalIndex: number) =>
    // Flash one physical output on the running rig (white). No-op unless this
    // project's brain is live — returns whether it was actually driven.
    sendToBrain(project, { type: 'physical_preview', physicalIndex })
  );
  ipcMain.handle('lights:identifyClear', (_e, project: string) => {
    sendToBrain(project, { type: 'physical_preview_clear' });
    sendToBrain(project, { type: 'calibration_mode', enabled: false });
  });

  ipcMain.on('laser:sync', (_e, state: LaserSyncState) => syncLaser(state));
}
