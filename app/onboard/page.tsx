import dynamic from 'next/dynamic';

const OnboardClient = dynamic(() => import('@/app/components/admin/OnboardClient'), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-2xl">
        <p className="text-zinc-300">Chargement de la configuration appareil...</p>
      </div>
    </main>
  ),
});

export default function OnboardPage() {
  return <OnboardClient />;
}
