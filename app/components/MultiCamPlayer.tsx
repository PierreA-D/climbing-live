'use client';

import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import Link from 'next/link';
import type { CameraStream } from '@/lib/backend/cameras';

type MultiCamPlayerProps = {
  initialCameras: CameraStream[];
};

export default function MultiCamPlayer({ initialCameras }: MultiCamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const [currentCamera, setCurrentCamera] = useState<CameraStream | null>(initialCameras[0] ?? null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const activeCameraLabel = currentCamera?.name ?? 'Aucune camera';


  useEffect(() => {
    if (!videoRef.current || !currentCamera?.url) {
      return;
    }

    let player = playerRef.current;

    if (!player) {
      player = videojs(videoRef.current, {
        autoplay: false,
        preload: 'auto',
        muted: true,
        controls: true,
        responsive: true,
        fluid: false,
        fill: true,
        liveui: true,
        liveTracker: {
          trackingThreshold: 0,
          liveTolerance: 15,
        },
        html5: {
          vhs: {
            overrideNative: true,
            enableLowInitialPlaylist: true,
            limitRenditionByPlayerDimensions: false,
            smoothQualityChange: true,
            llhls: false,
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        },
      });

      playerRef.current = player;
    }

    player.src({
      src: currentCamera.url,
      type: 'application/x-mpegURL',
    });

    void player.play().catch(() => {});
  }, [currentCamera]);

  return (
    <div className="flex h-[calc(100dvh-80px)] w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),radial-gradient(circle_at_right,_rgba(34,197,94,0.12),_transparent_22%),linear-gradient(180deg,_#050816_0%,_#09090b_46%,_#111827_100%)] text-white lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        {initialCameras.length === 0 ? (
          <div className="flex flex-1 items-center justify-center bg-black/20 text-center shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-8 text-center text-zinc-100">
                  <h1 className="text-3xl font-bold">Aucun live disponible</h1>
                  <Link
                      href="/"
                      className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 font-semibold text-black"
                  >
                      Retour à l'accueil
                  </Link>
              </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col bg-black/30 p-3 backdrop-blur sm:p-4">
            <div className="mb-3 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 p-1 sm:px-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Lecture en direct</p>
                <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">{activeCameraLabel}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-xs font-medium text-zinc-100 transition hover:border-white/24 hover:bg-white/10"
                >
                  <span className="text-sm leading-none">{isDrawerOpen ? '×' : '+'}</span>
                  {isDrawerOpen ? 'Masquer les caméras' : 'Afficher les caméras'}
                </button>
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-500">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  En ligne
                </div>
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[24px] border border-white/8 bg-black">
              <div data-vjs-player>
                <video ref={videoRef} className="video-js vjs-big-play-centered h-full w-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {initialCameras.length > 0 && (
        <div
          className={[
            'flex flex-col border-white/10 bg-black/20 backdrop-blur transition-all duration-300',
            isDrawerOpen ? 'h-1/3 w-full min-h-[300px] border-t p-4 sm:p-6 lg:h-full lg:w-[380px] lg:border-l lg:border-t-0 lg:min-h-0' : 'h-0 w-full overflow-hidden p-0 lg:h-full lg:w-0',
          ].join(' ')}
        >
          {isDrawerOpen && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="mb-4 flex flex-shrink-0 items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Sélection des angles</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Caméras disponibles</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  {initialCameras.length} sources
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {initialCameras.map((camera, index) => {
                  const isActive = currentCamera?.id === camera.id;

                  return (
                    <button
                      key={camera.id}
                      onClick={() => setCurrentCamera(camera)}
                      className={[
                        'group w-full rounded-2xl border p-4 text-left transition duration-200',
                        isActive
                          ? 'border-orange-500/40 bg-gradient-to-br from-orange-500/20 via-white/10 to-white/6 text-white shadow-[0_12px_30px_rgba(244,99,1,0.15)]'
                          : 'border-white/8 bg-white/[0.04] text-zinc-200 hover:border-white/16 hover:bg-white/[0.07]',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Caméra {index + 1}</p>
                          <p className="mt-1 text-sm font-semibold sm:text-base">{camera.name}</p>
                        </div>
                        <div
                          className={[
                            'inline-flex items-center rounded-full border p-1 text-xs',
                            isActive ? 'border-orange-500/20 bg-orange-500/20 text-orange-500' : 'bg-white/6 text-zinc-400',
                          ].join(' ')}
                        >
                          {isActive ? 'En direct' : 'Disponible'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
