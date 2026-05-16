import { NextResponse } from 'next/server';

import { listApiCameraDevices } from '@/lib/backend/camera-api';
import { listMediaMtxPaths } from '@/lib/backend/mediamtx';
import { readState } from '@/lib/backend/store';

export const runtime = 'nodejs';

function matchesAllowedPath(pathName: string, allowedPaths: Set<string>) {
  if (allowedPaths.size === 0) {
    return true;
  }

  for (const allowedPath of allowedPaths) {
    if (pathName === allowedPath || pathName.startsWith(`${allowedPath}/`)) {
      return true;
    }
  }

  return false;
}

export async function GET() {
  try {
    const state = await readState();
    const [paths, apiCameras] = await Promise.all([
      listMediaMtxPaths(state.settings.mediamtxApiUrl),
      listApiCameraDevices(),
    ]);

    const allowedPaths = new Set(
      [...Object.values(state.devices), ...apiCameras]
        .filter((device) => device.authorized && !device.blocked)
        .flatMap((device) => device.allowedPaths)
    );

    const streams = paths.map((path) => ({
      ...path,
      authorized: matchesAllowedPath(path.name, allowedPaths),
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
