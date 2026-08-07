import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import fs from 'fs';
import path from 'path';

import { projectDir, readJsonFile, type StorePaths, writeFileAtomic } from './paths';
import { type UserInfo } from './users';

/**
 * Shared "guest" access: a single low-privilege passphrase an admin can hand out
 * so casual users can drive the show without their own account. It always maps
 * to the `operator` role — never admin — so sharing it can never grant
 * administration, and the receiver key is unaffected.
 *
 * The passphrase is stored only as a salted scrypt hash (never in plaintext);
 * the cleartext is returned exactly once, when it is minted or rotated, for the
 * admin to copy and share. Forgotten passphrases are rotated, not recovered.
 */

/** The reserved username every guest session logs in as. */
export const GUEST_USERNAME = 'guest';

const KEYLEN = 64;
const FILE_MODE = 0o600;

/** Ambiguous characters (0/O, 1/l/I) are omitted so a shared passphrase is easy
 *  to read aloud and type. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

interface StoredGuest {
  enabled: boolean;
  salt: string;
  hash: string;
  updatedAt: number;
}

/** Guest-access status safe to hand to callers/renderers — no passphrase material. */
export interface GuestStatus {
  /** True when a passphrase has been minted (whether or not it is enabled). */
  configured: boolean;
  /** True when guest logins are currently accepted. */
  enabled: boolean;
  /** When the passphrase was last minted/rotated (epoch ms), or null. */
  updatedAt: number | null;
}

function guestFile(paths: StorePaths, project: string): string {
  return path.join(projectDir(paths, project), 'guest.json');
}

function readGuest(paths: StorePaths, project: string): StoredGuest | null {
  return readJsonFile<StoredGuest>(guestFile(paths, project));
}

function writeGuest(paths: StorePaths, project: string, guest: StoredGuest): void {
  writeFileAtomic(guestFile(paths, project), JSON.stringify(guest, null, 2) + '\n', FILE_MODE);
}

function hashPassphrase(passphrase: string, salt: string): string {
  return scryptSync(passphrase, salt, KEYLEN).toString('hex');
}

/** A readable, dependency-free passphrase, e.g. `njkr-8p2q-wxst`. */
function generatePassphrase(): string {
  const groups = 3;
  const per = 4;
  const bytes = randomBytes(groups * per);
  const chars: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    chars.push(ALPHABET[bytes[i] % ALPHABET.length]);
  }
  const out: string[] = [];
  for (let g = 0; g < groups; g++) out.push(chars.slice(g * per, g * per + per).join(''));
  return out.join('-');
}

export function guestStatus(paths: StorePaths, project: string): GuestStatus {
  const guest = readGuest(paths, project);
  return {
    configured: guest != null,
    enabled: guest?.enabled === true,
    updatedAt: guest?.updatedAt ?? null
  };
}

/**
 * Mint a brand-new shared passphrase (enabling guest access) and return its
 * cleartext once. Only the hash is persisted. Rotating invalidates the previous
 * passphrase, so anyone using the old one is locked out on their next refresh.
 */
export function rotateGuestPassphrase(paths: StorePaths, project: string): string {
  const passphrase = generatePassphrase();
  const salt = randomBytes(16).toString('hex');
  writeGuest(paths, project, {
    enabled: true,
    salt,
    hash: hashPassphrase(passphrase, salt),
    updatedAt: Date.now()
  });
  return passphrase;
}

/**
 * Enable or disable guest logins without changing the passphrase. Enabling
 * requires a passphrase to already have been minted; call
 * `rotateGuestPassphrase` first otherwise.
 */
export function setGuestEnabled(paths: StorePaths, project: string, enabled: boolean): GuestStatus {
  const guest = readGuest(paths, project);
  if (!guest) {
    if (enabled) throw new Error('Mint a guest passphrase before enabling guest access.');
    return guestStatus(paths, project);
  }
  guest.enabled = enabled;
  writeGuest(paths, project, guest);
  return guestStatus(paths, project);
}

/** Remove guest access entirely (deletes the passphrase). */
export function clearGuest(paths: StorePaths, project: string): void {
  try {
    fs.rmSync(guestFile(paths, project));
  } catch {
    /* already absent */
  }
}

/**
 * Constant-time check of a candidate guest passphrase. Returns the guest
 * operator identity on success, or null when guest access is off or the
 * passphrase does not match.
 */
export function authenticateGuest(
  paths: StorePaths,
  project: string,
  passphrase: string
): UserInfo | null {
  const guest = readGuest(paths, project);
  if (!guest || !guest.enabled) return null;
  const expected = Buffer.from(guest.hash, 'hex');
  const actual = Buffer.from(hashPassphrase(passphrase, guest.salt), 'hex');
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;
  return { username: GUEST_USERNAME, role: 'operator' };
}
