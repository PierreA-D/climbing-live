import { NextResponse } from 'next/server';

import { mutateState, readState } from '@/lib/backend/store';
import type { BackendSettings } from '@/lib/backend/types';

export const runtime = 'nodejs';

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function mergeSettings(current: BackendSettings, update: Partial<BackendSettings>): BackendSettings {
  return {
    mediamtxApiUrl: asString(update.mediamtxApiUrl, current.mediamtxApiUrl),
    hlsBaseUrl: asString(update.hlsBaseUrl, current.hlsBaseUrl),
    requireDeviceAuth: asBoolean(update.requireDeviceAuth, current.requireDeviceAuth),
    allowUnknownDevices: asBoolean(update.allowUnknownDevices, current.allowUnknownDevices),
    autoRegisterUnknownDevices: asBoolean(
      update.autoRegisterUnknownDevices,
      current.autoRegisterUnknownDevices
    ),
    autoAuthorizeNewDevices: asBoolean(
      update.autoAuthorizeNewDevices,
      current.autoAuthorizeNewDevices
    ),
    exposeOnlyAuthorizedPaths: asBoolean(
      update.exposeOnlyAuthorizedPaths,
      current.exposeOnlyAuthorizedPaths
    ),
    maxDevices: Math.max(1, asNumber(update.maxDevices, current.maxDevices)),
    maxConnectedDevices: Math.max(1, asNumber(update.maxConnectedDevices, current.maxConnectedDevices)),
    deviceOfflineAfterMs: Math.max(
      5_000,
      asNumber(update.deviceOfflineAfterMs, current.deviceOfflineAfterMs)
    ),
    pollIntervalMs: Math.max(1_000, asNumber(update.pollIntervalMs, current.pollIntervalMs)),
    enablePublish: asBoolean(update.enablePublish, current.enablePublish),
    enableRead: asBoolean(update.enableRead, current.enableRead),
  };
}

export async function GET() {
  const state = await readState();
  return NextResponse.json(state.settings);
}

export async function PUT(request: Request) {
  const payload = (await request.json().catch(() => null)) as Partial<BackendSettings> | null;

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
  }

  const settings = await mutateState((state) => {
    state.settings = mergeSettings(state.settings, payload);
    return state.settings;
  });

  return NextResponse.json(settings);
}
