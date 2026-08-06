import { Cpu, FolderKanban, MonitorPlay } from 'lucide-react';
import * as React from 'react';

import { type AppLinkRenderer } from '@/components/ui/app-bar';
import { type AppNavigationGroup,AppShell } from '@/components/ui/app-shell';
import { useBrainStatus, useDevices, useProjects } from '@/renderer/lib/use-wavegrid';
import { DevicesRoute } from '@/renderer/routes/devices-route';
import { ProjectsRoute } from '@/renderer/routes/projects-route';
import { ShowRoute } from '@/renderer/routes/show-route';

type Route = 'show' | 'projects' | 'devices';

const ROUTE_LABEL: Record<Route, string> = {
  show: 'Show',
  projects: 'Projects',
  devices: 'Devices'
};

export function App() {
  const [route, setRoute] = React.useState<Route>('show');
  const [busy, setBusy] = React.useState(false);

  const status = useBrainStatus();
  const { projects, refresh, use } = useProjects();

  const activeProject = projects.find((p) => p.active)?.name ?? status.project ?? null;
  const { devices, refresh: refreshDevices, rename: renameDevice, assignShard } =
    useDevices(activeProject);

  const onStart = React.useCallback(async () => {
    if (!activeProject) return;
    setBusy(true);
    try {
      await window.wavegrid.brain.start(activeProject);
    } finally {
      setBusy(false);
    }
  }, [activeProject]);

  const onStop = React.useCallback(async () => {
    setBusy(true);
    try {
      await window.wavegrid.brain.stop();
    } finally {
      setBusy(false);
    }
  }, []);

  const onUse = React.useCallback(
    async (name: string) => {
      setBusy(true);
      try {
        await use(name);
      } finally {
        setBusy(false);
      }
    },
    [use]
  );

  // Hash links drive an in-app route switch (no real navigation — the window
  // never leaves the renderer bundle).
  const renderLink: AppLinkRenderer = ({ href, onClick, ...props }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        const next = href.replace(/^#/, '') as Route;
        if (next === 'show' || next === 'projects' || next === 'devices') setRoute(next);
        onClick?.(e);
      }}
      {...props}
    />
  );

  const navigation: AppNavigationGroup[] = [
    {
      id: 'main',
      items: [
        {
          id: 'show',
          label: 'Show',
          href: '#show',
          icon: MonitorPlay,
          isActive: route === 'show'
        },
        {
          id: 'projects',
          label: 'Projects',
          href: '#projects',
          icon: FolderKanban,
          isActive: route === 'projects',
          badge: projects.length || undefined
        },
        {
          id: 'devices',
          label: 'Devices',
          href: '#devices',
          icon: Cpu,
          isActive: route === 'devices',
          badge: devices.length || undefined
        }
      ]
    }
  ];

  React.useEffect(() => {
    if (route === 'projects') void refresh();
    if (route === 'devices') void refreshDevices();
  }, [route, refresh, refreshDevices]);

  return (
    <AppShell
      navigation={navigation}
      renderLink={renderLink}
      brand={{
        name: 'Wavegrid',
        description: activeProject ? `Project · ${activeProject}` : 'No active project'
      }}
      breadcrumbs={[{ id: route, label: ROUTE_LABEL[route], current: true }]}
    >
      {route === 'show' && (
        <ShowRoute
          status={status}
          activeProject={activeProject}
          onStart={onStart}
          onStop={onStop}
          busy={busy}
        />
      )}
      {route === 'projects' && (
        <ProjectsRoute projects={projects} onUse={onUse} busy={busy} />
      )}
      {route === 'devices' && (
        <DevicesRoute
          activeProject={activeProject}
          devices={devices}
          onRename={(id, name) => void renameDevice(id, name)}
          onAssignShard={(id, shard) => void assignShard(id, shard)}
          busy={busy}
        />
      )}
    </AppShell>
  );
}
