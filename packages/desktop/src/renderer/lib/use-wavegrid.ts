import * as React from 'react';

import type {
  BrainStatus,
  DeviceInfo,
  EditableConfig,
  NewProjectInput,
  ProjectSummary,
  RequiredSecretInfo,
  ShardRange
} from '@/types/ipc';

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
 *  write straight through to the store — the same projects the CLI manages.
 *  `loaded` flips once the first fetch lands, so boot UI can wait on real data. */
export function useProjects(): {
  projects: ProjectSummary[];
  loaded: boolean;
  refresh: () => Promise<void>;
  use: (name: string) => Promise<void>;
  create: (input: NewProjectInput) => Promise<void>;
  remove: (name: string) => Promise<void>;
  } {
  const [projects, setProjects] = React.useState<ProjectSummary[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setProjects(await window.wavegrid.projects.list());
    setLoaded(true);
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

  return { projects, loaded, refresh, use, create, remove };
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

/** UI login users for a project (names only — password hashes never leave main).
 *  add/remove write straight through to the scrypt-backed store. */
export function useProjectUsers(project: string | null): {
  users: string[];
  refresh: () => Promise<void>;
  add: (username: string, password: string) => Promise<void>;
  remove: (username: string) => Promise<void>;
  } {
  const [users, setUsers] = React.useState<string[]>([]);

  const refresh = React.useCallback(async () => {
    if (!project) {
      setUsers([]);
      return;
    }
    setUsers(await window.wavegrid.users.list(project));
  }, [project]);

  const add = React.useCallback(
    async (username: string, password: string) => {
      if (!project) return;
      setUsers(await window.wavegrid.users.add(project, username, password));
    },
    [project]
  );

  const remove = React.useCallback(
    async (username: string) => {
      if (!project) return;
      setUsers(await window.wavegrid.users.remove(project, username));
    },
    [project]
  );

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { users, refresh, add, remove };
}

/** Required-secret status for a project (name/description/set only). `generate`
 *  triggers one-time generation, or rotation with force=true. */
export function useProjectSecrets(project: string | null): {
  secrets: RequiredSecretInfo[];
  refresh: () => Promise<void>;
  generate: (force: boolean) => Promise<void>;
  } {
  const [secrets, setSecrets] = React.useState<RequiredSecretInfo[]>([]);

  const refresh = React.useCallback(async () => {
    if (!project) {
      setSecrets([]);
      return;
    }
    setSecrets(await window.wavegrid.secrets.status(project));
  }, [project]);

  const generate = React.useCallback(
    async (force: boolean) => {
      if (!project) return;
      setSecrets(await window.wavegrid.secrets.generate(project, force));
    },
    [project]
  );

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { secrets, refresh, generate };
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
