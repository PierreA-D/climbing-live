import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { BackendSettings, BackendState, DeviceRecord } from '@/lib/backend/types';

const DATA_DIR = path.join(process.cwd(), '.data');
const STATE_FILE = path.join(DATA_DIR, 'backend-state.json');

let stateWriteQueue: Promise<void> = Promise.resolve();

const nowIso = () => new Date().toISOString();

export function createDefaultSettings(): BackendSettings {
  return {
    mediamtxApiUrl: process.env.MEDIAMTX_API_URL ?? 'http://localhost:9997',
    hlsBaseUrl: process.env.HLS_BASE_URL ?? 'http://localhost:8888',
    requireDeviceAuth: true,
    allowUnknownDevices: false,
    autoRegisterUnknownDevices: false,
    autoAuthorizeNewDevices: false,
    exposeOnlyAuthorizedPaths: false,
    maxDevices: 200,
    maxConnectedDevices: 20,
    deviceOfflineAfterMs: 45_000,
    pollIntervalMs: 10_000,
    enablePublish: true,
    enableRead: true,
  };
}

function createInitialState(): BackendState {
  const ts = nowIso();
  return {
    settings: createDefaultSettings(),
    devices: {},
    createdAt: ts,
    updatedAt: ts,
  };
}

async function ensureStateFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(STATE_FILE);
  } catch {
    const initialState = createInitialState();
    await fs.writeFile(STATE_FILE, JSON.stringify(initialState, null, 2), 'utf8');
  }
}

function mergeWithDefaults(state: BackendState): BackendState {
  return {
    ...state,
    settings: {
      ...createDefaultSettings(),
      ...(state.settings ?? {}),
    },
    devices: state.devices ?? {},
  };
}

export async function readState(): Promise<BackendState> {
  await ensureStateFile();
  const raw = await fs.readFile(STATE_FILE, 'utf8');
  const parsed = JSON.parse(raw) as BackendState;
  return mergeWithDefaults(parsed);
}

async function writeState(nextState: BackendState): Promise<void> {
  const withTimestamp: BackendState = {
    ...nextState,
    updatedAt: nowIso(),
  };
  await fs.writeFile(STATE_FILE, JSON.stringify(withTimestamp, null, 2), 'utf8');
}

export async function mutateState<T>(mutator: (state: BackendState) => T | Promise<T>): Promise<T> {
  const execute = async () => {
    const current = await readState();
    const result = await mutator(current);
    await writeState(current);
    return result;
  };

  const next = stateWriteQueue.then(execute, execute);
  stateWriteQueue = next.then(
    () => undefined,
    () => undefined
  );

  return next;
}

export function sanitizePathName(rawPath: string | null | undefined): string | null {
  if (!rawPath) {
    return null;
  }

  const withoutQuery = rawPath.split('?')[0];
  const clean = withoutQuery.replace(/^\/+/, '').trim();
  return clean.length > 0 ? clean : null;
}

export function normalizePathList(paths: unknown): string[] {
  if (!Array.isArray(paths)) {
    return [];
  }

  return Array.from(
    new Set(
      paths
        .filter((item): item is string => typeof item === 'string')
        .map((item) => sanitizePathName(item))
        .filter((item): item is string => item !== null)
    )
  );
}

export function createDeviceToken(): string {
  return randomBytes(24).toString('hex');
}

export function createDevice(input: {
  id: string;
  name: string;
  token?: string;
  authorized?: boolean;
  blocked?: boolean;
  allowedPaths?: string[];
  notes?: string;
}): DeviceRecord {
  const ts = nowIso();
  return {
    id: input.id,
    name: input.name,
    token: input.token ?? createDeviceToken(),
    authorized: input.authorized ?? false,
    blocked: input.blocked ?? false,
    allowedPaths: input.allowedPaths ?? [],
    status: 'offline',
    lastSeenAt: null,
    lastIp: null,
    lastProtocol: null,
    currentPath: null,
    createdAt: ts,
    updatedAt: ts,
    notes: input.notes ?? '',
  };
}

export function touchDevice(device: DeviceRecord): DeviceRecord {
  return {
    ...device,
    updatedAt: nowIso(),
  };
}

export function isDeviceOnline(device: DeviceRecord, offlineAfterMs: number): boolean {
  if (device.status !== 'online' || !device.lastSeenAt) {
    return false;
  }

  const lastSeen = Date.parse(device.lastSeenAt);
  if (Number.isNaN(lastSeen)) {
    return false;
  }

  return Date.now() - lastSeen <= offlineAfterMs;
}

export function toPublicDevice(device: DeviceRecord, includeSecret: boolean) {
  return {
    ...device,
    token: includeSecret ? device.token : undefined,
  };
}
