import MultiCamPlayer from '@/app/components/MultiCamPlayer';
import { listActiveCameraStreams } from '@/lib/backend/cameras';

export default async function MulticamPage() {
    const cameras = await listActiveCameraStreams().catch(() => []);
    return (
        <div className="p-6">
            <MultiCamPlayer initialCameras={cameras} />;
        </div>
    );
}