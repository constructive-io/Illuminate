// PM2 process definitions for the WaveGrid servers.
//
//   pm2 start deploy/ecosystem.config.js   # start the server(s), keep them alive
//   pm2 logs                               # tail them
//   pm2 restart deploy/ecosystem.config.js # pick up code or .env changes
//   pm2 save                               # persist (see deploy/pm2.sh setup)
//
// Each server now serves the UI + API + WebSocket on ONE port (one origin) —
// there is no separate Next UI process. For fresh installs prefer the CLI
// (`wavegrid server`); this PM2 stack remains for the existing cloud show.
//
// Reads deploy/.env (gitignored) so the server IP stays out of git.

const fs = require('fs');
const path = require('path');

// Repo root is one level up from deploy/ (override with ILLUMINATE_DIR).
const ILLUMINATE_DIR = process.env.ILLUMINATE_DIR
  ? path.resolve(process.env.ILLUMINATE_DIR)
  : path.resolve(__dirname, '..');

// Parse a KEY=VALUE env file into a plain object.
function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

// Prefer real .env, fall back to the committed example.
const envFile = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : path.join(__dirname, '.env.example');
const fileEnv = loadEnv(envFile);

// Server bind port. The UI + WS are same-origin now, so this is the only port.
const SIM_PORT = fileEnv.SIM_PORT || '3000';

// Pride instance settings (7×2 layout, its own server on its own port).
const PRIDE_LAYOUT = fileEnv.PRIDE_LAYOUT || 'grid-7x2';
const PRIDE_SIM_PORT = fileEnv.PRIDE_SIM_PORT || '3001';

// Resolve pnpm/node portably: the node running this config lives next to the
// matching pnpm. The PM2 daemon may not share the user's PATH, so pin both.
const NODE_BIN = path.dirname(process.execPath);
const candidatePnpm = path.join(NODE_BIN, 'pnpm');
const PNPM =
  process.env.PNPM_PATH ||
  (fs.existsSync(candidatePnpm) ? candidatePnpm : 'pnpm');

const baseEnv = {
  ...fileEnv,
  PATH: `${NODE_BIN}:${process.env.PATH || ''}`,
};

const common = {
  cwd: ILLUMINATE_DIR,
  script: PNPM,
  interpreter: 'none', // pnpm is its own executable; don't wrap it in node
  autorestart: true,
  max_restarts: 50,
  restart_delay: 2000,
  time: true,
  env: baseEnv,
};

module.exports = {
  apps: [
    // ── Main show (7×7, 49 cannons) — serves UI + API + WS on WAVEGRID_PORT ──
    {
      ...common,
      name: 'wavegrid-server',
      args: 'dev:server',
      env: { ...baseEnv, WAVEGRID_PORT: SIM_PORT },
    },

    // ── Pride show (7×2, 14 cannons) — its own server/origin ─────────────────
    {
      ...common,
      name: 'wavegrid-server-pride',
      args: 'dev:server',
      env: {
        ...baseEnv,
        WAVEGRID_PORT: PRIDE_SIM_PORT,
        WAVEGRID_LAYOUT: PRIDE_LAYOUT,
      },
    },
  ],
};
