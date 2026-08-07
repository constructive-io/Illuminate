import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

import {
  projectUsersFile,
  readJsonFile,
  type StorePaths,
  writeFileAtomic
} from './paths';

/**
 * A user's privilege level.
 * - `admin`    — may manage users, roles, sessions and other privileged settings.
 * - `operator` — may use the normal show controls but not administer access.
 */
export type UserRole = 'admin' | 'operator';

export interface StoredUser {
  username: string;
  /** Hex salt. */
  salt: string;
  /** Hex scrypt hash of the password. */
  hash: string;
  /** Privilege level. Missing on legacy records → treated as `admin`. */
  role?: UserRole;
}

/** A user without the password material — safe to hand to callers/renderers. */
export interface UserInfo {
  username: string;
  role: UserRole;
}

const KEYLEN = 64;
const FILE_MODE = 0o600;

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, KEYLEN).toString('hex');
}

/**
 * Legacy user records predate roles. A store that only ever had one operator
 * would otherwise lose all admin ability, so a missing role reads as `admin`.
 */
function roleOf(user: StoredUser): UserRole {
  return user.role === 'operator' ? 'operator' : 'admin';
}

export function readUsers(paths: StorePaths, project: string): StoredUser[] {
  return readJsonFile<StoredUser[]>(projectUsersFile(paths, project)) ?? [];
}

function writeUsers(paths: StorePaths, project: string, users: StoredUser[]): void {
  writeFileAtomic(projectUsersFile(paths, project), JSON.stringify(users, null, 2) + '\n', FILE_MODE);
}

export function listUsernames(paths: StorePaths, project: string): string[] {
  return readUsers(paths, project).map((u) => u.username);
}

/** Users with their roles, password material stripped. */
export function listUsers(paths: StorePaths, project: string): UserInfo[] {
  return readUsers(paths, project).map((u) => ({ username: u.username, role: roleOf(u) }));
}

/** The role for a single user, or null if unknown. */
export function getUserRole(paths: StorePaths, project: string, username: string): UserRole | null {
  const user = readUsers(paths, project).find((u) => u.username === username);
  return user ? roleOf(user) : null;
}

/**
 * Add or replace a user with a freshly salted scrypt hash.
 *
 * The role defaults to `admin` for the very first user in a project (so a fresh
 * install always has someone who can administer it) and `operator` afterwards.
 * An explicit role always wins.
 */
export function addUser(
  paths: StorePaths,
  project: string,
  username: string,
  password: string,
  role?: UserRole
): void {
  if (!username || !password) {
    throw new Error('addUser requires a non-empty username and password.');
  }
  if (username === 'guest') {
    throw new Error('"guest" is reserved for shared guest access; pick another username.');
  }
  const existing = readUsers(paths, project);
  const prior = existing.find((u) => u.username === username);
  const resolvedRole: UserRole =
    role ?? prior?.role ?? (existing.length === 0 ? 'admin' : 'operator');
  const salt = randomBytes(16).toString('hex');
  const user: StoredUser = { username, salt, hash: hashPassword(password, salt), role: resolvedRole };
  const users = existing.filter((u) => u.username !== username);
  users.push(user);
  writeUsers(paths, project, users);
}

/**
 * Change a user's role. Refuses to demote the last remaining admin so a project
 * can never lock itself out of administration. Returns the updated user info.
 */
export function setUserRole(
  paths: StorePaths,
  project: string,
  username: string,
  role: UserRole
): UserInfo {
  const users = readUsers(paths, project);
  const target = users.find((u) => u.username === username);
  if (!target) throw new Error(`No such user: ${username}`);
  if (roleOf(target) === 'admin' && role !== 'admin') {
    const admins = users.filter((u) => roleOf(u) === 'admin');
    if (admins.length <= 1) {
      throw new Error('Cannot demote the last remaining admin.');
    }
  }
  target.role = role;
  writeUsers(paths, project, users);
  return { username, role };
}

/**
 * Remove a user. Returns true if one was removed.
 *
 * Refuses to remove the last admin *while other users still exist* (that would
 * lock the remaining operators out of administration). Removing the very last
 * user is allowed — that simply disables auth for the project.
 */
export function removeUser(paths: StorePaths, project: string, username: string): boolean {
  const users = readUsers(paths, project);
  const target = users.find((u) => u.username === username);
  if (!target) return false;
  if (roleOf(target) === 'admin' && users.length > 1) {
    const admins = users.filter((u) => roleOf(u) === 'admin');
    if (admins.length <= 1) {
      throw new Error('Cannot remove the last remaining admin while other users exist.');
    }
  }
  const next = users.filter((u) => u.username !== username);
  writeUsers(paths, project, next);
  return true;
}

/** Constant-time credential check. */
export function verifyUser(paths: StorePaths, project: string, username: string, password: string): boolean {
  return authenticate(paths, project, username, password) !== null;
}

/**
 * Constant-time credential check that returns the authenticated user's info
 * (username + role) on success, or null on failure.
 */
export function authenticate(
  paths: StorePaths,
  project: string,
  username: string,
  password: string
): UserInfo | null {
  const user = readUsers(paths, project).find((u) => u.username === username);
  if (!user) return null;
  const expected = Buffer.from(user.hash, 'hex');
  const actual = Buffer.from(hashPassword(password, user.salt), 'hex');
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;
  return { username: user.username, role: roleOf(user) };
}
