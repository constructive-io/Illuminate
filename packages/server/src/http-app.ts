/**
 * The brain's HTTP surface. One origin/port serves the static UI, the small
 * JSON API the UI needs, and (via the server's upgrade handler) the WebSocket.
 * This is what collapses the old two-service (Next UI + wavegrid server) split
 * — same-origin means no `ui.port` / `simulatorUrl` to keep in sync.
 */
import { type ResolvedConfig } from '@wavegrid/layout';
import { openStore } from '@wavegrid/settings';
import * as fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import { extname, join, normalize, resolve } from 'path';

import { signJwt } from './jwt';

export interface HttpAppOptions {
  /** Directory of the built UI (Vite `dist`). Static serving is skipped if unset/missing. */
  uiDir?: string | null;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8'
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) reject(new Error('payload too large'));
    });
    req.on('end', () => resolvePromise(data));
    req.on('error', reject);
  });
}

/** Which project the brain serves: explicit env wins, else the store's active project. */
function activeProject(): string | null {
  const store = openStore();
  return process.env.WAVEGRID_PROJECT ?? store.getActiveProject();
}

// ── Light-map persistence (per-project state, not a cwd-relative deploy file) ──
interface LightMapConfig {
  version: 1;
  numCannons: number;
  gridColumns: number;
  physicalLights: number[];
  updatedAt?: string;
}

function lightMapFile(): string {
  if (process.env.LIGHT_MAP_CONFIG) return process.env.LIGHT_MAP_CONFIG;
  const stateDir = process.env.WG_STATE_DIR || resolve(process.cwd(), '.state');
  return join(stateDir, 'light-map.json');
}

function identityMap(numCannons: number): number[] {
  return Array.from({ length: numCannons }, (_, index) => index);
}

function normalizeLightMap(
  input: Partial<LightMapConfig> | null,
  dims: { numCannons: number; gridColumns: number }
): LightMapConfig {
  const numCannons = input?.numCannons ?? dims.numCannons;
  const gridColumns = input?.gridColumns ?? dims.gridColumns;
  const fallback = identityMap(numCannons);
  const source = Array.isArray(input?.physicalLights) ? input.physicalLights : fallback;
  const used = new Set<number>();
  const physicalLights = source.slice(0, numCannons).map((value) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n >= numCannons || used.has(n)) return -1;
    used.add(n);
    return n;
  });

  for (let index = 0; index < numCannons; index++) {
    if (physicalLights[index] !== undefined && physicalLights[index] >= 0) continue;
    const next = fallback.find((value) => !used.has(value));
    physicalLights[index] = next ?? index;
    used.add(physicalLights[index]);
  }

  return { version: 1, numCannons, gridColumns, physicalLights, updatedAt: input?.updatedAt };
}

/**
 * Build the HTTP request listener. Uses the already-resolved config so the
 * layout/config the embedding process resolved is exactly what the UI sees.
 */
