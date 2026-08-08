import { HardDrive, TriangleAlert } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { StoreClearResult, StoreInfo } from '@/types/ipc';

/** Typed exactly, or nothing is cleared. */
const CONFIRM_WORD = 'clear all';

interface SettingsRouteProps {
  info: StoreInfo | null;
  onClear: (keepDevice: boolean) => Promise<StoreClearResult>;
  busy: boolean;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className='flex items-baseline justify-between gap-4 py-1'>
      <span className='text-muted-foreground text-sm'>{label}</span>
      <span className='truncate font-mono text-xs'>{value}</span>
    </div>
  );
}

/**
 * Settings — where the store lives, plus clear-all. The wipe is irreversible
 * (secrets are generated once and cannot be recovered), so it stays behind a
 * typed confirmation and reports exactly what it removed.
 */
export function SettingsRoute({ info, onClear, busy }: SettingsRouteProps) {
  const [confirm, setConfirm] = React.useState('');
  const [keepDevice, setKeepDevice] = React.useState(true);
  const [result, setResult] = React.useState<StoreClearResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const projects = info?.projects ?? [];
  const armed = confirm.trim().toLowerCase() === CONFIRM_WORD;
  const empty = projects.length === 0;

  const clear = async () => {
    setError(null);
    try {
      setResult(await onClear(keepDevice));
      setConfirm('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className='flex flex-col gap-4 p-4'>
      <div className='rounded-lg border px-4 py-3'>
        <div className='mb-2 flex items-center gap-2'>
          <HardDrive className='size-4' />
          <span className='font-medium'>Store</span>
          <Badge variant='outline'>{projects.length} project(s)</Badge>
        </div>
        <Separator className='mb-2' />
        <Row label='Location' value={info?.root ?? '—'} />
        {info?.baseOverride && <Row label='Base override' value={info.baseOverride} />}
        <Row label='This device' value={info?.deviceName ?? '—'} />
        <Row label='Projects' value={empty ? '(none)' : projects.join(', ')} />
      </div>

      <div className='border-destructive/40 flex flex-col gap-3 rounded-lg border px-4 py-3'>
        <div className='flex items-center gap-2'>
          <TriangleAlert className='text-destructive size-4' />
          <span className='font-medium'>Clear all</span>
        </div>
        <p className='text-muted-foreground text-sm'>
          Removes every project, secret, user account, access key, session, device record, light map
          and log from this store. Secrets are generated once and cannot be recovered — export
          anything you want to keep first.
        </p>

        <label className='flex w-fit items-center gap-2 text-sm'>
          <input
            type='checkbox'
            checked={keepDevice}
            disabled={busy}
            onChange={(ev) => setKeepDevice(ev.target.checked)}
          />
          Keep this machine’s device identity ({info?.deviceName ?? 'unnamed'})
        </label>

        {empty ? (
          <p className='text-muted-foreground text-sm'>The store is already empty.</p>
        ) : (
          <div className='flex flex-wrap items-end gap-2'>
            <div className='flex flex-col gap-1'>
              <Label htmlFor='clear-confirm' className='text-xs'>
                Type “{CONFIRM_WORD}” to confirm
              </Label>
              <Input
                id='clear-confirm'
                value={confirm}
                autoComplete='off'
                placeholder={CONFIRM_WORD}
                disabled={busy}
                onChange={(ev) => setConfirm(ev.target.value)}
                className='h-9 w-56'
              />
            </div>
            <Button variant='destructive' disabled={busy || !armed} onClick={() => void clear()}>
              Clear everything
            </Button>
          </div>
        )}

        {error && <p className='text-destructive text-sm'>{error}</p>}
        {result && (
          <p className='text-muted-foreground text-sm'>
            Cleared{' '}
            {result.projects.length > 0 ? result.projects.join(', ') : 'nothing — store was empty'}
            {result.projects.length > 0 &&
              ` · ${result.secrets} secret file(s), ${result.logs} log dir(s)`}
            {result.device && ' · device identity forgotten'}
          </p>
        )}
      </div>
    </div>
  );
}
