'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

const PUBLIC_STREAM_HOST = process.env.NEXT_PUBLIC_STREAM_HOST?.trim() ?? '';

function CopyRow({ label, value }: { label: string; value: string }) {
  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-3">
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="break-all font-mono text-sm text-zinc-100">{value}</p>
      <button
        onClick={() => void copyValue()}
        className="mt-2 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-black"
      >
        Copier
      </button>
    </div>
  );
}

export default function OnboardClient() {
  const searchParams = useSearchParams();

  const deviceId = searchParams.get('deviceId') ?? '';
  const token = searchParams.get('token') ?? '';
  const path = searchParams.get('path') ?? 'main';
  const streamHostFromQuery = searchParams.get('streamHost') ?? '';

  const host = useMemo(() => {
    if (streamHostFromQuery) {
      return streamHostFromQuery;
    }

    if (PUBLIC_STREAM_HOST) {
      return PUBLIC_STREAM_HOST;
    }

    return 'localhost';
  }, [streamHostFromQuery]);

  const rtmpUrl = `rtmp://${host}:1935/${path}`;
  const rtspUrl = `rtsp://${host}:8554/${path}`;
  const srtUrl = `srt://${host}:8890?streamid=publish:${path}`;

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-2xl space-y-5">
        <h1 className="text-3xl font-bold">Ajout appareil au flux</h1>
        <p className="text-zinc-300">
          Utilisez ces informations dans Larix, OBS, ou toute app RTMP/RTSP/SRT.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <CopyRow label="Utilisateur" value={deviceId || 'non-defini'} />
          <CopyRow label="Mot de passe" value={token || 'non-defini'} />
          <CopyRow label="RTMP" value={rtmpUrl} />
          <CopyRow label="RTSP" value={rtspUrl} />
          <CopyRow label="SRT" value={srtUrl} />
          <CopyRow label="Cle de stream (stream key)" value={path} />
        </div>

        <section className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4">
          <h2 className="text-lg font-semibold">Si vous utilisez pas le QR code</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-300">
            <li>Copie manuelle du user/password dans application mobile.</li>
            <li>Saisie manuelle de URL RTMP complete.</li>
            <li>Connexion via RTSP selon votre application.</li>
            <li>Connexion via SRT si app le supporte.</li>
            <li>Configuration OBS: serveur RTMP + user/password.</li>
            <li>Partage du lien de cette page par SMS, mail, WhatsApp.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
