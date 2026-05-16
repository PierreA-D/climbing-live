import { getBackendApiBase } from '@/app/features/auth/server/backend';
import { sanitizePathName } from '@/lib/backend/store';

type UnknownRecord = Record<string, unknown>;

export type ApiCameraDevice = {
  id: string;
  name: string;
  token: string | null;
  allowedPaths: string[];
  authorized: boolean;
  blocked: false;
  source: 'camera-api';
};

const apiCameraDeviceCache = new Map<string, ApiCameraDevice>();
const API_CAMERA_CACHE_TTL_MS = 30_000;

let apiCameraDeviceCacheUpdatedAt = 0;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as UnknownRecord;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function getPathParts(urlValue: unknown): string[] {
  const raw = asString(urlValue);
  if (!raw) {
    return [];
  }

  try {
    const parsed = new URL(raw);
    return parsed.pathname.split('/').filter(Boolean);
  } catch {
    return [];
  }
}

function getAllowedPath(camera: UnknownRecord): string | null {
  const rtmpParts = getPathParts(camera.rtmpUrl);
  const fromRtmp = sanitizePathName(rtmpParts[0]);
  if (fromRtmp) {
    return fromRtmp;
  }

  const hlsParts = getPathParts(camera.hlsUrl);
  const trimmed = hlsParts.at(-1) === 'index.m3u8' ? hlsParts.slice(0, -1) : hlsParts;
  return sanitizePathName(trimmed[0]);
}

function getStreamToken(camera: UnknownRecord): string | null {
  const hlsParts = getPathParts(camera.hlsUrl);
  const trimmed = hlsParts.at(-1) === 'index.m3u8' ? hlsParts.slice(0, -1) : hlsParts;

  if (trimmed.length <= 1) {
    return null;
  }

  const token = trimmed.slice(1).join('/').trim();
  return token.length > 0 ? token : null;
}

function toApiCameraDevice(camera: unknown): ApiCameraDevice | null {
  const record = asRecord(camera);
  if (!record) {
    return null;
  }

  const rawId = asString(record.id);
  const allowedPath = getAllowedPath(record);

  if (!rawId || !allowedPath) {
    return null;
  }

  const id = rawId.toLowerCase();

  return {
    id,
    name: asString(record.name) ?? rawId,
    token: getStreamToken(record),
    allowedPaths: [allowedPath],
    authorized: asBoolean(record.authorized, true),
    blocked: false,
    source: 'camera-api',
  };
}

function cacheDevices(devices: ApiCameraDevice[]) {
  for (const device of devices) {
    apiCameraDeviceCache.set(device.id, device);
  }

  apiCameraDeviceCacheUpdatedAt = Date.now();
}

export function rememberApiCameraDevice(camera: unknown): ApiCameraDevice | null {
  const device = toApiCameraDevice(camera);
  if (!device) {
    return null;
  }

  apiCameraDeviceCache.set(device.id, device);
  apiCameraDeviceCacheUpdatedAt = Date.now();
  return device;
}

export function listCachedApiCameraDevices(): ApiCameraDevice[] {
  return Array.from(apiCameraDeviceCache.values());
}

function hasFreshApiCameraDeviceCache() {
  return apiCameraDeviceCache.size > 0 && Date.now() - apiCameraDeviceCacheUpdatedAt <= API_CAMERA_CACHE_TTL_MS;
}

function getCameraApiHeaders(): HeadersInit {
  const token = process.env.BACKEND_INTERNAL_TOKEN?.trim() || process.env.BACKEND_API_TOKEN?.trim();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function listApiCameraDevices(): Promise<ApiCameraDevice[]> {
  if (hasFreshApiCameraDeviceCache()) {
    return listCachedApiCameraDevices();
  }

  try {
    const response = await fetch(`${getBackendApiBase()}/cameras`, {
      headers: getCameraApiHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      return listCachedApiCameraDevices();
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      return listCachedApiCameraDevices();
    }

    const devices = payload.map((camera) => toApiCameraDevice(camera)).filter((camera): camera is ApiCameraDevice => camera !== null);
    cacheDevices(devices);
    return devices;
  } catch {
    return listCachedApiCameraDevices();
  }
}