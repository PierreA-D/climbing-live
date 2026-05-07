import { NextResponse } from 'next/server';

import { listMediaMtxPaths } from '@/lib/backend/mediamtx';
import { readState } from '@/lib/backend/store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const state = await readState();
    const paths = await listMediaMtxPaths(state.settings.mediamtxApiUrl);

    const isPathLive = (path: { ready: boolean; source: string | null; readersCount: number }) =>
      path.ready || path.readersCount > 0 || path.source !== null;

    const authorizedPaths = new Set(
      Object.values(state.devices)
        .filter((device) => device.authorized && !device.blocked)
        .flatMap((device) => device.allowedPaths)
    );

    const shouldFilterByAuthorization =
      state.settings.exposeOnlyAuthorizedPaths && authorizedPaths.size > 0;

    const cameras = paths
      .filter((p) => isPathLive(p))
      .filter((p) => (shouldFilterByAuthorization ? authorizedPaths.has(p.name) : true))
      .map((p) => ({
        id: p.name,
        name: p.name,
        url: `${state.settings.hlsBaseUrl}/${p.name}/index.m3u8`,
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
