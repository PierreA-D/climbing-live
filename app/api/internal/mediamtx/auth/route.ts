import { NextResponse } from 'next/server';

import { listApiCameraDevices } from '@/lib/backend/camera-api';
import {
  createDevice,
  isDeviceOnline,
  mutateState,
  readState,
  sanitizePathName,
  toPublicDevice,
  touchDevice,
} from '@/lib/backend/store';

export const runtime = 'nodejs';

type AuthPayload = {
  user?: string;
  password?: string;
  action?: string;
  path?: string;
  ip?: string;
  protocol?: string;
};

const nowIso = () => new Date().toISOString();

type AuthDevice = {
  id: string;
  name: string;
  token: string | null;
  authorized: boolean;
  blocked: boolean;
  allowedPaths: string[];
  status: 'online' | 'offline';
  lastSeenAt: string | null;
  lastProtocol: string | null;
  currentPath: string | null;
  lastIp?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  source: 'local' | 'camera-api';
};

function normalizeId(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim().toLowerCase();
}

function getPathCandidates(rawPath: string | null | undefined): string[] {
  const sanitized = sanitizePathName(rawPath);
  if (!sanitized) {
    return [];
  }

  const candidates = new Set<string>([sanitized]);
  const parts = sanitized.split('/').filter(Boolean);

  for (let index = 1; index < parts.length; index += 1) {
    candidates.add(parts.slice(index).join('/'));
  }

  return Array.from(candidates);
}

function matchesDevicePath(pathCandidates: string[], allowedPaths: string[], token: string): boolean {
  if (allowedPaths.length === 0) {
    return true;
  }

  return pathCandidates.some((candidate) =>
    allowedPaths.some((allowedPath) => {
      const publishPath = token ? `${allowedPath}/${token}` : allowedPath;

      return (
        candidate === allowedPath ||
        candidate === publishPath ||
        candidate.startsWith(`${allowedPath}/`) ||
        candidate.startsWith(`${publishPath}/`)
      );
    })
  );
}

async function readAuthPayload(request: Request): Promise<AuthPayload | null> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await request.json().catch(() => null)) as AuthPayload | null;
  }

  const url = new URL(request.url);
  const payload: AuthPayload = {
    user: url.searchParams.get('user') ?? undefined,
    password: url.searchParams.get('password') ?? undefined,
    action: url.searchParams.get('action') ?? undefined,
    path: url.searchParams.get('path') ?? undefined,
    ip: url.searchParams.get('ip') ?? undefined,
    protocol: url.searchParams.get('protocol') ?? undefined,
  };

  if (!payload.user && !payload.password && !payload.action && !payload.path && !payload.ip && !payload.protocol) {
    return null;
  }

  return payload;
}

