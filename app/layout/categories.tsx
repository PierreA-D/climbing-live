import { categories } from '@/data/categories';
import Link from 'next/link';

export default function Categories() {
  return (
        <section className="mx-auto max-w-7xl px-6 py-12">
            <div className="mb-8 flex items-center justify-between">
                <h3 className="text-2xl font-bold">Catégories</h3>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((category) => {
                    const Icon = category.icon;

                    return (
                        <Link
                            key={category.name}
                            href={`${category.name.toLowerCase()}`}
                            className={`
                                group block cursor-pointer
                                rounded-3xl bg-gradient-to-br ${category.color}
                                p-[1px] transition hover:scale-[1.02]
                            `}
                        >
                            <div className="rounded-3xl bg-[#18181b] p-6">
                                <div
                                    className={`
                                        mb-5 flex h-14 w-14 items-center justify-center
                                        rounded-2xl bg-gradient-to-br ${category.color}
                                    `}
                                >
                                    <Icon className="h-7 w-7" />
                                </div>

                                <h4 className="text-xl font-bold">
                                    {category.name}
                                </h4>

                                <p className="mt-2 text-sm text-zinc-400">
                                    Regarde les meilleurs événements de{' '}
                                    {category.name.toLowerCase()}.
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
  );
}
