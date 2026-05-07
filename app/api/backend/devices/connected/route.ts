import { NextResponse } from 'next/server';

import { isDeviceOnline, readState, toPublicDevice } from '@/lib/backend/store';

export const runtime = 'nodejs';

export async function GET() {
  const state = await readState();
  const connected = Object.values(state.devices)
    .filter((device) => isDeviceOnline(device, state.settings.deviceOfflineAfterMs))
    .map((device) => toPublicDevice(device, false));

  return NextResponse.json(connected);
}
