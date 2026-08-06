import { contextBridge, ipcRenderer } from 'electron';

import type { BrainStatus, DeviceInfo, EditableConfig, LaserSyncState, NewProjectInput, ProjectSummary, RequiredSecretInfo, ShardRange, WavegridApi, WavegridLaser } from '@/types/ipc';

// The single, narrow bridge exposed to the renderer. The renderer never imports
// @wavegrid/settings or `fs`; everything goes through these typed calls.
const api: WavegridApi = {
  brain: {
    status: () => ipcRenderer.invoke('brain:status'),
    start: (project) => ipcRenderer.invoke('brain:start', project),
    stop: () => ipcRenderer.invoke('brain:stop'),
    onStatus: (cb: (status: BrainStatus) => void) => {
      const listener = (_e: unknown, payload: BrainStatus) => cb(payload);
      ipcRenderer.on('brain:status', listener);
      return () => ipcRenderer.removeListener('brain:status', listener);
    }
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list') as Promise<ProjectSummary[]>,
    active: () => ipcRenderer.invoke('projects:active') as Promise<string | null>,
    use: (name) => ipcRenderer.invoke('projects:use', name) as Promise<ProjectSummary[]>,
    presets: () => ipcRenderer.invoke('projects:presets') as Promise<string[]>,
    create: (input: NewProjectInput) => ipcRenderer.invoke('projects:create', input) as Promise<ProjectSummary[]>,
    remove: (name) => ipcRenderer.invoke('projects:remove', name) as Promise<ProjectSummary[]>,
    getConfig: (project) => ipcRenderer.invoke('projects:getConfig', project) as Promise<EditableConfig | null>,
    saveConfig: (project, config: EditableConfig) =>
      ipcRenderer.invoke('projects:saveConfig', project, config) as Promise<EditableConfig | null>
  },
  users: {
    list: (project) => ipcRenderer.invoke('users:list', project) as Promise<string[]>,
    add: (project, username, password) =>
      ipcRenderer.invoke('users:add', project, username, password) as Promise<string[]>,
    remove: (project, username) =>
      ipcRenderer.invoke('users:remove', project, username) as Promise<string[]>
  },
  secrets: {
    status: (project) => ipcRenderer.invoke('secrets:status', project) as Promise<RequiredSecretInfo[]>,
    generate: (project, force) =>
      ipcRenderer.invoke('secrets:generate', project, force) as Promise<RequiredSecretInfo[]>
  },
  devices: {
    list: (project) => ipcRenderer.invoke('devices:list', project) as Promise<DeviceInfo[]>,
    rename: (project, idOrName, newName) =>
      ipcRenderer.invoke('devices:rename', project, idOrName, newName) as Promise<DeviceInfo[]>,
    assignShard: (project, idOrName, shard: ShardRange | null) =>
      ipcRenderer.invoke('devices:assignShard', project, idOrName, shard) as Promise<DeviceInfo[]>
  }
};

contextBridge.exposeInMainWorld('wavegrid', api);

// Fire-and-forget channel the renderer uses to position the native laser view.
const laser: WavegridLaser = {
  sync: (state: LaserSyncState) => ipcRenderer.send('laser:sync', state)
};
contextBridge.exposeInMainWorld('wavegridLaser', laser);
