import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { applyGeneratedRouting } from '../src/commands/runtime';
import {
  runRoutingClear,
  runRoutingGenerate,
  runRoutingImport,
  runRoutingShow
} from '../src/commands/routing';
import { getStore } from '../src/project';

const PROJECT = 'ring-demo';

function isolate(): string {
  const dir = mkdtempSync(join(tmpdir(), 'wg-routing-'));
  process.env.APPSTASH_BASE_DIR = dir;
  return dir;
}

/** A 6-cannon ring project with two laptops registered, each on half the ring. */
function project(): ReturnType<typeof getStore> {
  const store = getStore();
  store.createProject(PROJECT, { layout: { preset: 'ring-6' }, mode: 'distributed' });
  store.registerDevice(PROJECT, { id: 'dev-a', name: 'pc-a' });
  store.registerDevice(PROJECT, { id: 'dev-b', name: 'pc-b' });
  store.assignShard(PROJECT, 'pc-a', { start: 0, end: 2 });
  store.assignShard(PROJECT, 'pc-b', { start: 3, end: 5 });
  return store;
}

/** A hand-written global routing file, zones already numbered per PC. */
function writeGlobalRoutingFile(dir: string): string {
  const file = join(dir, 'routing-global.json');
  writeFileSync(
    file,
    JSON.stringify({
      targets: {
        pc1: { type: 'beyond', host: '10.0.0.2', port: 8000 },
        pc2: { type: 'beyond', host: '10.0.0.3', port: 8000 }
      },
      flushHz: 30,
      cannons: [
        { logical: 0, target: 'pc1', projectorIndex: 0, label: 'A1' },
        { logical: 1, target: 'pc1', projectorIndex: 1, label: 'A2' },
        { logical: 2, target: 'pc1', projectorIndex: 2, label: 'A3' },
        { logical: 3, target: 'pc2', projectorIndex: 0, label: 'A4' },
        { logical: 4, target: 'pc2', projectorIndex: 1, label: 'A5' },
        { logical: 5, target: 'pc2', projectorIndex: 2, label: 'A6' }
      ]
    })
  );
  return file;
}

