import * as React from 'react';

import type { BrainStatus, DeviceInfo, ProjectSummary, ShardRange } from '@/types/ipc';

const EMPTY_STATUS: BrainStatus = {
  running: false,
  url: null,
  project: null,
  runMode: null,
  lanUrls: []
};

/** Live brain status: seeded from the main process, then kept fresh via the
 *  `brain:status` push channel. */
export function useBrainStatus(): BrainStatus {
  const [status, setStatus] = React.useState<BrainStatus>(EMPTY_STATUS);

  React.useEffect(() => {
    let alive = true;
    void window.wavegrid.brain.status().then((s) => {
      if (alive) setStatus(s);
    });
    const off = window.wavegrid.brain.onStatus(setStatus);
    return () => {
      alive = false;
      off();
    };
  }, []);

  return status;
}

/** The project registry, mirrored from the shared appstash store. */
export function useProjects(): {
  projects: ProjectSummary[];
  refresh: () => Promise<void>;
  use: (name: string) => Promise<void>;
  } {
  const [projects, setProjects] = React.useState<ProjectSummary[]>([]);

  const refresh = React.useCallback(async () => {
    setProjects(await window.wavegrid.projects.list());
  }, []);

  const use = React.useCallback(async (name: string) => {
    setProjects(await window.wavegrid.projects.use(name));
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, refresh, use };
}

/** The project-scoped device registry, mirrored from the shared appstash store.
 *  Renaming and shard assignment write straight through to the store — the same
 *  records the CLI's `devices` commands manage. */
export function useDevices(project: string | null): {
  devices: DeviceInfo[];
  refresh: () => Promise<void>;
  rename: (idOrName: string, newName: string) => Promise<void>;
  assignShard: (idOrName: string, shard: ShardRange | null) => Promise<void>;
  } {
  const [devices, setDevices] = React.useState<DeviceInfo[]>([]);

  const refresh = React.useCallback(async () => {
    setDevices(project ? await window.wavegrid.devices.list(project) : []);
  }, [project]);

  const rename = React.useCallback(
    async (idOrName: string, newName: string) => {
      if (!project) return;
      setDevices(await window.wavegrid.devices.rename(project, idOrName, newName));
    },
    [project]
  );

  const assignShard = React.useCallback(
    async (idOrName: string, shard: ShardRange | null) => {
      if (!project) return;
      setDevices(await window.wavegrid.devices.assignShard(project, idOrName, shard));
    },
    [project]
  );

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { devices, refresh, rename, assignShard };
}
