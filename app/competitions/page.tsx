import Streams from '@/layout/streams';
import { listActiveCameraStreams } from '@/lib/backend/cameras';
import Link from 'next/link';

export default async function Competitions() {
    const liveCameras = await listActiveCameraStreams().catch(() => []);
    
    return (
        <div className="flex h-[calc(100dvh-80px)] w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),radial-gradient(circle_at_right,_rgba(34,197,94,0.12),_transparent_22%),linear-gradient(180deg,_#050816_0%,_#09090b_46%,_#111827_100%)] text-white lg:flex-row">
            <div className="flex min-w-0 flex-1 flex-col">
                {liveCameras.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center bg-black/20 text-center shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
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
                    ) : (
                        <Streams showHeading={false} />
                )}
            </div>
        </div>
    );
}