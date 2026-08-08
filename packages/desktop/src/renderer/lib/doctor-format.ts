/**
 * Pure presentation helpers for the Status screen. Kept out of the component so
 * the wording of a failure — the thing an operator reads mid-show — is unit
 * tested rather than eyeballed.
 */
import type { DoctorCheck, DoctorReport } from '@/types/ipc';

export function formatUptime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function relativeSeen(lastSeen: number | null, now = Date.now()): string {
  if (lastSeen == null) return 'never seen';
  const secs = Math.max(0, Math.round((now - lastSeen) / 1000));
  if (secs < 60) return `seen ${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `seen ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `seen ${hrs}h ago`;
  return `seen ${Math.round(hrs / 24)}d ago`;
}

export interface CheckTally {
  pass: number;
  warn: number;
  fail: number;
}

export function tally(checks: DoctorCheck[]): CheckTally {
  return checks.reduce<CheckTally>(
    (acc, c) => ({ ...acc, [c.status]: acc[c.status] + 1 }),
    { pass: 0, warn: 0, fail: 0 }
  );
}

/** Failures first, then warnings, then passes — the order you want to read. */
export function bySeverity(checks: DoctorCheck[]): DoctorCheck[] {
  const rank = { fail: 0, warn: 1, pass: 2 };
  return [...checks].sort((a, b) => rank[a.status] - rank[b.status]);
}

/** Why the brain's own view is missing, phrased as something to act on. */
export function serverErrorMessage(report: DoctorReport): string {
  switch (report.serverError) {
  case 'not-running':
    return `Nothing is listening at ${report.serverUrl} — start the show to see receivers and coverage.`;
  case 'unauthorized':
    return `The brain at ${report.serverUrl} rejected this laptop's receiver key (401) — the two stores hold different secrets. Re-import the project (or re-sync secrets) so they match.`;
  case 'timeout':
    return `The brain at ${report.serverUrl} accepted the connection but never reported status — it may be starting up or wedged.`;
  case 'not-wavegrid':
    return `Something is listening at ${report.serverUrl}, but it is not a Wavegrid brain.`;
  case 'refused':
    return `The connection to ${report.serverUrl} was refused.`;
  default:
    return `Could not read status from ${report.serverUrl}.`;
  }
}

export const OVERALL_LABEL: Record<DoctorReport['overall'], string> = {
  pass: 'healthy',
  warn: 'warnings',
  fail: 'problems found'
};
