import MultiCamPlayer from './components/MultiCamPlayer';

import { listActiveCameraStreams } from '@/lib/backend/cameras';

export default async function HomePage() {
  const cameras = await listActiveCameraStreams().catch(() => []);

  return <MultiCamPlayer initialCameras={cameras} />;
}
