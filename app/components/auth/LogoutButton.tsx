'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const logout = async () => {
    setIsPending(true);
    await fetch('/api/auth/logout', {
      method: 'POST',
    });
    router.replace('/login');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-orange-400/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" />
      {isPending ? 'Déconnexion...' : 'Se déconnecter'}
    </button>
  );
}