// PM2 process definitions for the WaveGrid dev servers.
//
//   pm2 start deploy/ecosystem.config.js   # start sim + ui, keep them alive
//   pm2 logs                               # tail both
//   pm2 restart deploy/ecosystem.config.js # pick up code or .env changes
//   pm2 save                               # persist (see deploy/pm2.sh setup)
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

// Derive URLs/ports from CLOUD_IP so the IP is the single source of truth.
const SIM_PORT = fileEnv.SIM_PORT || '3000';
if (!fileEnv.PORT) fileEnv.PORT = SIM_PORT; // simulator bind port
if (!fileEnv.NEXT_PUBLIC_SIMULATOR_URL && fileEnv.CLOUD_IP) {
  fileEnv.NEXT_PUBLIC_SIMULATOR_URL = `ws://${fileEnv.CLOUD_IP}:${SIM_PORT}`;
}

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
    // Simulator still runs via ts-node — no dev/prod distinction, no overlay.
    { ...common, name: 'wavegrid-sim', args: 'dev:sim' },
    // UI runs the PRODUCTION server (next start). Requires `pnpm build:ui`
    // first — use `deploy/cloud.sh deploy` which builds then restarts.
    { ...common, name: 'wavegrid-ui', args: 'start:ui' },
  ],
};
