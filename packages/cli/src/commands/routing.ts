/**
 * `wavegrid projects routing …` — the one place a multi-machine show is
 * authored. The unified spec lives in the project config in GLOBAL logical
 * order; each laptop's own routing file is generated from it (shard-sliced,
 * zones re-based). A one-laptop show never needs any of this.
 */
import {
  generateDeviceRouting,
  resolveLayout,
  type RoutingDevice,
  RoutingValidationError,
  summarizeRanges,
  uncoveredFixtures,
  type UnifiedRouting,
  validateUnifiedRouting
} from '@wavegrid/layout';
import type { SettingsStore } from '@wavegrid/settings';
import fs from 'fs';
import path from 'path';
import c from 'yanse';

import { type Flags, getStore, resolveProjectName } from '../project';

const USAGE = [
  '  Usage:',
  '    wavegrid projects routing show                 What the show routes to, and what each device gets',
  '    wavegrid projects routing import <file>        Adopt a global routing JSON as the unified spec',
  '    wavegrid projects routing import <file> --keep-zones',
  '    wavegrid projects routing generate [--device <name>] [--out <dir>]',
  '    wavegrid projects routing clear                Forget the unified spec'
].join('\n');

interface Context {
  store: SettingsStore;
  project: string;
  spec: UnifiedRouting | undefined;
  /** Cannon count of the project's layout — the global index space. */
  count: number;
}

function context(flags: Flags): Context {
  const store = getStore();
  const project = resolveProjectName(store, flags);
  const config = store.getProjectConfig(project) ?? {};
  const layout = resolveLayout(config.layout ?? { preset: 'grid-7x7' });
  return { store, project, spec: config.osc?.routing, count: layout.count };
}

function str(flags: Flags, key: string): string | undefined {
  const v = flags[key];
  return typeof v === 'string' && v !== '' ? v : undefined;
}

function noSpec(project: string): void {
  console.log('');
  console.log(c.gray(`  ${project} has no unified routing spec.`));
  console.log(c.gray('  Import one with `wavegrid projects routing import <file>`, or point a'));
  console.log(c.gray('  one-laptop show straight at hardware with `wavegrid projects osc`.'));
  console.log('');
}

/** Devices to generate for: the registry's, or a single named one. */
function devicesFor(ctx: Context, only?: string): RoutingDevice[] {
  const records = ctx.store.listDevices(ctx.project);
  const all: RoutingDevice[] = records.map((d) => ({
    name: d.name,
    ...(d.shard ? { shard: d.shard } : {})
  }));
  if (only == null) return all;
  const match = all.find((d) => d.name === only) ?? records.find((d) => d.id === only);
  if (match == null) return [];
  return [{ name: match.name, ...(match.shard ? { shard: match.shard } : {})}];
}

function printProblems(problems: readonly string[]): void {
  for (const p of problems) console.log(c.red(`  ✗ ${p}`));
}

/** `routing show` — the spec, plus what each registered device would get. */
export function runRoutingShow(flags: Flags): void {
  const ctx = context(flags);
  if (!ctx.spec) {
    noSpec(ctx.project);
    return;
  }

  const targets = Object.entries(ctx.spec.targets);
  console.log('');
  console.log(c.bold(`  Routing · ${ctx.project}`) + c.gray(`  ${ctx.count} cannons, global 0–${ctx.count - 1}`));
  console.log(c.gray(`  Zone base ${ctx.spec.zoneBase ?? 0}${ctx.spec.flushHz ? ` · ${ctx.spec.flushHz} Hz` : ''}`));
  for (const [name, target] of targets) {
    const driven = ctx.spec.cannons.filter((k) => k.target === name).map((k) => k.logical);
    console.log(
      `  ${c.cyan('•')} ${c.bold(name)} ${c.gray(`${target.type} ${target.host}:${target.port}`)}  ` +
        c.gray(`drives ${summarizeRanges(driven)}`)
    );
  }

  const problems = validateUnifiedRouting(ctx.spec, ctx.count);
  if (problems.length > 0) {
    console.log('');
    printProblems(problems);
    console.log('');
    process.exitCode = 1;
    return;
  }

  const devices = devicesFor(ctx);
  console.log('');
  if (devices.length === 0) {
    console.log(c.gray('  No devices registered yet — they join when their receiver connects.'));
    console.log('');
    return;
  }

  console.log(c.bold('  Generated per device'));
  for (const device of devices) {
    try {
      const { devices: out } = generateDeviceRouting(ctx.spec, [device], ctx.count);
      const gen = out[0];
      const zones = gen.cannons.map((k) => k.projectorIndex).filter((z): z is number => z !== undefined);
      const shard = device.shard ? `${device.shard.start}–${device.shard.end}` : 'all';
      console.log(
        `  ${c.cyan('•')} ${c.bold(device.name)}  ${c.gray(`global ${shard}`)} → ` +
          `${c.gray(`local 0–${gen.cannons.length - 1}`)}  ` +
          `${c.gray(zones.length > 0 ? `zones ${summarizeRanges(zones)}` : 'no zones')}  ` +
          c.gray(`[${Object.keys(gen.targets).join(', ')}]`)
      );
    } catch (e) {
      console.log(`  ${c.red('✗')} ${c.bold(device.name)} ${c.red((e as Error).message.split('\n')[1] ?? '')}`);
      process.exitCode = 1;
    }
  }

  const uncovered = uncoveredFixtures(devices, ctx.count);
  if (uncovered.length > 0) {
    console.log('');
    console.log(c.yellow(`  ⚠ No device drives ${summarizeRanges(uncovered)} — assign shards with \`wavegrid devices assign\`.`));
  }
  console.log('');
}

