import {
  bySeverity,
  formatUptime,
  relativeSeen,
  serverErrorMessage,
  tally
} from '@/renderer/lib/doctor-format';
import type { DoctorCheck, DoctorReport } from '@/types/ipc';

function report(over: Partial<DoctorReport> = {}): DoctorReport {
  return {
    project: 'show',
    checks: [],
    overall: 'pass',
    devices: [],
    sync: { enabled: true, revision: 0, fromServer: false, relevant: false, behind: [] },
    server: null,
    serverUrl: 'ws://localhost:3000',
    serverError: null,
    receiverRunning: false,
    generatedAt: 0,
    ...over
  };
}

const check = (status: DoctorCheck['status'], name: string): DoctorCheck => ({
  name,
  status,
  detail: name
});

describe('formatUptime', () => {
  it('scales from seconds to hours', () => {
    expect(formatUptime(4_000)).toBe('4s');
    expect(formatUptime(95_000)).toBe('1m 35s');
    expect(formatUptime(3_930_000)).toBe('1h 5m');
  });
});

describe('relativeSeen', () => {
  it('reports never for a device that has not checked in', () => {
    expect(relativeSeen(null)).toBe('never seen');
  });

  it('scales the relative age', () => {
    const now = 1_000_000_000;
    expect(relativeSeen(now - 5_000, now)).toBe('seen 5s ago');
    expect(relativeSeen(now - 120_000, now)).toBe('seen 2m ago');
    expect(relativeSeen(now - 7_200_000, now)).toBe('seen 2h ago');
    expect(relativeSeen(now - 172_800_000, now)).toBe('seen 2d ago');
  });
});

describe('tally + bySeverity', () => {
  const checks = [check('pass', 'a'), check('fail', 'b'), check('warn', 'c'), check('pass', 'd')];

  it('counts each status', () => {
    expect(tally(checks)).toEqual({ pass: 2, warn: 1, fail: 1 });
  });

  it('sorts failures first, then warnings', () => {
    expect(bySeverity(checks).map((c) => c.name)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('does not mutate the input order', () => {
    bySeverity(checks);
    expect(checks.map((c) => c.name)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('serverErrorMessage', () => {
  it('explains a brain that is simply not running', () => {
    expect(serverErrorMessage(report({ serverError: 'not-running' }))).toContain(
      'Nothing is listening at ws://localhost:3000'
    );
  });

  it('names the secret mismatch behind a 401 instead of just saying unauthorized', () => {
    const msg = serverErrorMessage(report({ serverError: 'unauthorized' }));
    expect(msg).toContain('receiver key');
    expect(msg).toContain('different secrets');
  });

  it('distinguishes a foreign listener from a wedged brain', () => {
    expect(serverErrorMessage(report({ serverError: 'not-wavegrid' }))).toContain('not a Wavegrid brain');
    expect(serverErrorMessage(report({ serverError: 'timeout' }))).toContain('never reported status');
  });
});
