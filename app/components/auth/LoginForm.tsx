'use client';

import { AlertCircle, ArrowRight, Mountain, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(result?.error ?? 'Connexion impossible.');
      setIsSubmitting(false);
      return;
    }

    router.replace('/admin');
    router.refresh();
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-6">
        <div className="space-y-4">
            <h1 className="max-w-2xl text-5xl font-black leading-tight text-white md:text-6xl">
            Pilotez l'événement sans quitter le live.
            </h1>
            <div className="w-full inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-200">
                <ShieldCheck className="h-4 w-4" />
                Accès sécurisé à la console d'administration
            </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#18181b]/90 p-8 shadow-2xl shadow-black/30">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
            <Mountain className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Climbing Live</p>
            <h2 className="text-2xl font-bold text-white">Connexion admin</h2>
          </div>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-300">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none transition focus:border-orange-400"
              placeholder="Identifiant de connexion"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-300">Mot de passe</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-white outline-none transition focus:border-orange-400"
              placeholder="Votre mot de passe"
            />
          </label>

          {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-500/60"
          >
            {isSubmitting ? 'Connexion...' : 'Connexion'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

