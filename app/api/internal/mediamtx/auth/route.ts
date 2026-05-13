import { NextResponse } from 'next/server';

import {
  createDevice,
  isDeviceOnline,
  mutateState,
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
    allowedPaths.some((allowedPath) => candidate === allowedPath || candidate === `${allowedPath}/${token}`)
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

  const decision = await mutateState((state) => {
    if ((action === 'publish' && !state.settings.enablePublish) || (action === 'read' && !state.settings.enableRead)) {
      return { allowed: false, reason: 'action-disabled' };
    }

    let device = userId ? state.devices[userId] : undefined;
    let resolvedByStreamKey = false;

    if (!device && userCandidates.length > 0) {
      const matches = Object.values(state.devices).filter((entry) =>
        userCandidates.some((candidate) => entry.allowedPaths.includes(candidate))
      );

      if (matches.length === 1) {
        device = matches[0];
        resolvedByStreamKey = true;
      }
    }

    if (!device && pathCandidates.length > 0) {
      const matches = Object.values(state.devices).filter((entry) =>
        pathCandidates.some((candidate) => entry.id === candidate) ||
        matchesDevicePath(pathCandidates, entry.allowedPaths, entry.token)
      );

      if (matches.length === 1) {
        device = matches[0];
        resolvedByStreamKey = true;
      }
    }

    if (!device && password !== null) {
      const matches = Object.values(state.devices).filter((entry) => entry.token === password);

      if (matches.length === 1) {
        device = matches[0];
      }
    }

    if (!device && userId && state.settings.autoRegisterUnknownDevices) {
      device = createDevice({
        id: userId,
        name: userId,
        token: password ?? undefined,
        authorized: state.settings.autoAuthorizeNewDevices,
      });
      state.devices[userId] = device;
    }

    if (!device) {
      const allowedUnknown = state.settings.allowUnknownDevices && !state.settings.requireDeviceAuth;
      return {
        allowed: allowedUnknown,
        reason: allowedUnknown ? 'allowed-unknown' : 'unknown-device',
      };
    }

    if (device.blocked) {
      return { allowed: false, reason: 'device-blocked', device: toPublicDevice(device, false) };
    }

    if (state.settings.requireDeviceAuth && !device.authorized) {
      return { allowed: false, reason: 'device-not-authorized', device: toPublicDevice(device, false) };
    }

    if (state.settings.requireDeviceAuth && !resolvedByStreamKey && password !== null && password !== device.token) {
      return { allowed: false, reason: 'invalid-token', device: toPublicDevice(device, false) };
    }

    if (pathCandidates.length > 0 && !matchesDevicePath(pathCandidates, device.allowedPaths, device.token)) {
      return { allowed: false, reason: 'path-not-allowed', device: toPublicDevice(device, false) };
    }

    const connectedCount = Object.values(state.devices).filter((entry) =>
      isDeviceOnline(entry, state.settings.deviceOfflineAfterMs)
    ).length;

    if (!isDeviceOnline(device, state.settings.deviceOfflineAfterMs) && connectedCount >= state.settings.maxConnectedDevices) {
      return { allowed: false, reason: 'max-connected-reached', device: toPublicDevice(device, false) };
    }

    const updated = touchDevice({
      ...device,
      status: 'online',
      lastSeenAt: nowIso(),
      lastIp: ip,
      lastProtocol: protocol,
      currentPath: pathName,
    });

    state.devices[updated.id] = updated;

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
