import MultiCamPlayer from '@/app/components/MultiCamPlayer';
import { listActiveCameraStreams } from '@/lib/backend/cameras';

export default async function MulticamPage() {
    const cameras = await listActiveCameraStreams().catch(() => []);
    return (
        <MultiCamPlayer initialCameras={cameras} />
    );
}