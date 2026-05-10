import { isMediaMtxPathLive, listMediaMtxPaths } from '@/lib/backend/mediamtx';
import { readState } from '@/lib/backend/store';

export type CameraStream = {
  id: string;
  name: string;
  url: string;
  status: 'online';
};

export async function listActiveCameraStreams(): Promise<CameraStream[]> {
  const state = await readState();
  const paths = await listMediaMtxPaths(state.settings.mediamtxApiUrl);

  const allowedPaths = new Set(
    Object.values(state.devices)
      .filter((device) => device.authorized && !device.blocked)
      .flatMap((device) => device.allowedPaths)
  );

  return paths
    .filter(isMediaMtxPathLive)
    .filter((path) => allowedPaths.size === 0 || allowedPaths.has(path.name))
    .map((path) => ({
      id: path.name,
      name: path.name,
      url: `${state.settings.hlsBaseUrl}/${path.rawName}/index.m3u8`,
      status: 'online',
    }));
}