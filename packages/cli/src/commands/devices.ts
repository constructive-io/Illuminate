import type { DeviceRecord } from '@wavegrid/settings';
import type { Inquirerer, Question } from 'inquirerer';
import c from 'yanse';

import { type Flags, getStore, resolveProjectName } from '../project';

function since(lastSeen?: number): string {
  if (!lastSeen) return 'never';
  const secs = Math.round((Date.now() - lastSeen) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function shardLabel(d: DeviceRecord): string {
  if (!d.shard) return 'all cannons';
  return `shard ${d.shard.start}–${d.shard.end}`;
}

/** `wavegrid devices list` — devices that have joined the current project. */
export function runDevicesList(flags: Flags): void {
  const store = getStore();
  const project = resolveProjectName(store, flags);
  const devices = store.listDevices(project);

  console.log('');
  console.log(c.bold(`  Devices · ${project}`));
  if (devices.length === 0) {
    console.log(c.gray('  (none yet) — a device registers itself when its receiver connects to the brain'));
    console.log('');
    return;
  }
  for (const d of devices) {
    const at = d.address ? c.gray(d.address) : c.gray('—');
    console.log(`  ${c.cyan('•')} ${c.bold(d.name)}  ${at}  ${shardLabel(d)}  ${c.gray(since(d.lastSeen))}`);
    console.log(`      ${c.gray(`id ${d.id}${d.hostname ? ` · ${d.hostname}` : ''}`)}`);
  }
  console.log('');
}

/**
 * `wavegrid devices rename [name-or-id] [new-name]` — set a project-specific
 * friendly name. With no args, prompt with a list (interactive) / usage (no TTY).
 */
export async function runDevicesRename(
  flags: Flags,
  target: string | undefined,
  newName: string | undefined,
  prompter?: Inquirerer
): Promise<void> {
  const store = getStore();
  const project = resolveProjectName(store, flags);
  const devices = store.listDevices(project);

  if (devices.length === 0) {
    console.log('');
    console.log(c.gray(`  No devices in ${project} yet — they register when a receiver connects.`));
    console.log('');
    return;
  }

  let chosen = target;
  if (!chosen) {
    if (!prompter) {
      console.log(c.red('  Usage: wavegrid devices rename <name-or-id> <new-name>'));
      console.log(`  Devices: ${c.cyan(devices.map(d => d.name).join(', '))}`);
      process.exitCode = 1;
      return;
    }
    const answer = (await prompter.prompt({}, [
      {
        type: 'autocomplete',
        name: 'target',
        message: 'Which device should be renamed?',
        options: devices.map(d => d.name),
        required: true
      } as Question
    ])) as unknown as { target: string };
    chosen = answer.target;
  }

  let finalName = newName;
  if (!finalName) {
    if (!prompter) {
      console.log(c.red('  Usage: wavegrid devices rename <name-or-id> <new-name>'));
      process.exitCode = 1;
      return;
    }
    const answer = (await prompter.prompt({}, [
      { type: 'text', name: 'name', message: `New name for ${chosen}`, required: true } as Question
    ])) as unknown as { name: string };
    finalName = answer.name;
  }

  const updated = store.renameDevice(project, chosen, finalName);
  console.log('');
  if (updated) console.log(c.green(`  ✓ Renamed device to ${c.bold(updated.name)} in ${project}`));
  else console.log(c.yellow(`  No such device "${chosen}" in ${project}`));
  console.log('');
}

/** `wavegrid devices rm [name-or-id]` — forget a device from the project registry. */
export async function runDevicesRemove(flags: Flags, target: string | undefined, prompter?: Inquirerer): Promise<void> {
  const store = getStore();
  const project = resolveProjectName(store, flags);
  const devices = store.listDevices(project);

  if (devices.length === 0) {
    console.log('');
    console.log(c.gray(`  No devices in ${project} to remove.`));
    console.log('');
    return;
  }

  let chosen = target;
  if (!chosen) {
    if (!prompter) {
      console.log(c.red('  Usage: wavegrid devices rm <name-or-id>'));
      console.log(`  Devices: ${c.cyan(devices.map(d => d.name).join(', '))}`);
      process.exitCode = 1;
      return;
    }
    const answer = (await prompter.prompt({}, [
      {
        type: 'autocomplete',
        name: 'target',
        message: `Which device should be forgotten from ${project}?`,
        options: devices.map(d => d.name),
        required: true
      } as Question
    ])) as unknown as { target: string };
    chosen = answer.target;
  }

  const removed = store.removeDevice(project, chosen);
  console.log('');
  if (removed) console.log(c.green(`  ✓ Forgot device ${c.bold(chosen)} from ${project}`));
  else console.log(c.yellow(`  No such device "${chosen}" in ${project}`));
  console.log('');
}
