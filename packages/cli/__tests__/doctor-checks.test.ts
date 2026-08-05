import type { WavegridConfig } from '@wavegrid/layout';

import {
  checkEnvHijack,
  checkOsc,
  checkShard,
  isSecureMode,
  overallStatus
} from '../src/commands/doctor-checks';

function config(osc: WavegridConfig['osc']): WavegridConfig {
  return {
    layout: { preset: 'ring-6' },
    mode: 'auto',
    simpleModeMax: 40,
    server: { host: '0.0.0.0', port: 3000 },
    ui: { port: 3003 },
    receiver: { alpha: 0.06, fallbackDelay: 3000 },
    osc,
    debug: { osc: false }
  };
}

describe('checkEnvHijack', () => {
  it('passes when no generic port/host vars are set', () => {
    const check = checkEnvHijack({});
    expect(check.status).toBe('pass');
  });

  it('warns and lists the ignored vars when a bare PORT is set', () => {
    const check = checkEnvHijack({ PORT: '5000', HOST: '0.0.0.0' });
    expect(check.status).toBe('warn');
    expect(check.detail).toContain('PORT=5000');
    expect(check.detail).toContain('HOST=0.0.0.0');
    expect(check.remedy).toContain('unset PORT HOST');
  });
});

describe('checkShard', () => {
  it('passes with no shard', () => {
    expect(checkShard(6, undefined).status).toBe('pass');
  });

  it('passes for an in-range shard', () => {
    expect(checkShard(49, { start: 0, end: 24 }).status).toBe('pass');
  });

  it('fails when the end exceeds the cannon count', () => {
    const check = checkShard(49, { start: 40, end: 60 });
    expect(check.status).toBe('fail');
    expect(check.detail).toContain('end 60 ≥ count 49');
  });

  it('fails when start > end', () => {
    expect(checkShard(49, { start: 30, end: 10 }).status).toBe('fail');
  });
});

describe('isSecureMode', () => {
  it('accepts 0600 and rejects group/other-readable modes', () => {
    expect(isSecureMode(0o600)).toBe(true);
    expect(isSecureMode(0o644)).toBe(false);
    expect(isSecureMode(0o640)).toBe(false);
  });
});

describe('checkOsc', () => {
  it('warns when no target is configured', () => {
    expect(checkOsc(config({})).status).toBe('warn');
  });

  it('passes with a BEYOND target', () => {
    expect(checkOsc(config({ beyond: { host: '10.0.0.5', port: 7001, gridOrder: 'row' } })).status).toBe('pass');
  });
});

describe('overallStatus', () => {
  it('reports the worst status across checks', () => {
    expect(overallStatus([{ name: 'a', status: 'pass', detail: '' }])).toBe('pass');
    expect(overallStatus([
      { name: 'a', status: 'pass', detail: '' },
      { name: 'b', status: 'warn', detail: '' }
    ])).toBe('warn');
    expect(overallStatus([
      { name: 'a', status: 'warn', detail: '' },
      { name: 'b', status: 'fail', detail: '' }
    ])).toBe('fail');
  });
});
