import { NextResponse } from 'next/server';

import { isMediaMtxPathLive, listMediaMtxPaths } from '@/lib/backend/mediamtx';
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

    const cameras = paths
      .filter(isMediaMtxPathLive)
      .filter((path) => allowedPaths.size === 0 || allowedPaths.has(path.name))
      .map((path) => ({
        id: path.name,
        name: path.name,
        url: `${state.settings.hlsBaseUrl}/${path.rawName}/index.m3u8`,
        status: 'online' as const,
      }));

    return NextResponse.json(cameras);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch streams',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
