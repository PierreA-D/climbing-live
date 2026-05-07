import { NextResponse } from 'next/server';

import { mutateState, sanitizePathName, touchDevice } from '@/lib/backend/store';

export const runtime = 'nodejs';

type EventPayload = {
  user?: string;
  action?: string;
  path?: string;
  ip?: string;
  protocol?: string;
};

function normalizeId(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  return value.trim().toLowerCase();
}

function isOfflineEvent(action: string): boolean {
  return (
    action.includes('disconnect') ||
    action.includes('remove') ||
    action.includes('close') ||
    action.includes('stop')
  );
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as EventPayload | null;

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const userId = normalizeId(payload.user);
  if (!userId) {
    return NextResponse.json({ ok: true, ignored: 'missing-user' });
  }

  const action = typeof payload.action === 'string' ? payload.action.toLowerCase() : '';
  const pathName = sanitizePathName(payload.path);
  const ip = typeof payload.ip === 'string' ? payload.ip : null;
  const protocol = typeof payload.protocol === 'string' ? payload.protocol : null;

  const updated = await mutateState((state) => {
    const current = state.devices[userId];
    if (!current) {
      return null;
    }

    const offline = isOfflineEvent(action);
    const next = touchDevice({
      ...current,
      status: offline ? 'offline' : 'online',
      lastSeenAt: new Date().toISOString(),
      lastIp: ip,
      lastProtocol: protocol,
      currentPath: offline ? null : pathName,
    });

    state.devices[userId] = next;
    return next;
  });

  if (!updated) {
    return NextResponse.json({ ok: true, ignored: 'unknown-user' });
  }

  return NextResponse.json({ ok: true, deviceId: updated.id, status: updated.status });
}
