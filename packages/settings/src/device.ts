import { randomUUID } from 'crypto';
import os from 'os';

import { readJsonFile, type StorePaths, writeFileAtomic } from './paths';

/**
 * Machine-local device identity. Generated once per machine and stored at
 * `~/.wavegrid/config/device.json`. It is deliberately global (not per-project)
 * and is NEVER included in a project export — a machine that imports a project
 * keeps its own identity and self-registers with its own id/IP, so two laptops
 * can never collide on identity just because they share a project.
 */
export interface DeviceIdentity {
  /** Stable random id, generated once, opaque. */
  id: string;
  /** Friendly, user-editable name. Defaults to the hostname. */
  name: string;
  createdAt: string;
}

function sanitizeName(name: string): string {
  return name.trim().slice(0, 64);
}

/** Read the device identity, creating (and persisting) one on first access. */
export function getDevice(paths: StorePaths): DeviceIdentity {
  const existing = readJsonFile<Partial<DeviceIdentity>>(paths.deviceFile);
  if (existing && typeof existing.id === 'string' && existing.id.length > 0) {
    return {
      id: existing.id,
      name: sanitizeName(existing.name || os.hostname()) || os.hostname(),
      createdAt: existing.createdAt || new Date().toISOString()
    };
  }
  const device: DeviceIdentity = {
    id: randomUUID(),
    name: sanitizeName(os.hostname()) || 'device',
    createdAt: new Date().toISOString()
  };
  writeFileAtomic(paths.deviceFile, JSON.stringify(device, null, 2) + '\n', 0o600);
  return device;
}

/** Rename this device (persists). Returns the updated identity. */
export function setDeviceName(paths: StorePaths, name: string): DeviceIdentity {
  const clean = sanitizeName(name);
  if (!clean) throw new Error('Device name cannot be empty.');
  const device = getDevice(paths);
  const updated: DeviceIdentity = { ...device, name: clean };
  writeFileAtomic(paths.deviceFile, JSON.stringify(updated, null, 2) + '\n', 0o600);
  return updated;
}
