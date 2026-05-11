import {
    ChevronDown,
    Mountain,
    Search,
} from 'lucide-react';
import Link from 'next/link';
import { categories } from '@/data/categories';

export default function Navbar() {
  return (
    <header className="bg-[#0e0e10] text-white sticky top-0 z-50 border-b border-white/10 bg-[#18181b]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
                    <Mountain className="h-6 w-6" />
                </div>

                <div>
                    <h1 className="text-xl font-bold">Climbing Live</h1>
                    <p className="text-xs text-zinc-400">
                        Une nouvelle façon de regarder l’escalade
                    </p>
                </div>
            </div>

            <div className="hidden items-center gap-4 md:flex">
                <Link href="/" className="text-sm text-zinc-300 transition hover:text-white">
                    Accueil
                </Link>
                <Link
                    href="/multicam"
                    className="text-sm text-zinc-300 transition hover:text-white"
                >
                    Compétitions
                </Link>
                <div className="group relative">
                    <button className="text-sm text-zinc-300 transition hover:text-white">
                        Catégories
                        <ChevronDown className="h-3 w-3 inline-block ml-1" />
                    </button>
                    <div
                        className="
                            invisible absolute left-0 top-8 z-50
                            w-48 rounded-xl border border-white/10
                            bg-[#18181b] p-2 opacity-0
                            transition-all duration-200
                            group-hover:visible
                            group-hover:opacity-100
                        "
                    >
                        {categories.map((category) => {
                            return (
                                <Link
                                    key={category.name}
                                    href={`/${category.name.toLowerCase()}`}
                                    className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5"
                                >
                                    <div className="flex items-center gap-2">
                                        {category.name}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 md:flex">
                    <Search className="h-4 w-4 text-zinc-400" />
                    <input
                        placeholder="Rechercher..."
                        className="bg-transparent text-sm outline-none placeholder:text-zinc-500"
                    />
                </div>

                <button className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold transition hover:bg-orange-400 ">
                    Se connecter
                </button>
            </div>
        </div>
    </header>
  );
}
