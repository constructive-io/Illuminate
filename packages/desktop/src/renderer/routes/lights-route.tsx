import { Lightbulb, RotateCcw, Save } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { LightMapView } from '@/types/ipc';

interface LightsRouteProps {
  project: string | null;
  view: LightMapView | null;
  loading: boolean;
  onRemap: (physicalLights: number[]) => void;
  busy: boolean;
}

/**
 * Light-map debugger. Explains the full mapping chain per fixture — the logical
 * index animations address, the physical light it's wired to, its position,
 * which device's shard drives it, and where it's emitted (OSC) — and lets the
 * operator remap `physicalLights[]`. Writes through to the same light-map.json
 * the running brain reads; the store normalizes (dedup + identity back-fill).
 */
export function LightsRoute({ project, view, loading, onRemap, busy }: LightsRouteProps) {
  // Local draft of physical indices, keyed by logical index. Committed on Save.
  const [draft, setDraft] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (view) setDraft(view.physicalLights);
  }, [view]);

  if (!project) {
    return (
      <div className='p-4'>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Lightbulb />
            </EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>
              Pick a project on the Projects screen to inspect its light map.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (!view) {
    return <div className='text-muted-foreground p-4 text-sm'>{loading ? 'Loading…' : 'No layout resolved for this project.'}</div>;
  }

  const dirty = draft.some((v, i) => v !== view.physicalLights[i]);
  const setPhysical = (logical: number, value: number) =>
    setDraft((cur) => cur.map((v, i) => (i === logical ? value : v)));

  return (
    <div className='flex flex-col gap-4 p-4'>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          <span className='font-medium'>{project}</span>
          <span className='text-muted-foreground text-sm'>
            {view.layoutName} · {view.numCannons} fixtures
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={busy || !dirty}
            onClick={() => setDraft(view.physicalLights)}
          >
            <RotateCcw />
            Revert
          </Button>
          <Button size='sm' disabled={busy || !dirty} onClick={() => onRemap(draft)}>
            <Save />
            Save mapping
          </Button>
        </div>
      </div>

      <p className='text-muted-foreground text-sm'>
        Each row is one cannon. Animations drive the <strong>logical</strong> index; the receiver
        maps it to the <strong>physical</strong> light it's actually wired to, then emits it to the
        OSC target. Change a physical index to rewire a fixture — the store normalizes the map
        (duplicates and out-of-range values are dropped and back-filled) on save.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-20'>Logical</TableHead>
            <TableHead className='w-28'>Physical</TableHead>
            <TableHead>Fixture</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Driven by</TableHead>
            <TableHead>OSC target</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((row) => (
            <TableRow key={row.logical}>
              <TableCell className='font-mono text-sm'>{row.logical}</TableCell>
              <TableCell>
                <Input
                  type='number'
                  min={0}
                  max={view.numCannons - 1}
                  className='h-8 w-20'
                  disabled={busy}
                  value={draft[row.logical] ?? row.physical}
                  onChange={(e) => setPhysical(row.logical, Number(e.target.value))}
                />
              </TableCell>
              <TableCell className='font-medium'>{row.label}</TableCell>
              <TableCell className='text-muted-foreground text-sm'>{row.position}</TableCell>
              <TableCell className='text-sm'>{row.shardOwner ?? 'all cannons'}</TableCell>
              <TableCell className='text-muted-foreground font-mono text-xs'>{row.oscTarget}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
