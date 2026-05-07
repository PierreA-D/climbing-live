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

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as AuthPayload | null;

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const userId = normalizeId(payload.user);
  const password = typeof payload.password === 'string' ? payload.password : null;
  const pathName = sanitizePathName(payload.path);
  const action = typeof payload.action === 'string' ? payload.action.toLowerCase() : 'publish';
  const ip = typeof payload.ip === 'string' ? payload.ip : null;
  const protocol = typeof payload.protocol === 'string' ? payload.protocol : null;

  const decision = await mutateState((state) => {
    if ((action === 'publish' && !state.settings.enablePublish) || (action === 'read' && !state.settings.enableRead)) {
      return { allowed: false, reason: 'action-disabled' };
    }

    let device = userId ? state.devices[userId] : undefined;

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

    if (state.settings.requireDeviceAuth && password !== null && password !== device.token) {
      return { allowed: false, reason: 'invalid-token', device: toPublicDevice(device, false) };
    }

    if (pathName && device.allowedPaths.length > 0 && !device.allowedPaths.includes(pathName)) {
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
