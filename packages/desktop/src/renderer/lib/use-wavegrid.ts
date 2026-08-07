import * as React from 'react';

import type {
  BrainStatus,
  DeviceInfo,
  EditableConfig,
  GuestStatus,
  LightMapView,
  NewProjectInput,
  ProjectSummary,
  RequiredSecretInfo,
  SessionInfo,
  ShardRange,
  UserAccount,
  UserRole
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

/** UI login users for a project (username + role — password hashes never leave
 *  main). add/remove/setRole write straight through to the scrypt-backed store. */
export function useProjectUsers(project: string | null): {
  users: UserAccount[];
  refresh: () => Promise<void>;
  add: (username: string, password: string, role: UserRole) => Promise<void>;
  remove: (username: string) => Promise<void>;
  setRole: (username: string, role: UserRole) => Promise<void>;
  } {
  const [users, setUsers] = React.useState<UserAccount[]>([]);

  const refresh = React.useCallback(async () => {
    if (!project) {
      setUsers([]);
      return;
    }
    setUsers(await window.wavegrid.users.list(project));
  }, [project]);

  const add = React.useCallback(
    async (username: string, password: string, role: UserRole) => {
      if (!project) return;
      setUsers(await window.wavegrid.users.add(project, username, password, role));
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

  const setRole = React.useCallback(
    async (username: string, role: UserRole) => {
      if (!project) return;
      setUsers(await window.wavegrid.users.setRole(project, username, role));
    },
    [project]
  );

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { users, refresh, add, remove, setRole };
}

/** Active UI login sessions for a project (who's logged in). Local admin reads
 *  straight from the shared store; revoke removes the row (the client loses
 *  access on its next token refresh — sockets are untouched). */
export function useSessions(project: string | null): {
  sessions: SessionInfo[];
  refresh: () => Promise<void>;
  revoke: (id: string) => Promise<void>;
  } {
  const [sessions, setSessions] = React.useState<SessionInfo[]>([]);

  const refresh = React.useCallback(async () => {
    setSessions(project ? await window.wavegrid.sessions.list(project) : []);
  }, [project]);

  const revoke = React.useCallback(
    async (id: string) => {
      if (!project) return;
      setSessions(await window.wavegrid.sessions.revoke(project, id));
    },
    [project]
  );

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sessions, refresh, revoke };
}

/** Shared guest-access status + controls. Rotate mints a fresh passphrase and
 *  returns its cleartext once (for the admin to copy); the store keeps only a
 *  hash. Enabling/disabling flips logins on/off without changing it. */
export function useGuest(project: string | null): {
  guest: GuestStatus;
  refresh: () => Promise<void>;
  rotate: () => Promise<string>;
  setEnabled: (enabled: boolean) => Promise<void>;
  clear: () => Promise<void>;
  } {
  const [guest, setGuest] = React.useState<GuestStatus>({
    configured: false,
    enabled: false,
    updatedAt: null
  });

  const refresh = React.useCallback(async () => {
    if (!project) {
      setGuest({ configured: false, enabled: false, updatedAt: null });
      return;
    }
    setGuest(await window.wavegrid.guest.status(project));
  }, [project]);

  const rotate = React.useCallback(async () => {
    if (!project) return '';
    const { passphrase, status } = await window.wavegrid.guest.rotate(project);
    setGuest(status);
    return passphrase;
  }, [project]);

  const setEnabled = React.useCallback(
    async (enabled: boolean) => {
      if (!project) return;
      setGuest(await window.wavegrid.guest.setEnabled(project, enabled));
    },
    [project]
  );

  const clear = React.useCallback(async () => {
    if (!project) return;
    setGuest(await window.wavegrid.guest.clear(project));
  }, [project]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { guest, refresh, rotate, setEnabled, clear };
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

/** The light-map debugger view for a project — the resolved mapping chain, the
 *  raw `physicalLights` the editor mutates, and the named-map library. Saving
 *  writes a named correction map; activating one materializes it into the same
 *  light-map.json the running brain reads (null = identity / no correction). */
export function useLightMap(project: string | null): {
  view: LightMapView | null;
  loading: boolean;
  refresh: () => Promise<void>;
  saveMap: (name: string, physicalLights: number[]) => Promise<void>;
  activate: (name: string | null) => Promise<void>;
  deleteMap: (name: string) => Promise<void>;
  autoMap: (strategyId: string) => Promise<number[] | null>;
  identify: (physicalIndex: number) => Promise<boolean>;
  identifyClear: () => Promise<void>;
  } {
  const [view, setView] = React.useState<LightMapView | null>(null);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!project) {
      setView(null);
      return;
    }
    setLoading(true);
    try {
      setView(await window.wavegrid.lights.view(project));
    } finally {
      setLoading(false);
    }
  }, [project]);

  const saveMap = React.useCallback(
    async (name: string, physicalLights: number[]) => {
      if (!project) return;
      setView(await window.wavegrid.lights.saveMap(project, name, physicalLights));
    },
    [project]
  );

  const activate = React.useCallback(
    async (name: string | null) => {
      if (!project) return;
      setView(await window.wavegrid.lights.activate(project, name));
    },
    [project]
  );

  const deleteMap = React.useCallback(
    async (name: string) => {
      if (!project) return;
      setView(await window.wavegrid.lights.deleteMap(project, name));
    },
    [project]
  );

  const autoMap = React.useCallback(
    async (strategyId: string) => (project ? window.wavegrid.lights.autoMap(project, strategyId) : null),
    [project]
  );

  const identify = React.useCallback(
    async (physicalIndex: number) => (project ? window.wavegrid.lights.identify(project, physicalIndex) : false),
    [project]
  );

  const identifyClear = React.useCallback(async () => {
    if (project) await window.wavegrid.lights.identifyClear(project);
  }, [project]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { view, loading, refresh, saveMap, activate, deleteMap, autoMap, identify, identifyClear };
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