/**
 * `routing import <file>` — adopt a hand-written global routing JSON as the
 * unified spec. Zone numbers are dropped by default (generation owns them, per
 * device); `--keep-zones` pins them for rigs whose zones can't be renumbered.
 */
export function runRoutingImport(flags: Flags, file: string | undefined): void {
  const ctx = context(flags);
  const target = file ?? str(flags, 'file');
  if (!target) {
    console.log('');
    console.log(c.red('  Usage: wavegrid projects routing import <file> [--keep-zones]'));
    console.log('');
    process.exitCode = 1;
    return;
  }

  const resolvedPath = path.resolve(process.cwd(), target);
  if (!fs.existsSync(resolvedPath)) {
    console.log('');
    console.log(c.red(`  No such file: ${resolvedPath}`));
    console.log('');
    process.exitCode = 1;
    return;
  }

  let parsed: UnifiedRouting;
  try {
    parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as UnifiedRouting;
  } catch (e) {
    console.log('');
    console.log(c.red(`  Could not read ${resolvedPath}: ${(e as Error).message}`));
    console.log('');
    process.exitCode = 1;
    return;
  }

  const keepZones = flags['keep-zones'] === true;
  const spec: UnifiedRouting = {
    targets: parsed.targets,
    ...(parsed.flushHz !== undefined ? { flushHz: parsed.flushHz } : {}),
    zoneBase: parsed.zoneBase === 1 ? 1 : 0,
    cannons: (parsed.cannons ?? []).map((cannon) =>
      keepZones ? cannon : { ...cannon, projectorIndex: undefined }
    )
  };
  // Drop the undefined keys so the stored spec stays clean JSON.
  spec.cannons = spec.cannons.map((cannon) => {
    const copy = { ...cannon };
    if (copy.projectorIndex === undefined) delete copy.projectorIndex;
    return copy;
  });

  const problems = validateUnifiedRouting(spec, ctx.count);
  if (problems.length > 0) {
    console.log('');
    console.log(c.red(`  ${resolvedPath} is not a valid unified spec for ${ctx.project}:`));
    printProblems(problems);
    console.log('');
    process.exitCode = 1;
    return;
  }

  const config = ctx.store.getProjectConfig(ctx.project) ?? {};
  config.osc = { ...(config.osc ?? {}), routing: spec };
  delete config.osc.routingConfig;
  ctx.store.saveProjectConfig(ctx.project, config);

  console.log('');
  console.log(
    c.green(`  ✓ ${ctx.project}: unified routing spec adopted`) +
      c.gray(` — ${spec.cannons.length} cannons, ${Object.keys(spec.targets).length} target(s)`)
  );
  console.log(
    c.gray(keepZones
      ? '    Zone numbers kept as installed.'
      : '    Zone numbers will be generated per device (--keep-zones to pin them).')
  );
  console.log(c.gray('    Each receiver generates its own file on start — nothing to copy around.'));
  console.log('');
}

/**
 * `routing generate [--device <name>] [--out <dir>]` — write the per-device
 * files. Without `--device` it generates for every registered device and
 * insists the shards cover the whole show; with one, it generates just that
 * laptop's file.
 */
export function runRoutingGenerate(flags: Flags): void {
  const ctx = context(flags);
  if (!ctx.spec) {
    noSpec(ctx.project);
    process.exitCode = 1;
    return;
  }

  const only = str(flags, 'device');
  const devices = devicesFor(ctx, only);
  if (devices.length === 0) {
    console.log('');
    console.log(only == null
      ? c.yellow(`  No devices registered in ${ctx.project} yet — they join when a receiver connects.`)
      : c.red(`  No such device "${only}" in ${ctx.project}.`));
    console.log('');
    process.exitCode = 1;
    return;
  }

  let result;
  try {
    result = generateDeviceRouting(ctx.spec, devices, ctx.count, { requireCoverage: only == null });
  } catch (e) {
    console.log('');
    if (e instanceof RoutingValidationError) {
      console.log(c.red(`  Cannot generate routing for ${ctx.project}:`));
      printProblems(e.problems);
    } else {
      console.log(c.red(`  Cannot generate routing: ${(e as Error).message}`));
    }
    console.log('');
    process.exitCode = 1;
    return;
  }

  const outDir = str(flags, 'out') ?? path.join(ctx.store.stateDir(ctx.project), 'routing');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('');
  console.log(c.bold(`  Generated routing · ${ctx.project}`) + c.gray(`  → ${outDir}`));
  for (const device of result.devices) {
    const file = path.join(outDir, `${device.generated.device}.json`);
    fs.writeFileSync(file, `${JSON.stringify(device, null, 2)}\n`);
    const shard = device.generated.shard;
    console.log(
      `  ${c.green('✓')} ${c.bold(device.generated.device)}  ` +
        c.gray(`${shard ? `global ${shard.start}–${shard.end}` : 'all cannons'} → local 0–${device.cannons.length - 1}`) +
        c.gray(`  ${path.basename(file)}`)
    );
  }
  for (const warning of result.warnings) console.log(c.yellow(`  ⚠ ${warning}`));
  console.log('');
  console.log(c.gray('  Each receiver regenerates its own file on start; these are for review/hand-off.'));
  console.log('');
}

/** `routing clear` — forget the unified spec (back to a single OSC target). */
export function runRoutingClear(flags: Flags): void {
  const ctx = context(flags);
  const config = ctx.store.getProjectConfig(ctx.project) ?? {};
  if (config.osc?.routing === undefined) {
    noSpec(ctx.project);
    return;
  }
  delete config.osc.routing;
  ctx.store.saveProjectConfig(ctx.project, config);
  console.log('');
  console.log(c.green(`  ✓ ${ctx.project}: unified routing spec removed`));
  console.log('');
}

export function printRoutingUsage(): void {
  console.log('');
  console.log(USAGE);
  console.log('');
}
