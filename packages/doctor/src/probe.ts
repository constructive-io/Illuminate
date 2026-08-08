/**
 * Liveness probes against a running brain. Both resolve rather than reject —
 * a diagnostic must report "not running" as a fact, never crash the caller.
 */
import type { SystemStatus } from '@wavegrid/server';
import net from 'net';
import { URL } from 'url';
import { WebSocket } from 'ws';

export type PortState = 'open' | 'closed';

/** Why a system_status read failed, when it did. */
export type ProbeError = 'unauthorized' | 'timeout' | 'refused' | 'not-wavegrid';

export interface StatusProbe {
  status?: SystemStatus;
  error?: ProbeError;
}

/** TCP probe: 'open' if something is listening, else 'closed'. */
export function tcpProbe(host: string, port: number, timeoutMs = 1500): Promise<PortState> {
  const target = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (result: PortState) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done('open'));
    socket.once('timeout', () => done('closed'));
    socket.once('error', () => done('closed'));
    socket.connect(port, target);
  });
}

/** Connect to a running server and request a system_status snapshot. */
export function querySystemStatus(url: string, key: string, timeoutMs = 3000): Promise<StatusProbe> {
  return new Promise((resolve) => {
    const u = new URL(url);
    if (key) u.searchParams.set('key', key);
    let settled = false;
    const finish = (probe: StatusProbe) => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch { /* already closing */ }
      resolve(probe);
    };
    const timer = setTimeout(() => finish({ error: 'timeout' }), timeoutMs);
    const ws = new WebSocket(u.toString());

    ws.on('open', () => ws.send(JSON.stringify({ type: 'system_status' })));
    ws.on('unexpected-response', (_req, res) => {
      clearTimeout(timer);
      finish({ error: res.statusCode === 401 ? 'unauthorized' : 'not-wavegrid' });
    });
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'system_status') {
          clearTimeout(timer);
          finish({ status: msg as SystemStatus });
        }
      } catch { /* ignore non-JSON frames */ }
    });
    ws.on('error', () => {
      clearTimeout(timer);
      finish({ error: 'refused' });
    });
  });
}
