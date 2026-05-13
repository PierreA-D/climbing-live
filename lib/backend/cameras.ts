import { isMediaMtxPathLive, listMediaMtxPaths } from '@/lib/backend/mediamtx';
import { readState } from '@/lib/backend/store';

export type CameraStream = {
  id: string;
  name: string;
  url: string;
  status: 'online';
};

function matchesCompetitionId(pathName: string, competitionId: number | null) {
  if (competitionId === null) {
    return true;
  }

  return pathName.startsWith(`${competitionId}-`);
}

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

export async function listActiveCameraStreams(competitionId: number | null = null): Promise<CameraStream[]> {
  const state = await readState();
  const paths = await listMediaMtxPaths(state.settings.mediamtxApiUrl);

  const allowedPaths = new Set(
    Object.values(state.devices)
      .filter((device) => device.authorized && !device.blocked)
      .flatMap((device) => device.allowedPaths)
  );

  return paths
    .filter(isMediaMtxPathLive)
    .filter((path) => matchesAllowedPath(path.name, allowedPaths))
    .filter((path) => matchesCompetitionId(path.name, competitionId))
    .map((path) => ({
      id: path.name,
      name: path.name,
      url: `${state.settings.hlsBaseUrl}/${path.rawName}/index.m3u8`,
      status: 'online',
    }));
}