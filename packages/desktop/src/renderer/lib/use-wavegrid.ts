import * as React from 'react';

import type { BrainStatus, DeviceInfo, EditableConfig, NewProjectInput, ProjectSummary, ShardRange } from '@/types/ipc';

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

/** The project registry, mirrored from the shared appstash store. Create/remove
 *  write straight through to the store — the same projects the CLI manages. */
export function useProjects(): {
  projects: ProjectSummary[];
  refresh: () => Promise<void>;
  use: (name: string) => Promise<void>;
  create: (input: NewProjectInput) => Promise<void>;
  remove: (name: string) => Promise<void>;
  } {
  const [projects, setProjects] = React.useState<ProjectSummary[]>([]);

  const refresh = React.useCallback(async () => {
    setProjects(await window.wavegrid.projects.list());
  }, []);

  const use = React.useCallback(async (name: string) => {
    setProjects(await window.wavegrid.projects.use(name));
  }, []);

  const create = React.useCallback(async (input: NewProjectInput) => {
    setProjects(await window.wavegrid.projects.create(input));
  }, []);

  const remove = React.useCallback(async (name: string) => {
    setProjects(await window.wavegrid.projects.remove(name));
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, refresh, use, create, remove };
}

/** Built-in layout preset ids, loaded once from the store. */
export function usePresets(): string[] {
  const [presets, setPresets] = React.useState<string[]>([]);
  React.useEffect(() => {
    let alive = true;
    void window.wavegrid.projects.presets().then((p) => {
      if (alive) setPresets(p);
    });
    return () => {
      alive = false;
    };
  }, []);
  return presets;
}

/** The active project's editable config, mirrored from the store. `save` folds
 *  the edited fields back in (osc/sync/etc. preserved) and returns the result. */
export function useProjectConfig(project: string | null): {
  config: EditableConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
  save: (config: EditableConfig) => Promise<void>;
  } {
  const [config, setConfig] = React.useState<EditableConfig | null>(null);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!project) {
      setConfig(null);
      return;
    }
    setLoading(true);
    try {
      setConfig(await window.wavegrid.projects.getConfig(project));
    } finally {
      setLoading(false);
    }
  }, [project]);

  const save = React.useCallback(
    async (next: EditableConfig) => {
      if (!project) return;
      setConfig(await window.wavegrid.projects.saveConfig(project, next));
    },
    [project]
  );

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { config, loading, refresh, save };
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