async function handleAuth(request: Request) {
  const payload = await readAuthPayload(request);

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const userId = normalizeId(payload.user);
  const password = typeof payload.password === 'string' ? payload.password : null;
  const pathName = sanitizePathName(payload.path);
  const pathCandidates = getPathCandidates(payload.path);
  const userCandidates = userId ? [userId] : [];
  const action = typeof payload.action === 'string' ? payload.action.toLowerCase() : 'publish';
  const ip = typeof payload.ip === 'string' ? payload.ip : null;
  const protocol = typeof payload.protocol === 'string' ? payload.protocol : null;
  const state = await readState();
  const apiCameras = await listApiCameraDevices();

  if ((action === 'publish' && !state.settings.enablePublish) || (action === 'read' && !state.settings.enableRead)) {
    return NextResponse.json({ allowed: false, reason: 'action-disabled' }, { status: 401 });
  }

  const allDevices: AuthDevice[] = [
    ...Object.values(state.devices).map((device) => ({ ...device, source: 'local' as const })),
    ...apiCameras.map((device) => ({
      ...device,
      status: 'offline' as const,
      lastSeenAt: null,
      lastProtocol: null,
      currentPath: null,
      source: 'camera-api' as const,
    })),
  ];

  let device = userId ? allDevices.find((entry) => entry.id === userId) : undefined;
  let resolvedByStreamKey = false;

  if (!device && userCandidates.length > 0) {
    const matches = allDevices.filter((entry) => userCandidates.some((candidate) => entry.allowedPaths.includes(candidate)));

    if (matches.length === 1) {
      device = matches[0];
      resolvedByStreamKey = true;
    }
  }

  if (!device && pathCandidates.length > 0) {
    const matches = allDevices.filter((entry) =>
      pathCandidates.some((candidate) => entry.id === candidate) ||
      matchesDevicePath(pathCandidates, entry.allowedPaths, entry.token ?? '')
    );

    if (matches.length === 1) {
      device = matches[0];
      resolvedByStreamKey = true;
    }
  }

  if (!device && password !== null) {
    const matches = allDevices.filter((entry) => entry.token === password);

    if (matches.length === 1) {
      device = matches[0];
    }
  }

  if (!device && userId && state.settings.autoRegisterUnknownDevices) {
    const created = await mutateState((mutableState) => {
      const nextDevice = createDevice({
        id: userId,
        name: userId,
        token: password ?? undefined,
        authorized: mutableState.settings.autoAuthorizeNewDevices,
      });
      mutableState.devices[userId] = nextDevice;
      return nextDevice;
    });

    device = {
      ...created,
      source: 'local',
    };
  }

  if (!device) {
    const allowedUnknown = state.settings.allowUnknownDevices && !state.settings.requireDeviceAuth;
    return NextResponse.json(
      {
        allowed: allowedUnknown,
        reason: allowedUnknown ? 'allowed-unknown' : 'unknown-device',
      },
      { status: allowedUnknown ? 200 : 401 }
    );
  }

  if (device.blocked) {
    return NextResponse.json({ allowed: false, reason: 'device-blocked', device }, { status: 401 });
  }

  if (state.settings.requireDeviceAuth && !device.authorized) {
    return NextResponse.json({ allowed: false, reason: 'device-not-authorized', device }, { status: 401 });
  }

  if (state.settings.requireDeviceAuth && !resolvedByStreamKey && password !== null && password !== device.token) {
    return NextResponse.json({ allowed: false, reason: 'invalid-token', device }, { status: 401 });
  }

  if (pathCandidates.length > 0 && !matchesDevicePath(pathCandidates, device.allowedPaths, device.token ?? '')) {
    return NextResponse.json({ allowed: false, reason: 'path-not-allowed', device }, { status: 401 });
  }

  const connectedCount = Object.values(state.devices).filter((entry) =>
    isDeviceOnline(entry, state.settings.deviceOfflineAfterMs)
  ).length;

  const alreadyConnected = device.source === 'local'
    ? isDeviceOnline(device, state.settings.deviceOfflineAfterMs)
    : false;

  if (!alreadyConnected && connectedCount >= state.settings.maxConnectedDevices) {
    return NextResponse.json({ allowed: false, reason: 'max-connected-reached', device }, { status: 401 });
  }

  if (device.source !== 'local') {
    return NextResponse.json({
      allowed: true,
      reason: 'ok',
      device: {
        ...device,
        status: 'online',
        lastSeenAt: nowIso(),
        lastProtocol: protocol,
        currentPath: pathName,
      },
    });
  }

  const decision = await mutateState((mutableState) => {
    const current = mutableState.devices[device.id];
    if (!current) {
      return { allowed: false, reason: 'unknown-device' };
    }

    const updated = touchDevice({
      ...current,
      status: 'online',
      lastSeenAt: nowIso(),
      lastIp: ip,
      lastProtocol: protocol,
      currentPath: pathName,
    });

    mutableState.devices[updated.id] = updated;

    return {
      allowed: true,
      reason: 'ok',
      device: toPublicDevice(updated, false),
    };
  });

  if (!decision.allowed) {
    return NextResponse.json(decision, { status: 401 });
  }

  return NextResponse.json(decision);
}

export async function GET(request: Request) {
  return handleAuth(request);
}

export async function POST(request: Request) {
  return handleAuth(request);
}
