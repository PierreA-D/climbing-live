import { NextResponse } from 'next/server';

import { listMediaMtxPaths, withLiveDeviceState } from '@/lib/backend/mediamtx';
import { isDeviceOnline, readState, toPublicDevice } from '@/lib/backend/store';

export const runtime = 'nodejs';

export async function GET() {
  const state = await readState();
  const livePaths = await listMediaMtxPaths(state.settings.mediamtxApiUrl).catch(() => []);
  const connected = Object.values(state.devices)
    .map((device) => withLiveDeviceState(device, livePaths))
    .filter((device) => isDeviceOnline(device, state.settings.deviceOfflineAfterMs))
    .map((device) => toPublicDevice(device, false));

  return NextResponse.json(connected);
}
