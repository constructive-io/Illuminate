import { openStore } from '@wavegrid/settings';
import { ipcMain } from 'electron';

import { startBrain, status, stopBrain } from '@/main/brain';
import { type LaserSyncState, syncLaser } from '@/main/laser-view';
import type { DeviceInfo, ProjectSummary, ShardRange } from '@/types/ipc';

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

  ipcMain.on('laser:sync', (_e, state: LaserSyncState) => syncLaser(state));
}