/** Everything the command printed, joined and stripped of ANSI styling. */
function printed(spy: jest.SpyInstance): string {
  // eslint-disable-next-line no-control-regex
  return spy.mock.calls.map((c) => String(c[0]).replace(/\u001b\[[0-9;]*m/g, '')).join('\n');
}

const saved = { ...process.env };
let log: jest.SpyInstance;
beforeEach(() => {
  log = jest.spyOn(console, 'log').mockImplementation(() => {});
  process.exitCode = 0;
});
afterEach(() => {
  process.env = { ...saved };
  process.exitCode = 0;
  jest.restoreAllMocks();
});

describe('wavegrid projects routing import', () => {
  it('adopts a global file and lets generation own the zone numbers', () => {
    const dir = isolate();
    const store = project();
    const file = writeGlobalRoutingFile(dir);

    runRoutingImport({}, file);

    const spec = store.getProjectConfig(PROJECT)?.osc?.routing;
    expect(spec?.cannons).toHaveLength(6);
    expect(spec?.cannons.every((k) => k.projectorIndex === undefined)).toBe(true);
    expect(spec?.zoneBase).toBe(0);
    expect(process.exitCode).toBe(0);
  });

  it('pins the zone numbers as installed with --keep-zones', () => {
    const dir = isolate();
    const store = project();
    const file = writeGlobalRoutingFile(dir);

    runRoutingImport({ 'keep-zones': true }, file);

    const spec = store.getProjectConfig(PROJECT)?.osc?.routing;
    expect(spec?.cannons.map((k) => k.projectorIndex)).toEqual([0, 1, 2, 0, 1, 2]);
  });

  it('refuses a file that does not cover the show', () => {
    const dir = isolate();
    const store = project();
    const file = join(dir, 'short.json');
    writeFileSync(
      file,
      JSON.stringify({
        targets: { pc1: { type: 'beyond', host: '10.0.0.2', port: 8000 } },
        cannons: [{ logical: 0, target: 'pc1' }]
      })
    );

    runRoutingImport({}, file);

    expect(process.exitCode).toBe(1);
    expect(printed(log)).toContain('Cannon 1 is missing');
    expect(store.getProjectConfig(PROJECT)?.osc?.routing).toBeUndefined();
  });

  it('reports a missing file instead of throwing', () => {
    isolate();
    project();

    runRoutingImport({}, join(tmpdir(), 'definitely-not-here.json'));

    expect(process.exitCode).toBe(1);
    expect(printed(log)).toContain('No such file');
  });
});

describe('wavegrid projects routing generate', () => {
  it('writes one file per device, each re-based to that laptop', () => {
    const dir = isolate();
    const store = project();
    runRoutingImport({}, writeGlobalRoutingFile(dir));
    log.mockClear();

    runRoutingGenerate({});

    const outDir = join(store.stateDir(PROJECT), 'routing');
    const b = JSON.parse(readFileSync(join(outDir, 'pc-b.json'), 'utf8'));
    expect(b.cannons.map((k: { logical: number }) => k.logical)).toEqual([0, 1, 2]);
    expect(b.cannons.map((k: { globalLogical: number }) => k.globalLogical)).toEqual([3, 4, 5]);
    expect(b.cannons.map((k: { projectorIndex: number }) => k.projectorIndex)).toEqual([0, 1, 2]);
    expect(Object.keys(b.targets)).toEqual(['pc2']);
    expect(b.generated).toMatchObject({ device: 'pc-b', shard: { start: 3, end: 5 }, zoneBase: 0 });
  });

  it('refuses the whole installation when a shard gap would leave lasers dark', () => {
    const dir = isolate();
    const store = project();
    runRoutingImport({}, writeGlobalRoutingFile(dir));
    store.assignShard(PROJECT, 'pc-b', { start: 4, end: 5 });
    log.mockClear();

    runRoutingGenerate({});

    expect(process.exitCode).toBe(1);
    expect(printed(log)).toContain('No device drives fixture 3');
  });

  it('generates just one laptop with --device, gap and all', () => {
    const dir = isolate();
    const store = project();
    runRoutingImport({}, writeGlobalRoutingFile(dir));
    log.mockClear();

    runRoutingGenerate({ device: 'pc-b' });

    expect(process.exitCode).toBe(0);
    const outDir = join(store.stateDir(PROJECT), 'routing');
    expect(() => readFileSync(join(outDir, 'pc-b.json'), 'utf8')).not.toThrow();
    expect(() => readFileSync(join(outDir, 'pc-a.json'), 'utf8')).toThrow();
  });

  it('needs a spec before it can generate anything', () => {
    isolate();
    project();

    runRoutingGenerate({});

    expect(process.exitCode).toBe(1);
    expect(printed(log)).toContain('has no unified routing spec');
  });

  it('rejects an unknown device', () => {
    const dir = isolate();
    project();
    runRoutingImport({}, writeGlobalRoutingFile(dir));
    log.mockClear();

    runRoutingGenerate({ device: 'pc-z' });

    expect(process.exitCode).toBe(1);
    expect(printed(log)).toContain('No such device "pc-z"');
  });
});

describe('wavegrid projects routing show', () => {
  it('reports each device\'s global slice and its local re-base', () => {
    const dir = isolate();
    project();
    runRoutingImport({}, writeGlobalRoutingFile(dir));
    log.mockClear();

    runRoutingShow({});

    const out = printed(log);
    expect(out).toContain('global 0–2');
    expect(out).toContain('global 3–5');
    expect(out).toContain('local 0–2');
    expect(out).toContain('Zone base 0');
  });

  it('warns when nobody drives part of the show', () => {
    const dir = isolate();
    const store = project();
    runRoutingImport({}, writeGlobalRoutingFile(dir));
    store.assignShard(PROJECT, 'pc-b', { start: 4, end: 5 });
    log.mockClear();

    runRoutingShow({});

    expect(printed(log)).toContain('No device drives 3');
  });

  it('says so when there is no spec', () => {
    isolate();
    project();

    runRoutingShow({});

    expect(printed(log)).toContain('has no unified routing spec');
  });
});

describe('wavegrid projects routing clear', () => {
  it('forgets the spec', () => {
    const dir = isolate();
    const store = project();
    runRoutingImport({}, writeGlobalRoutingFile(dir));

    runRoutingClear({});

    expect(store.getProjectConfig(PROJECT)?.osc?.routing).toBeUndefined();
  });
});

describe('receiver env wiring', () => {
  function resolved(store: ReturnType<typeof getStore>) {
    const config = store.getProjectConfig(PROJECT) ?? {};
    return {
      config: { ...config, osc: config.osc ?? {} },
      layout: { count: 6 },
      runMode: 'distributed' as const
    };
  }

  it('generates this laptop\'s file and points ROUTING_CONFIG at it', () => {
    const dir = isolate();
    const store = project();
    runRoutingImport({}, writeGlobalRoutingFile(dir));
    process.env.SHARD_START = '3';
    process.env.SHARD_END = '5';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyGeneratedRouting(store, PROJECT, resolved(store) as any, 'pc-b');

    const file = process.env.ROUTING_CONFIG;
    expect(file).toBe(join(store.stateDir(PROJECT), 'routing', 'this-device.json'));
    const written = JSON.parse(readFileSync(file!, 'utf8'));
    expect(written.cannons.map((k: { logical: number }) => k.logical)).toEqual([0, 1, 2]);
    expect(written.generated.shard).toEqual({ start: 3, end: 5 });
  });

  it('leaves an explicitly-set ROUTING_CONFIG alone', () => {
    const dir = isolate();
    const store = project();
    runRoutingImport({}, writeGlobalRoutingFile(dir));
    process.env.ROUTING_CONFIG = '/tmp/hand-written.json';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyGeneratedRouting(store, PROJECT, resolved(store) as any, 'pc-b');

    expect(process.env.ROUTING_CONFIG).toBe('/tmp/hand-written.json');
  });

  it('disables OSC rather than emitting a config it knows is wrong', () => {
    const dir = isolate();
    const store = project();
    runRoutingImport({}, writeGlobalRoutingFile(dir));
    // Corrupt the stored spec the way a bad hand-edit would.
    const config = store.getProjectConfig(PROJECT) ?? {};
    config.osc!.routing!.cannons[1].target = 'nope';
    store.saveProjectConfig(PROJECT, config);
    log.mockClear();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyGeneratedRouting(store, PROJECT, resolved(store) as any, 'pc-b');

    expect(process.env.ROUTING_CONFIG).toBeUndefined();
    expect(printed(log)).toContain('OSC output disabled');
  });

  it('does nothing at all when the project has no unified spec', () => {
    isolate();
    const store = project();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyGeneratedRouting(store, PROJECT, resolved(store) as any, 'pc-b');

    expect(process.env.ROUTING_CONFIG).toBeUndefined();
  });
});