export function createHttpApp(resolved: ResolvedConfig, opts: HttpAppOptions = {}) {
  const layout = resolved.layout;
  const uiDir = opts.uiDir && fs.existsSync(opts.uiDir) ? opts.uiDir : null;
  const dims = { numCannons: layout.count, gridColumns: layout.cols };

  function serveStatic(req: IncomingMessage, res: ServerResponse, pathname: string): void {
    if (!uiDir) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('UI assets not found. Build @wavegrid/ui or set WG_UI_DIR.');
      return;
    }

    // Resolve within uiDir; never escape it. Unknown routes fall back to the SPA shell.
    const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(uiDir, rel);
    if (!filePath.startsWith(uiDir) || pathname === '/' || !extname(filePath)) {
      filePath = join(uiDir, 'index.html');
    }
    if (!fs.existsSync(filePath)) filePath = join(uiDir, 'index.html');

    const headOnly = (req.method || 'GET').toUpperCase() === 'HEAD';
    fs.readFile(filePath, (err, buf) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }
      const type = MIME[extname(filePath)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': buf.length });
      res.end(headOnly ? undefined : buf);
    });
  }

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url || '/', `http://${host}`);
    const pathname = url.pathname;
    const method = (req.method || 'GET').toUpperCase();

    // ── GET /api/config ─────────────────────────────────────────────
    if (pathname === '/api/config' && method === 'GET') {
      // Same-origin: the UI's WebSocket connects back to this very server.
      // Honour a reverse proxy's TLS termination via x-forwarded-proto.
      const forwardedProto = req.headers['x-forwarded-proto'];
      const scheme = forwardedProto === 'https' ? 'wss' : 'ws';
      const simulatorUrl = `${scheme}://${host}`;
      sendJson(res, 200, {
        simulatorUrl,
        runMode: resolved.runMode,
        layout,
        numCannons: layout.count,
        gridColumns: layout.cols
      });
      return;
    }

    // ── POST /api/login ─────────────────────────────────────────────
    if (pathname === '/api/login' && method === 'POST') {
      let body: { username?: string; password?: string };
      try {
        body = JSON.parse((await readBody(req)) || '{}');
      } catch {
        sendJson(res, 400, { ok: false, error: 'Invalid request' });
        return;
      }
      const username = body.username;
      const password = body.password;
      if (!username || !password) {
        sendJson(res, 400, { ok: false, error: 'Missing credentials' });
        return;
      }
      const project = activeProject();
      const store = openStore();
      if (!project || store.listUsers(project).length === 0) {
        sendJson(res, 503, { ok: false, error: 'Auth not configured' });
        return;
      }
      if (!store.verifyUser(project, username, password)) {
        sendJson(res, 401, { ok: false, error: 'Invalid username or password' });
        return;
      }
      sendJson(res, 200, { ok: true, username, token: signJwt(username) });
      return;
    }

    // ── GET/POST /api/light-map ─────────────────────────────────────
    if (pathname === '/api/light-map') {
      const file = lightMapFile();
      if (method === 'GET') {
        let cfg: LightMapConfig;
        try {
          cfg = normalizeLightMap(JSON.parse(fs.readFileSync(file, 'utf8')), dims);
        } catch {
          cfg = normalizeLightMap(null, dims);
        }
        sendJson(res, 200, cfg);
        return;
      }
      if (method === 'POST') {
        let body: Partial<LightMapConfig>;
        try {
          body = JSON.parse((await readBody(req)) || '{}');
        } catch {
          sendJson(res, 400, { ok: false, error: 'Invalid request' });
          return;
        }
        const cfg = normalizeLightMap(
          {
            version: 1,
            numCannons: Number(body.numCannons) || dims.numCannons,
            gridColumns: Number(body.gridColumns) || dims.gridColumns,
            physicalLights: body.physicalLights,
            updatedAt: new Date().toISOString()
          },
          dims
        );
        fs.mkdirSync(join(file, '..'), { recursive: true });
        fs.writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`);
        sendJson(res, 200, cfg);
        return;
      }
    }

    if (pathname.startsWith('/api/')) {
      sendJson(res, 404, { ok: false, error: 'Not found' });
      return;
    }

    // ── Everything else: the static SPA ─────────────────────────────
    if (method === 'GET' || method === 'HEAD') {
      serveStatic(req, res, pathname);
      return;
    }

    res.writeHead(405);
    res.end();
  };
}

/**
 * Best-effort locate the built UI assets. `WG_UI_DIR` wins; otherwise resolve
 * the installed `@wavegrid/ui` package and use its `dist/`.
 */
export function resolveUiDir(): string | null {
  if (process.env.WG_UI_DIR) return process.env.WG_UI_DIR;
  try {
    const pkg = require.resolve('@wavegrid/ui/package.json');
    return join(pkg, '..', 'dist');
  } catch {
    return null;
  }
}
