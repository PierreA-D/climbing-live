import { NextResponse } from 'next/server';

import { listMediaMtxPaths } from '@/lib/backend/mediamtx';
import { readState } from '@/lib/backend/store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const state = await readState();
    const paths = await listMediaMtxPaths(state.settings.mediamtxApiUrl);

    const allowedPaths = new Set(
      Object.values(state.devices)
        .filter((device) => device.authorized && !device.blocked)
        .flatMap((device) => device.allowedPaths)
    );

    const streams = paths.map((path) => ({
      ...path,
      authorized: allowedPaths.size === 0 ? true : allowedPaths.has(path.name),
      hlsUrl: `${state.settings.hlsBaseUrl}/${path.rawName}/index.m3u8`,
    }));

    return NextResponse.json(streams);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch streams',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
