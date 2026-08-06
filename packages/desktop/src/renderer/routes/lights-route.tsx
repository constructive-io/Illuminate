import { Lightbulb, RotateCcw, Save, Sparkles, Wand2, Zap } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { LightMapView } from '@/types/ipc';

interface LightsRouteProps {
  project: string | null;
  view: LightMapView | null;
  loading: boolean;
  onRemap: (physicalLights: number[]) => void;
  onAutoMap: (strategyId: string) => Promise<number[] | null>;
  onIdentify: (physicalIndex: number) => Promise<boolean>;
  onIdentifyClear: () => Promise<void>;
  /** True when this project's brain is live, so identify can flash the rig. */
  brainLive: boolean;
  busy: boolean;
}

/**
 * Light-map debugger. Identity is the default — a healthy rig needs no map. The
 * canvas lays fixtures out in their real geometry (grid or ring); tap one to
 * select it, then re-assign the physical output it's wired to (a swap that keeps
 * the map a valid permutation) or flash it on the live rig to see which laser it
 * is. Deterministic auto-map heuristics propose whole permutations to try. Every
 * change is a draft until Save, which writes the same light-map.json the brain reads.
 */
export function LightsRoute({
  project,
  view,
  loading,
  onRemap,
  onAutoMap,
  onIdentify,
  onIdentifyClear,
  brainLive,
  busy
}: LightsRouteProps) {
  // Draft of physical indices keyed by logical index. Committed on Save.
  const [draft, setDraft] = React.useState<number[]>([]);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [strategy, setStrategy] = React.useState('');
  const [identifyOn, setIdentifyOn] = React.useState(false);

  React.useEffect(() => {
    if (view) setDraft(view.physicalLights);
  }, [view]);

  const draftPhysical = selected != null ? draft[selected] : null;

  // While "identify" is on, flash the selected fixture's physical output on the
  // live rig and keep it in sync as the operator steps through outputs. Always
  // clear the flash when identify turns off, selection changes, or we unmount.
  React.useEffect(() => {
    if (!identifyOn || selected == null || !brainLive || draftPhysical == null) return;
    void onIdentify(draftPhysical);
    return () => {
      void onIdentifyClear();
    };
  }, [identifyOn, selected, draftPhysical, brainLive, onIdentify, onIdentifyClear]);

  React.useEffect(() => {
    if (!brainLive && identifyOn) setIdentifyOn(false);
  }, [brainLive, identifyOn]);

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

  const N = view.numCannons;
  const dirty = draft.some((v, i) => v !== view.physicalLights[i]);
  const draftIsIdentity = draft.every((v, i) => v === i);
  const correctedCount = draft.filter((v, i) => v !== i).length;

  /** Assign fixture `logical`'s physical output to `physical`, swapping with
   *  whichever fixture currently holds it so the map stays a permutation. */
  const assignPhysical = (logical: number, physical: number) => {
    if (physical < 0 || physical >= N) return;
    setDraft((cur) => {
      const next = [...cur];
      const holder = next.indexOf(physical);
      const prev = next[logical];
      if (holder >= 0) next[holder] = prev;
      next[logical] = physical;
      return next;
    });
  };

  const resetIdentity = () => setDraft(Array.from({ length: N }, (_, i) => i));

  const applyStrategy = async (id: string) => {
    if (!id) return;
    const candidate = await onAutoMap(id);
    if (candidate) setDraft(candidate);
  };

  const selectedRow = selected != null ? view.rows[selected] : null;

  return (
    <div className='flex flex-col gap-4 p-4'>
      {/* Header + save controls */}
      <div className='flex items-start justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          <span className='font-medium'>{project}</span>
          <span className='text-muted-foreground text-sm'>
            {view.layoutName} · {N} fixtures
          </span>
        </div>
        <div className='flex items-center gap-2'>
          {draftIsIdentity ? (
            <Badge variant='success'>Identity · no correction</Badge>
          ) : (
            <Badge variant='warning'>{correctedCount} corrected</Badge>
          )}
          <Button
            variant='outline'
            size='sm'
            disabled={busy || draftIsIdentity}
            onClick={resetIdentity}
          >
            <Sparkles />
            Reset to identity
          </Button>
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
        Identity (physical = logical) is the default — you only need a map when the
        hardware is wired out of order. Tap a fixture to select it, then set the
        physical output it's actually wired to, or flash it on the live rig to see
        which laser lights.
      </p>

      <div className='grid gap-4 lg:grid-cols-[1fr_20rem]'>
        {/* Canvas */}
        <div className='bg-muted/30 rounded-md border p-3'>
          <MappingCanvas
            view={view}
            draft={draft}
            selected={selected}
            onSelect={setSelected}
          />
          <div className='text-muted-foreground mt-2 flex items-center gap-4 text-xs'>
            <span className='flex items-center gap-1'>
              <span className='bg-muted-foreground/40 inline-block size-3 rounded-full' /> identity
            </span>
            <span className='flex items-center gap-1'>
              <span className='bg-warning inline-block size-3 rounded-full' /> corrected
            </span>
            <span className='flex items-center gap-1'>
              <span className='ring-primary inline-block size-3 rounded-full ring-2' /> selected
            </span>
          </div>
        </div>

        {/* Inspector / auto-map */}
        <div className='flex flex-col gap-4'>
          {/* Auto-map */}
          <div className='flex flex-col gap-2 rounded-md border p-3'>
            <span className='flex items-center gap-2 text-sm font-medium'>
              <Wand2 className='size-4' /> Auto-map
            </span>
            <p className='text-muted-foreground text-xs'>
              Deterministic candidates — previewed in the canvas, saved only when you Save.
            </p>
            <select
              className='border-input bg-background h-9 rounded-md border px-2 text-sm'
              value={strategy}
              disabled={busy}
              onChange={(e) => {
                setStrategy(e.target.value);
                void applyStrategy(e.target.value);
              }}
            >
              <option value=''>Choose a heuristic…</option>
              {view.strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {strategy && (
              <p className='text-muted-foreground text-xs'>
                {view.strategies.find((s) => s.id === strategy)?.description}
              </p>
            )}
          </div>

          {/* Selected fixture */}
          <div className='flex flex-col gap-3 rounded-md border p-3'>
            <span className='text-sm font-medium'>Selected fixture</span>
            {selectedRow == null ? (
              <p className='text-muted-foreground text-xs'>Tap a fixture in the canvas to inspect and remap it.</p>
            ) : (
              <div className='flex flex-col gap-3'>
                <div className='grid grid-cols-2 gap-x-3 gap-y-1 text-sm'>
                  <span className='text-muted-foreground'>Logical</span>
                  <span className='font-mono'>{selectedRow.logical}</span>
                  <span className='text-muted-foreground'>Label</span>
                  <span className='font-medium'>{selectedRow.label}</span>
                  <span className='text-muted-foreground'>Position</span>
                  <span>{selectedRow.position}</span>
                  <span className='text-muted-foreground'>Driven by</span>
                  <span>{selectedRow.shardOwner ?? 'all cannons'}</span>
                  {selectedRow.localIndex != null && (
                    <>
                      <span className='text-muted-foreground'>Device-local</span>
                      <span className='font-mono'>{selectedRow.localIndex}</span>
                    </>
                  )}
                  <span className='text-muted-foreground'>OSC</span>
                  <span className='font-mono text-xs'>{selectedRow.oscTarget}</span>
                </div>

                <Separator />

                <div className='flex flex-col gap-1'>
                  <span className='text-muted-foreground text-xs'>Physical output (wired to this fixture)</span>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={busy || draftPhysical == null || draftPhysical <= 0}
                      onClick={() => assignPhysical(selected!, (draftPhysical ?? 0) - 1)}
                    >
                      −
                    </Button>
                    <Input
                      type='number'
                      min={0}
                      max={N - 1}
                      className='h-8 w-20 text-center'
                      disabled={busy}
                      value={draftPhysical ?? 0}
                      onChange={(e) => assignPhysical(selected!, Number(e.target.value))}
                    />
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={busy || draftPhysical == null || draftPhysical >= N - 1}
                      onClick={() => assignPhysical(selected!, (draftPhysical ?? 0) + 1)}
                    >
                      +
                    </Button>
                    {draftPhysical === selected ? (
                      <Badge variant='outline'>identity</Badge>
                    ) : (
                      <Badge variant='warning'>corrected</Badge>
                    )}
                  </div>
                </div>

                <Button
                  variant={identifyOn ? 'default' : 'outline'}
                  size='sm'
                  disabled={!brainLive}
                  onClick={() => setIdentifyOn((v) => !v)}
                >
                  <Zap />
                  {identifyOn ? 'Flashing — click to stop' : 'Identify (flash on rig)'}
                </Button>
                {!brainLive && (
                  <p className='text-muted-foreground text-xs'>
                    Start this project's brain to flash fixtures on the live rig.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full chain table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-20'>Logical</TableHead>
            <TableHead className='w-28'>Physical</TableHead>
            <TableHead>Fixture</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Driven by</TableHead>
            <TableHead className='w-24'>Local idx</TableHead>
            <TableHead>OSC target</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((row) => {
            const physical = draft[row.logical] ?? row.physical;
            const corrected = physical !== row.logical;
            return (
              <TableRow
                key={row.logical}
                data-state={selected === row.logical ? 'selected' : undefined}
                className={cn('cursor-pointer', corrected && 'bg-warning/8')}
                onClick={() => setSelected(row.logical)}
              >
                <TableCell className='font-mono text-sm'>{row.logical}</TableCell>
                <TableCell className={cn('font-mono text-sm', corrected && 'text-warning-foreground font-medium')}>
                  {physical}
                </TableCell>
                <TableCell className='font-medium'>{row.label}</TableCell>
                <TableCell className='text-muted-foreground text-sm'>{row.position}</TableCell>
                <TableCell className='text-sm'>{row.shardOwner ?? 'all cannons'}</TableCell>
                <TableCell className='text-muted-foreground font-mono text-xs'>
                  {row.localIndex ?? '—'}
                </TableCell>
                <TableCell className='text-muted-foreground font-mono text-xs'>{row.oscTarget}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** SVG canvas laying fixtures out in their real geometry (grid or ring). */
function MappingCanvas({
  view,
  draft,
  selected,
  onSelect
}: {
  view: LightMapView;
  draft: number[];
  selected: number | null;
  onSelect: (logical: number) => void;
}) {
  const N = view.numCannons;
  const pad = 8;
  const span = 100 - pad * 2;
  const r = Math.max(2.4, Math.min(6, 40 / Math.sqrt(Math.max(N, 1))));

  return (
    <svg viewBox='0 0 100 100' className='h-auto w-full' role='img' aria-label='Light map canvas'>
      {view.rows.map((row) => {
        const physical = draft[row.logical] ?? row.physical;
        const corrected = physical !== row.logical;
        const isSel = selected === row.logical;
        const cx = pad + row.u * span;
        const cy = pad + row.v * span;
        return (
          <g key={row.logical} className='cursor-pointer' onClick={() => onSelect(row.logical)}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              className={cn(
                'transition-colors',
                corrected ? 'fill-warning' : 'fill-muted-foreground/40',
                isSel && 'stroke-primary'
              )}
              strokeWidth={isSel ? 1.2 : 0}
            />
            <text
              x={cx}
              y={cy + r * 0.35}
              textAnchor='middle'
              className='fill-background pointer-events-none select-none'
              style={{ fontSize: r * 0.9 }}
            >
              {row.logical}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
