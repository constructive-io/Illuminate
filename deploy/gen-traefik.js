#!/usr/bin/env node
/**
 * Generates deploy/traefik/dynamic.toml from deploy/.env using toml-ast.
 *
 * Usage:
 *   node deploy/gen-traefik.js
 *
 * Reads: MAIN_DOMAIN, PRIDE_DOMAIN, LETSENCRYPT_EMAIL,
 *        SIM_PORT (default 3000), PRIDE_SIM_PORT (default 3001)
 *
 * The UI + API + WebSocket are same-origin on the server port, so each domain
 * routes entirely to one backend port — no separate UI port.
 */

const fs = require('fs');
const path = require('path');
const { deparse } = require('toml-ast');

// ── Load deploy/.env ──────────────────────────────────────────────────────────

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

const envPath = path.resolve(__dirname, '.env');
const env = fs.existsSync(envPath)
  ? loadEnv(envPath)
  : loadEnv(path.resolve(__dirname, '.env.example'));

const MAIN_DOMAIN = env.MAIN_DOMAIN;
const PRIDE_DOMAIN = env.PRIDE_DOMAIN;
const LETSENCRYPT_EMAIL = env.LETSENCRYPT_EMAIL;
const SIM_PORT = env.SIM_PORT || '3000';
const PRIDE_SIM_PORT = env.PRIDE_SIM_PORT || '3001';

// ── Build AST ─────────────────────────────────────────────────────────────────

function kp(value) {
  return { type: 'KeyPart', value, style: 'bare' };
}

function key(parts) {
  return { type: 'Key', parts: parts.map(kp) };
}

function str(value) {
  return { type: 'StringValue', value, style: 'basic' };
}

function int(value) {
  return { type: 'IntegerValue', value, raw: String(value) };
}

function kv(k, v) {
  return { type: 'KeyValue', key: key([k]), value: v };
}

function table(parts, body) {
  return { type: 'Table', key: key(parts), body };
}

const body = [];

function addDeployment(name, domain, port) {
  // One router per domain → the server (UI + API + same-origin WebSocket).
  body.push(
    table(['http', 'routers', name], [
      kv('rule', str(`Host(\`${domain}\`)`)),
      kv('service', str(name)),
      kv('entryPoints', { type: 'ArrayValue', elements: [str('websecure')] }),
      kv('priority', int(1)),
    ])
  );
  body.push(
    table(['http', 'routers', name, 'tls'], [
      kv('certResolver', str('letsencrypt')),
    ])
  );

  // Service: the server (Traefik proxies WebSocket upgrades on the same route).
  body.push({
    type: 'ArrayOfTables',
    key: key(['http', 'services', name, 'loadBalancer', 'servers']),
    body: [kv('url', str(`http://127.0.0.1:${port}`))],
  });
}

if (MAIN_DOMAIN) {
  addDeployment('main', MAIN_DOMAIN, SIM_PORT);
}

if (PRIDE_DOMAIN) {
  addDeployment('pride', PRIDE_DOMAIN, PRIDE_SIM_PORT);
}

if (body.length === 0) {
  console.log(
    'No MAIN_DOMAIN or PRIDE_DOMAIN set in deploy/.env — skipping dynamic.toml generation.'
  );
  process.exit(0);
}

const doc = { type: 'TomlDocument', body };
const toml = deparse(doc);

// ── Write output ──────────────────────────────────────────────────────────────

const outPath = path.resolve(__dirname, 'traefik', 'dynamic.toml');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, toml, 'utf8');
console.log(`Generated ${outPath}`);

// Also patch traefik.yml with the real LETSENCRYPT_EMAIL if provided.
if (LETSENCRYPT_EMAIL) {
  const traefikYml = path.resolve(__dirname, 'traefik', 'traefik.yml');
  if (fs.existsSync(traefikYml)) {
    let content = fs.readFileSync(traefikYml, 'utf8');
    content = content.replace(
      /email:\s*"[^"]*"/,
      `email: "${LETSENCRYPT_EMAIL}"`
    );
    fs.writeFileSync(traefikYml, content, 'utf8');
    console.log(`Updated ACME email in ${traefikYml}`);
  }
}
