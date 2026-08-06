import { projectDevicesFile, readJsonFile, type StorePaths, writeFileAtomic } from './paths';

/**
 * A device that has joined a project. This is the PROJECT-scoped registry —
 * distinct from the machine-local `DeviceIdentity` in device.ts. The `id` is
 * the joining machine's device id; `name` is a project-specific friendly name
 * (defaults to the announced device/hostname, renameable per project).
 *
 * Network address + lastSeen are runtime facts that follow the live machine;
 * they are refreshed on every self-registration and are NOT part of a portable
 * project export.
 */
export interface DeviceRecord {
  id: string;
  name: string;
  hostname?: string;
  /** Last-known IP:port the device connected from (runtime, machine-local). */
  address?: string;
  /** Epoch ms of the last self-registration. */
  lastSeen?: number;
  layout?: string;
  mode?: 'simple' | 'distributed';
  shard?: { start: number; end: number } | null;
}

/** Fields a device announces about itself when it registers. */
export interface DeviceRegistration {
  id: string;
  name?: string;
  hostname?: string;
  address?: string;
  layout?: string;
  mode?: 'simple' | 'distributed';
  shard?: { start: number; end: number } | null;
}

interface DevicesFile {
  version: 1;
  devices: DeviceRecord[];
}

function read(paths: StorePaths, project: string): DevicesFile {
  return readJsonFile<DevicesFile>(projectDevicesFile(paths, project)) ?? { version: 1, devices: [] };
}

function write(paths: StorePaths, project: string, file: DevicesFile): void {
  writeFileAtomic(projectDevicesFile(paths, project), JSON.stringify(file, null, 2) + '\n');
}

export function listDevices(paths: StorePaths, project: string): DeviceRecord[] {
  return read(paths, project).devices.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function getDeviceRecord(paths: StorePaths, project: string, id: string): DeviceRecord | null {
  return read(paths, project).devices.find(d => d.id === id) ?? null;
}

/**
 * Upsert a device into the project registry from a self-registration. An
 * existing device keeps its (possibly operator-assigned) name; runtime facts
 * (address, lastSeen, layout, mode, shard) are always refreshed. A new device
 * defaults its name to the announced name / hostname / a short id.
 */
export function registerDevice(paths: StorePaths, project: string, reg: DeviceRegistration): DeviceRecord {
  if (!reg.id) throw new Error('Device registration requires an id.');
  const file = read(paths, project);
  const existing = file.devices.find(d => d.id === reg.id);
  const now = Date.now();
  if (existing) {
    existing.hostname = reg.hostname ?? existing.hostname;
    existing.address = reg.address ?? existing.address;
    existing.lastSeen = now;
    existing.layout = reg.layout ?? existing.layout;
    existing.mode = reg.mode ?? existing.mode;
    if (reg.shard !== undefined) existing.shard = reg.shard;
    write(paths, project, file);
    return existing;
  }
  const record: DeviceRecord = {
    id: reg.id,
    name: (reg.name || reg.hostname || `device-${reg.id.slice(0, 8)}`).trim().slice(0, 64),
    hostname: reg.hostname,
    address: reg.address,
    lastSeen: now,
    layout: reg.layout,
    mode: reg.mode,
    shard: reg.shard ?? null
  };
  file.devices.push(record);
  write(paths, project, file);
  return record;
}

/** Rename a device by id or by its current name. Returns the updated record, or null if not found. */
export function renameDevice(paths: StorePaths, project: string, idOrName: string, newName: string): DeviceRecord | null {
  const clean = newName.trim().slice(0, 64);
  if (!clean) throw new Error('Device name cannot be empty.');
  const file = read(paths, project);
  const device = file.devices.find(d => d.id === idOrName) ?? file.devices.find(d => d.name === idOrName);
  if (!device) return null;
  device.name = clean;
  write(paths, project, file);
  return device;
}

/** Remove a device by id or name. Returns true if one was removed. */
export function removeDevice(paths: StorePaths, project: string, idOrName: string): boolean {
  const file = read(paths, project);
  const before = file.devices.length;
  file.devices = file.devices.filter(d => d.id !== idOrName && d.name !== idOrName);
  if (file.devices.length === before) return false;
  write(paths, project, file);
  return true;
}
