import { Trophy } from 'lucide-react';
import Link from 'next/link';
import LiveCompetitionThumbnail from '@/app/components/LiveCompetitionThumbnail';
import { listLiveCompetitions } from '@/lib/backend/competitions';

type StreamsProps = {
    limit?: number;
    showHeading?: boolean;
};

function formatCategory(value: string | null) {
    if (!value) {
        return 'Sans categorie';
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function Streams({ limit, showHeading = true }: StreamsProps) {
    const liveCompetitions = await listLiveCompetitions();

    if (liveCompetitions.length === 0) {
        return null;
    }

    const competitionsToDisplay = typeof limit === 'number'
        ? liveCompetitions.slice(0, limit)
        : liveCompetitions;

    return (
        <section className="mx-auto max-w-7xl px-6 py-6">
            {showHeading ? (
                <div className="mb-8 flex items-center justify-between">
                    <h3 className="flex items-center gap-3 text-2xl font-bold">
                        <Trophy className="h-7 w-7 text-orange-500" />
                        Compétitions en direct
                    </h3>
                </div>
            ) : null}

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {competitionsToDisplay.map((competition) => (
                    <div
                        key={competition.id}
                        className="group overflow-hidden rounded-3xl border border-white/10 bg-[#18181b] transition hover:-translate-y-1 hover:border-orange-500/40"
                    >
                        <Link href="/">
                            <div className="relative overflow-hidden">
                                <LiveCompetitionThumbnail
                                    previewUrl={competition.previewUrl}
                                    fallbackSrc={competition.image}
                                    alt={competition.name}
                                    mode="snapshot"
                                    className="h-56 w-full transition duration-300 group-hover:scale-105"
                                />

                                <div className="absolute left-4 top-4 rounded-lg bg-red-500 px-2 py-1 text-xs font-bold">
                                    {competition.status === 'live' ? 'EN DIRECT' : 'PROGRAMMÉ'}
                                </div>

                                <div className="absolute left-4 bottom-4 rounded-lg bg-orange-500/80 px-2 py-1 text-xs font-bold">
                                    {formatCategory(competition.category)}
                                </div>

                                <div className="absolute bottom-4 right-4 rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold">
                                    {competition.viewers ?? 0} viewers
                                </div>
                            </div>

                            <div className="p-5">
                                <h4 className="text-lg font-bold leading-snug">
                                    {competition.name}
                                </h4>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
}
