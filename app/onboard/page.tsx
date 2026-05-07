import { Suspense } from 'react';

import OnboardClient from '@/app/components/admin/OnboardClient';

function OnboardFallback() {
  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-2xl">
        <p className="text-zinc-300">Chargement de la configuration appareil...</p>
      </div>
    </main>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<OnboardFallback />}>
      <OnboardClient />
    </Suspense>
  );
}
