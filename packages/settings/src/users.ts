import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

import {
  projectUsersFile,
  readJsonFile,
  type StorePaths,
  writeFileAtomic
} from './paths';

export interface StoredUser {
  username: string;
  /** Hex salt. */
  salt: string;
  /** Hex scrypt hash of the password. */
  hash: string;
}

const KEYLEN = 64;
const FILE_MODE = 0o600;

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, KEYLEN).toString('hex');
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

/** Add or replace a user with a freshly salted scrypt hash. */
export function addUser(paths: StorePaths, project: string, username: string, password: string): void {
  if (!username || !password) {
    throw new Error('addUser requires a non-empty username and password.');
  }
  const salt = randomBytes(16).toString('hex');
  const user: StoredUser = { username, salt, hash: hashPassword(password, salt) };
  const users = readUsers(paths, project).filter((u) => u.username !== username);
  users.push(user);
  writeUsers(paths, project, users);
}

/** Remove a user. Returns true if one was removed. */
export function removeUser(paths: StorePaths, project: string, username: string): boolean {
  const users = readUsers(paths, project);
  const next = users.filter((u) => u.username !== username);
  if (next.length === users.length) return false;
  writeUsers(paths, project, next);
  return true;
}

/** Constant-time credential check. */
export function verifyUser(paths: StorePaths, project: string, username: string, password: string): boolean {
  const user = readUsers(paths, project).find((u) => u.username === username);
  if (!user) return false;
  const expected = Buffer.from(user.hash, 'hex');
  const actual = Buffer.from(hashPassword(password, user.salt), 'hex');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
