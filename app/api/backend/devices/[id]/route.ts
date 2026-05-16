import { NextResponse } from 'next/server';

import { getSession } from '@/app/features/auth/server/session';
import { listMediaMtxPaths, withLiveDeviceState } from '@/lib/backend/mediamtx';
import { mutateState, normalizePathList, readState, toPublicDevice, touchDevice } from '@/lib/backend/store';

export const runtime = 'nodejs';

type DevicePatchPayload = {
  name?: string;
  authorized?: boolean;
  blocked?: boolean;
  allowedPaths?: string[];
  notes?: string;
  token?: string;
};

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const state = await readState();
  const device = state.devices[id];

  if (!device) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  }

  const livePaths = await listMediaMtxPaths(state.settings.mediamtxApiUrl).catch(() => []);
  return NextResponse.json(toPublicDevice(withLiveDeviceState(device, livePaths), false));
}

export async function PATCH(request: Request, context: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as DevicePatchPayload | null;

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const next = await mutateState((state) => {
    const current = state.devices[id];
    if (!current) {
      return null;
    }

    const updated = touchDevice({
      ...current,
      name: typeof payload.name === 'string' && payload.name.trim() ? payload.name : current.name,
      authorized: typeof payload.authorized === 'boolean' ? payload.authorized : current.authorized,
      blocked: typeof payload.blocked === 'boolean' ? payload.blocked : current.blocked,
      notes: typeof payload.notes === 'string' ? payload.notes : current.notes,
      token: typeof payload.token === 'string' && payload.token.trim() ? payload.token : current.token,
      allowedPaths: payload.allowedPaths ? normalizePathList(payload.allowedPaths) : current.allowedPaths,
    });

    state.devices[id] = updated;
    return updated;
  });

  if (!next) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  }

  return NextResponse.json(toPublicDevice(next, false));
}

export async function DELETE(_request: Request, context: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const deleted = await mutateState((state) => {
    if (!state.devices[id]) {
      return false;
    }

    delete state.devices[id];
    return true;
  });

  if (!deleted) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
