import { createHmac, randomBytes } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const STATE_DIR = resolve(process.cwd(), '.state');
const SECRET_FILE = resolve(STATE_DIR, 'jwt-secret');

function getSecret(): string {
  const env = process.env.WG_JWT_SECRET;
  if (env) return env;
  try {
    return readFileSync(SECRET_FILE, 'utf8').trim();
  } catch {
    const secret = randomBytes(32).toString('hex');
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
    return secret;
  }
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

export interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const secret = getSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const data = `${parts[0]}.${parts[1]}`;
    const expectedSig = base64url(createHmac('sha256', secret).update(data).digest());
    if (expectedSig !== parts[2]) return null;
    const payload: JwtPayload = JSON.parse(base64urlDecode(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
