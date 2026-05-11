import {
    ChevronDown,
    Mountain,
    Search,
    Plus,
    DoorOpen,
} from 'lucide-react';
import Link from 'next/link';
import LogoutButton from '@/app/components/auth/LogoutButton';
import { categories } from '@/data/categories';
import { getSession } from '@/lib/auth/session';

export default async function Navbar() {
    const session = await getSession();

  return (
    <header className="bg-[#0e0e10] text-white sticky top-0 z-50 border-b border-white/10 bg-[#18181b]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[95rem] items-center justify-between px-6 py-4">
            <Link href="/">
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
            </Link>

            <div className="hidden items-center gap-10 md:flex">
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
                {session && (
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-3 rounded-xl p-2 border border-orange-400 text-orange-400 transition hover:text-orange-300 text-white"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white">
                            <Plus className="h-4 w-4" />
                        </span>
                        <span>Lancer un live</span>
                    </Link>
                )}
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 md:flex">
                    <Search className="h-4 w-4 text-zinc-400" />
                    <input
                        placeholder="Rechercher..."
                        className="bg-transparent text-sm outline-none placeholder:text-zinc-500"
                    />
                </div>

                {session ? (
                    <LogoutButton />
                ) : (
                    <Link
                        href="/login"
                        className="flex rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold transition hover:bg-orange-400"
                    >
                        <DoorOpen className="h-5 w-5 inline-block mr-1" />
                        Se connecter
                    </Link>
                )}
            </div>
        </div>
    </header>
  );
}
