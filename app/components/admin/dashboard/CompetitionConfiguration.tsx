import Image from 'next/image';
import { useState } from 'react';
import type { Competition } from '@/data/competitions';

export type Camera = {
  id: string;
  name: string;
  location: string | null;
  hlsUrl: string | null;
  rtmpUrl: string | null;
  status: 'online' | 'offline' | string;
  authorized: boolean;
};

type CompetitionConfigurationProps = {
  selectedCompetition: Competition;
  cameras: Camera[];
  selectedCamera: Camera | null;
  qrDataUrl: string | null;
  selectedCameraToken: string;
  streamUrls: {
    path: string;
    streamKey: string;
    publishPath: string;
    rtmp: string;
    rtmpServer: string;
    rtsp: string;
    srt: string;
  } | null;
  onCreateCamera: () => void;
  onToggleAuthorized: (camera: Camera) => void;
  onViewCamera: (camera: Camera) => void;
  onDeleteCamera: (cameraId: string) => void;
};

type CopyRowProps = {
  label: string;
  value: string;
  mono?: boolean;
};

function CopyRow({ label, value, mono = true }: CopyRowProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`flex-1 break-all text-sm text-zinc-100 ${mono ? 'font-mono' : ''}`}>{value}</span>
        <button
          onClick={copy}
          className="shrink-0 rounded-lg border border-zinc-600 px-2 py-0.5 text-xs text-zinc-300 hover:border-zinc-400"
        >
          {copied ? 'Copie !' : 'Copier'}
        </button>
      </div>
    </div>
  );
}

export default function CompetitionConfiguration({
  selectedCompetition,
  cameras,
  selectedCamera,
  qrDataUrl,
  selectedCameraToken,
  streamUrls,
  onCreateCamera,
  onToggleAuthorized,
  onViewCamera,
  onDeleteCamera,
}: CompetitionConfigurationProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-orange-200">Configuration competition</p>
              <h2 className="mt-1 text-2xl font-semibold text-orange-50">{selectedCompetition.name}</h2>
              <p className="mt-1 text-sm text-orange-100/80">
                Ajoutez une camera à cette competition, puis partagez le QR code ou les URLs de flux.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-700 bg-zinc-900/30 p-4">
          <h2 className="text-xl font-semibold">Ajouter une camera</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Cette camera sera preparee pour l onboarding de {selectedCompetition.name}.
          </p>
          <button
            onClick={onCreateCamera}
            className="mt-4 rounded-xl bg-white px-6 py-2 font-semibold text-black hover:bg-zinc-100"
          >
            + Creer une camera
          </button>
        </div>

        {cameras.length > 0 && (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/30 p-4">
            <h2 className="text-xl font-semibold">Liste des cameras</h2>
            <div className="mt-3 space-y-3">
              {cameras.map((camera) => (
                <div key={camera.id} className="rounded-xl border border-zinc-700 bg-zinc-950/80 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{camera.name}</p>
                      <p className="text-xs text-zinc-400">{camera.id}</p>
                      <p className="text-xs text-zinc-400">
                        Zone: {camera.location || 'n/a'} | Statut: {camera.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onToggleAuthorized(camera)}
                        className="rounded-lg border border-zinc-600 px-3 py-1 text-sm"
                      >
                        {camera.authorized ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() => onViewCamera(camera)}
                        className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-black"
                      >
                        Voir
                      </button>
                      <button
                        onClick={() => onDeleteCamera(camera.id)}
                        className="rounded-lg border border-red-500/60 px-3 py-1 text-sm text-red-300"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4">
          <h2 className="text-xl font-semibold">QR code onboarding</h2>
          {selectedCamera ? (
            <>
              <p className="mt-2 text-sm text-zinc-400">Camera: {selectedCamera.id}</p>
              {qrDataUrl ? (
                <Image
                  src={qrDataUrl}
                  alt="QR onboarding"
                  width={260}
                  height={260}
                  unoptimized
                  className="mt-3 w-full rounded-xl bg-white p-3"
                />
              ) : (
                <p className="mt-3 text-sm text-zinc-400">Generation...</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">Selectionnez une camera pour generer le QR.</p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4">
          <h2 className="text-lg font-semibold">Sans QR code</h2>
          {!selectedCamera ? (
            <p className="mt-2 text-sm text-zinc-400">Selectionnez une camera pour afficher les URLs.</p>
          ) : (
            <div className="mt-3 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Camera</p>
                <CopyRow label="ID" value={selectedCamera.id} />
                <CopyRow label="Cle de stream secrete" value={streamUrls?.streamKey || selectedCameraToken || 'non-defini'} />
                <CopyRow label="Chemin du flux" value={streamUrls?.path ?? 'main'} />
                <p className="text-xs text-zinc-400">
                  Important: pour les apps RTMP avec un champ serveur + stream key, mettez le chemin du flux dans le serveur RTMP et la cle secrete dans le champ stream key.
                </p>
                <CopyRow
                  label="HLS"
                  value={selectedCamera.hlsUrl ?? `http://localhost:8888/${streamUrls?.publishPath ?? 'main'}/index.m3u8`}
                  mono={false}
                />
              </div>

              {streamUrls && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">URLs de flux</p>
                    <CopyRow label="RTMP (Larix, OBS…)" value={streamUrls.rtmp} />
                    <CopyRow label="RTSP" value={streamUrls.rtsp} />
                    <CopyRow label="SRT" value={streamUrls.srt} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Config OBS</p>
                    <CopyRow label="Serveur" value={streamUrls.rtmpServer} />
                    <CopyRow label="Cle de stream" value={streamUrls.streamKey || 'non-defini'} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}