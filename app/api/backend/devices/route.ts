import { NextResponse } from 'next/server';

import { listMediaMtxPaths, withLiveDeviceState } from '@/lib/backend/mediamtx';
import {
  createDevice,
  createDeviceToken,
  mutateState,
  normalizePathList,
  readState,
  toPublicDevice,
} from '@/lib/backend/store';

export const runtime = 'nodejs';

type DeviceCreatePayload = {
  id?: string;
  name?: string;
  token?: string;
  authorized?: boolean;
  blocked?: boolean;
  allowedPaths?: string[];
  notes?: string;
};

function normalizeDeviceId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  return normalized.length > 0 ? normalized : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeSecrets = searchParams.get('includeSecrets') === 'true';

  const state = await readState();
  const livePaths = await listMediaMtxPaths(state.settings.mediamtxApiUrl).catch(() => []);

  const devices = Object.values(state.devices)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((device) => withLiveDeviceState(device, livePaths))
    .map((device) => toPublicDevice(device, includeSecrets));

  return NextResponse.json(devices);
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as DeviceCreatePayload | null;

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid device payload' }, { status: 400 });
  }

  const next = await mutateState((state) => {
    if (Object.keys(state.devices).length >= state.settings.maxDevices) {
      return { error: 'max-devices-reached' as const };
    }

    const now = Date.now();
    const generatedId = `device-${now}`;
    const id = normalizeDeviceId(payload.id) ?? generatedId;

    if (state.devices[id]) {
      return { error: 'device-already-exists' as const };
    }

    const name = typeof payload.name === 'string' && payload.name.trim().length > 0 ? payload.name : id;
    const token = typeof payload.token === 'string' && payload.token.trim() ? payload.token : createDeviceToken();

    const device = createDevice({
      id,
      name,
      token,
      authorized: payload.authorized,
      blocked: payload.blocked,
      allowedPaths: normalizePathList(payload.allowedPaths),
      notes: typeof payload.notes === 'string' ? payload.notes : undefined,
    });

    state.devices[id] = device;
    return { device };
  });

  if ('error' in next) {
    const status = next.error === 'max-devices-reached' ? 409 : 409;
    return NextResponse.json({ error: next.error }, { status });
  }

  return NextResponse.json(toPublicDevice(next.device, true), { status: 201 });
}
