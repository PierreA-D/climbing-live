import { Play } from 'lucide-react';

export default function Banner() {
  return (
    <section className="relative">
        <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{
                backgroundImage:
                    "url('https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=1800&auto=format&fit=crop')",
            }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-[#0e0e10]/70 to-transparent" />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-6 py-20 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
                {/* <div className="mb-5 flex items-center gap-2">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                    <span className="text-sm font-medium uppercase tracking-wider text-red-400">
                        En direct
                    </span>
                </div> */}

                <h2 className="text-5xl font-black leading-tight md:text-7xl whitespace-nowrap">
                    L’escalade en live,
                    <br />
                    réinventée.
                </h2>

                <p className="mt-6 max-w-xl text-lg text-zinc-300">
                    Une nouvelle façon de regarder l’escalade en live : multi-caméra, replays instantanés et suivi des grimpeurs en temps réel.
                </p>
            </div>
            
            {/* <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-bold">
                        Top compétition
                    </h3>

                    <div className="flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
                        LIVE
                    </div>
                </div>

                <img
                    src="https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=1200&auto=format&fit=crop"
                    alt="competition"
                    className="h-52 w-full rounded-2xl object-cover"
                />

                <div className="mt-4">
                    <h4 className="text-xl font-bold">
                        IFSC World Cup Prague
                    </h4>

                    <div className="mt-2 flex items-center gap-4 text-sm text-zinc-400">
                        <span>Bloc</span>
                        <span>•</span>
                        <span>18.2k spectateurs</span>
                    </div>

                    <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 font-semibold text-black transition hover:opacity-90">
                        <Play className="h-4 w-4 fill-black" />
                        Rejoindre le stream
                    </button>
                </div>
            </div> */}
        </div>
    </section>
  );
}
