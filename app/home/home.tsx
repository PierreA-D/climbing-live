import Banner from '../layout/banner';
import Categories from '../layout/categories';
import Streams from '../layout/streams';

export default function Home() {

    // const upcomingEvents = [
    //     {
    //         title: 'Masters de Lyon',
    //         date: '14 Juin',
    //         participants: 128,
    //     },
    //     {
    //         title: 'Open de Paris',
    //         date: '21 Juin',
    //         participants: 96,
    //     },
    //     {
    //         title: 'World Cup Innsbruck',
    //         date: '03 Juil',
    //         participants: 214,
    //     },
    // ];

    return (
        <div>
            <Banner />
            <Categories />
            <Streams />

            {/* UPCOMING EVENTS */}
            {/* <section className="mx-auto max-w-7xl px-6 py-14">
                <div className="mb-8 flex items-center justify-between">
                    <h3 className="text-2xl font-bold">
                        Événements à venir
                    </h3>

                    <button className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300">
                        Calendrier complet
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                    {upcomingEvents.map((event) => (
                        <div
                            key={event.title}
                            className="rounded-3xl border border-white/10 bg-[#18181b] p-6"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-zinc-400">
                                        {event.date}
                                    </p>

                                    <h4 className="mt-2 text-xl font-bold">
                                        {event.title}
                                    </h4>
                                </div>

                                <div className="rounded-2xl bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-400">
                                    {event.participants} grimpeurs
                                </div>
                            </div>

                            <button className="mt-6 w-full rounded-2xl border border-white/10 py-3 font-semibold transition hover:bg-white/5">
                                Voir les détails
                            </button>
                        </div>
                    ))}
                </div>
            </section> */}
        </div>
    );
}