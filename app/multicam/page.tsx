import MultiCamPlayer from '@/app/components/MultiCamPlayer';
import { listActiveCameraStreams } from '@/lib/backend/cameras';
import { listLiveCompetitions } from '@/lib/backend/competitions';
import Link from 'next/link';

export default async function MulticamPage() {
    const liveCompetitions = await listLiveCompetitions().catch(() => []);

    if (liveCompetitions.length === 0) {
        return (
            <div className="mx-auto max-w-4xl px-6 py-16">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-8 text-center text-zinc-100">
                    <h1 className="text-3xl font-bold">Aucun live disponible</h1>
                    <Link
                        href="/"
                        className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 font-semibold text-black"
                    >
                        Retour à l'accueil
                    </Link>
                </div>
            </div>
        );
    }

    const cameras = await listActiveCameraStreams().catch(() => []);
    return (
        <div className="p-6">
            <MultiCamPlayer initialCameras={cameras} />;
        </div>
    );
}