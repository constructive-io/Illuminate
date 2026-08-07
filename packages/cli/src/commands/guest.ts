import c from 'yanse';

import { type Flags, getStore, resolveProjectName } from '../project';

/** `wavegrid guest status` — is shared guest access set up / on? */
export function runGuestStatus(flags: Flags): void {
  const store = getStore();
  const project = resolveProjectName(store, flags);
  const guest = store.guestStatus(project);

  console.log('');
  console.log(c.bold(`  Shared guest access · ${project}`));
  if (!guest.configured) {
    console.log(c.gray('  Not set up — create one with `wavegrid guest new`'));
  } else {
    console.log(`  ${guest.enabled ? c.green('• enabled') : c.yellow('• disabled')}`);
    console.log(c.gray('  Guests log in as operator (never admin) with the shared passphrase.'));
  }
  console.log('');
}

/**
 * `wavegrid guest new` (alias `rotate`) — mint a fresh shared passphrase and
 * print it once. Only its hash is stored; the old passphrase stops working.
 */
export function runGuestRotate(flags: Flags): void {
  const store = getStore();
  const project = resolveProjectName(store, flags);
  const existed = store.guestStatus(project).configured;
  const passphrase = store.rotateGuestPassphrase(project);

  console.log('');
  console.log(c.green(`  ✓ ${existed ? 'Rotated' : 'Created'} the shared guest passphrase for ${project}`));
  console.log('');
  console.log(`  ${c.bold(c.cyan(passphrase))}`);
  console.log('');
  console.log(c.gray('  Share this now — it is not shown again. Guests sign in as operator.'));
  console.log('');
}

/** `wavegrid guest enable|disable` — flip logins without changing the passphrase. */
export function runGuestEnabled(flags: Flags, enabled: boolean): void {
  const store = getStore();
  const project = resolveProjectName(store, flags);
  try {
    const guest = store.setGuestEnabled(project, enabled);
    console.log('');
    console.log(c.green(`  ✓ Shared guest access ${guest.enabled ? 'enabled' : 'disabled'} for ${project}`));
    console.log('');
  } catch (e) {
    console.log('');
    console.log(c.red(`  ${(e as Error).message}`));
    console.log('');
    process.exitCode = 1;
  }
}

/** `wavegrid guest rm` — remove shared guest access entirely. */
export function runGuestClear(flags: Flags): void {
  const store = getStore();
  const project = resolveProjectName(store, flags);
  store.clearGuest(project);
  console.log('');
  console.log(c.green(`  ✓ Removed shared guest access from ${project}`));
  console.log('');
}
