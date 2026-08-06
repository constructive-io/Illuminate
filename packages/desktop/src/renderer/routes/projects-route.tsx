import { Check, FolderOpen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import type { ProjectSummary } from '@/types/ipc';

interface ProjectsRouteProps {
  projects: ProjectSummary[];
  onUse: (name: string) => void;
  busy: boolean;
}

/** Project switcher — lists the projects in the shared appstash store and lets
 *  the operator set the active one (the same set the CLI's `projects` shows). */
export function ProjectsRoute({ projects, onUse, busy }: ProjectsRouteProps) {
  if (projects.length === 0) {
    return (
      <div className='p-4'>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <FolderOpen />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create one with the CLI: <code>wavegrid projects create &lt;name&gt;</code>. It will
              appear here — Desktop and the CLI share the same <code>~/.wavegrid</code> store.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-2 p-4'>
      {projects.map((p) => (
        <div
          key={p.name}
          className='flex items-center justify-between rounded-lg border px-4 py-3'
        >
          <div className='flex items-center gap-2'>
            <span className='font-medium'>{p.name}</span>
            {p.active && <Badge>active</Badge>}
          </div>
          <Button
            variant={p.active ? 'outline' : 'default'}
            size='sm'
            disabled={busy || p.active}
            onClick={() => onUse(p.name)}
          >
            {p.active ? <Check /> : null}
            {p.active ? 'Current' : 'Use'}
          </Button>
        </div>
      ))}
    </div>
  );
}
