import { sanitizePathName } from '@/lib/backend/store';

export type MediaMtxPathStatus = {
  name: string;
  rawName: string;
  ready: boolean;
  source: string | null;
  readersCount: number;
};

type DeviceStreamBinding = {
  id: string;
  allowedPaths: string[];
  status: 'online' | 'offline';
  lastSeenAt: string | null;
  lastProtocol: string | null;
  currentPath: string | null;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as UnknownRecord;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return null;
}

function getReadyFlag(record: UnknownRecord): boolean {
  return asBoolean(record.ready) || asBoolean(record.sourceReady) || asBoolean(record.hasSource);
}

function getSourceValue(record: UnknownRecord): string | null {
  return firstString(record.source, record.sourceType, record.sourceId);
}

function getReadersCount(record: UnknownRecord): number {
  if (Array.isArray(record.readers)) {
    return record.readers.length;
  }

  return Math.max(asNumber(record.readersCount), asNumber(record.numReaders));
}

function getApiBaseUrlCandidates(apiBaseUrl: string): string[] {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return [];
  }

  const candidates = new Set<string>([trimmed]);

  try {
    const url = new URL(trimmed);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      url.hostname = 'mediamtx';
      candidates.add(url.toString().replace(/\/+$/, ''));

      url.hostname = 'host.docker.internal';
      candidates.add(url.toString().replace(/\/+$/, ''));
    }
  } catch {
    return Array.from(candidates);
  }

  return Array.from(candidates);
}

export function isMediaMtxPathLive(path: MediaMtxPathStatus): boolean {
  return path.ready || path.readersCount > 0 || path.source !== null;
}

export function findLivePathForDevice(
  device: Pick<DeviceStreamBinding, 'id' | 'allowedPaths'>,
  paths: MediaMtxPathStatus[]
): string | null {
  const livePaths = paths.filter(isMediaMtxPathLive);
  const match = livePaths.find(
    (path) => path.name === device.id || device.allowedPaths.includes(path.name)
  );

  return match?.name ?? null;
}

export function withLiveDeviceState<T extends DeviceStreamBinding>(
  device: T,
  paths: MediaMtxPathStatus[]
): T {
  const livePath = findLivePathForDevice(device, paths);
  if (!livePath) {
    return device;
  }

  return {
    ...device,
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    lastProtocol: device.lastProtocol ?? 'rtmp',
    currentPath: livePath,
  };
}

export async function listMediaMtxPaths(apiBaseUrl: string): Promise<MediaMtxPathStatus[]> {
  let lastError: Error | null = null;

  for (const candidate of getApiBaseUrlCandidates(apiBaseUrl)) {
    try {
      const response = await fetch(`${candidate}/v3/paths/list`, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`MediaMTX API unavailable (${response.status})`);
      }

      const payload = (await response.json()) as UnknownRecord;
      const items = Array.isArray(payload.items) ? payload.items : [];

      return items
        .map((item) => {
          const record = asRecord(item);
          if (!record) {
            return null;
          }

          const rawName = asString(record.name);
          const name = sanitizePathName(rawName);
          if (!rawName || !name) {
            return null;
          }

          return {
            name,
            rawName,
            ready: getReadyFlag(record),
            source: getSourceValue(record),
            readersCount: getReadersCount(record),
          } satisfies MediaMtxPathStatus;
        })
        .filter((item): item is MediaMtxPathStatus => item !== null);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('MediaMTX API unavailable');
    }
  }

  throw lastError ?? new Error('MediaMTX API unavailable');
}