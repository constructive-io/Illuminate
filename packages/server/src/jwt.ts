import { createHmac } from 'crypto';

function getSecret(): string {
  const secret = process.env.WG_JWT_SECRET;
  if (!secret) throw new Error('WG_JWT_SECRET env var is not set');
  return secret;
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
}

export function signJwt(sub: string): string {
  const secret = getSecret();
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = base64url(Buffer.from(JSON.stringify({ sub, iat: Math.floor(Date.now() / 1000) })));
  const data = `${header}.${payload}`;
  const sig = base64url(createHmac('sha256', secret).update(data).digest());
  return `${data}.${sig}`;
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
    return payload;
  } catch {
    return null;
  }
}
