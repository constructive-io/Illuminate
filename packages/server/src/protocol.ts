/**
 * Wire protocol for system introspection (used by `wavegrid doctor`).
 *
 * These are additive to the existing state/command/layout messages: a receiver
 * announces itself with `hello` on connect, and any authenticated client can
 * ask the server for a `system_status` snapshot of the whole installation.
 */

import type { CoverageResult, ShardRange } from './coverage';

export type ClientRole = 'receiver' | 'ui' | 'unknown';

/** Sent by a receiver immediately after it connects. */
export interface HelloMessage {
  type: 'hello';
  role: 'receiver';
  host: string;
  pid: number;
  version: string;
  layout: { id: string; count: number };
  mode: 'simple' | 'distributed';
  shard: ShardRange | null;
}

/** Per-connection view the server keeps for every socket. */
export interface ClientInfo {
  role: ClientRole;
  remote: string;
  connectedAt: number;
  lastSeen: number;
  hello?: Omit<HelloMessage, 'type' | 'role'>;
}

/** Request → `{ type: 'system_status' }`. Response shape below. */
export interface SystemStatus {
  type: 'system_status';
  server: {
    version: string;
    layout: { id: string; name: string; count: number };
    mode: string;
    port: number;
    host: string;
    uptimeMs: number;
  };
  receivers: ClientInfo[];
  uiClients: number;
  coverage: CoverageResult;
}
