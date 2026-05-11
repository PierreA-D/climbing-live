'use client';

import { ChevronRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function Streams() {
        
    // const [liveCompetitions, setLiveCompetitions] = useState<LiveCompetition[]>([]);

    const [liveCompetitions, setLiveCompetitions] = useState([
        {
            id: 1,
            title: 'Coupe du Monde Bloc - Finale Hommes',
            viewers: '12.4k',
            image:
                'https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=1600&auto=format&fit=crop',
            category: 'Bloc',
            live: true,
        },
        {
            id: 2,
            title: 'Open National Difficulté',
            viewers: '4.8k',
            image:
                'https://images.unsplash.com/photo-1516592673884-4a382d1124c2?q=80&w=1600&auto=format&fit=crop',
            category: 'Difficulté',
            live: true,
        },
        {
            id: 3,
            title: 'Championat Europe Vitesse',
            viewers: '8.2k',
            image:
                'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=1600&auto=format&fit=crop',
            category: 'Vitesse',
            live: true,
        },
        {
            id: 4,
            title: 'Coupe du Monde Bloc - Finale Hommes',
            viewers: '12.4k',
            image:
                'https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=1600&auto=format&fit=crop',
            category: 'Bloc',
            live: true,
        },
        {
            id: 5,
            title: 'Open National Difficulté',
            viewers: '4.8k',
            image:
                'https://images.unsplash.com/photo-1516592673884-4a382d1124c2?q=80&w=1600&auto=format&fit=crop',
            category: 'Difficulté',
            live: true,
        },
        {
            id: 6,
            title: 'Championat Europe Vitesse',
            viewers: '8.2k',
            image:
                'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=1600&auto=format&fit=crop',
            category: 'Vitesse',
            live: true,
        },
    ]);
    return (
        liveCompetitions.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-6">
            <div className="mb-8 flex items-center justify-between">
                <h3 className="flex items-center gap-3 text-2xl font-bold">
                    <Trophy className="h-7 w-7 text-orange-500" />
                    Compétitions en direct
                </h3>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {liveCompetitions.map((competition) => (
                    <div
                        key={competition.id}
                        className="group overflow-hidden rounded-3xl border border-white/10 bg-[#18181b] transition hover:-translate-y-1 hover:border-orange-500/40"
                    >
                        <Link href="/">
                            <div className="relative overflow-hidden">
                                <img
                                    src={competition.image}
                                    alt={competition.title}
                                    className="h-56 w-full object-cover transition duration-300 group-hover:scale-105"
                                />

                                <div className="absolute left-4 top-4 rounded-lg bg-red-500 px-2 py-1 text-xs font-bold">
                                    LIVE
                                </div>

                                <div className="absolute left-4 bottom-4 rounded-lg bg-orange-500/80 px-2 py-1 text-xs font-bold">
                                    {competition.category}
                                </div>

                                <div className="absolute bottom-4 right-4 rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold">
                                    {competition.viewers} viewers
                                </div>
                            </div>

                            <div className="p-5">
                                <h4 className="text-lg font-bold leading-snug">
                                    {competition.title}
                                </h4>

                                {/* <button className="mt-5 flex items-center gap-2 text-sm font-semibold text-orange-400 transition hover:text-orange-300">
                                    Regarder maintenant
                                    <ChevronRight className="h-4 w-4" />
                                </button> */}
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </section>)
  );
}
