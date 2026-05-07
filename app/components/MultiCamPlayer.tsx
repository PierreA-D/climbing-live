'use client';

import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

type Camera = {
  id: string;
  name: string;
  url: string;
};

export default function MultiCamPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [currentCamera, setCurrentCamera] = useState<Camera | null>(null);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const res = await fetch('/api/cameras');
        if (!res.ok) return;
        const data: Camera[] = await res.json();
        setCameras(data);
        // Ne reset la caméra courante que si elle n'existe plus dans la nouvelle liste
        setCurrentCamera((prev) => {
          if (prev && data.some((c) => c.id === prev.id)) return prev;
          return data[0] ?? null;
        });
      } catch {
        // silently fail, no streams available
      }
    };

    void fetchCameras();
    const interval = setInterval(() => void fetchCameras(), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!videoRef.current || !currentCamera) {
      return;
    }

    if (!playerRef.current) {
      playerRef.current = videojs(videoRef.current, {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
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
        sources: [
          {
            src: currentCamera.url,
            type: 'application/x-mpegURL',
          },
        ],
      });
    } else {
      playerRef.current.src({
        src: currentCamera.url,
        type: 'application/x-mpegURL',
      });

      void playerRef.current.play();
    }
  }, [currentCamera]);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Live Escalade Multi-Cam</h1>
        <a href="/admin" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">
          Admin
        </a>
      </div>

      {cameras.length === 0 ? (
        <p className="text-zinc-400">Aucun flux actif pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <div data-vjs-player>
              <video ref={videoRef} className="video-js vjs-big-play-centered" />
            </div>
          </div>

          <div className="space-y-3">
            {cameras.map((camera) => (
              <button
                key={camera.id}
                onClick={() => setCurrentCamera(camera)}
                className={`
                  w-full
                  rounded-xl
                  border
                  p-4
                  text-left
                  transition
                  ${
                    currentCamera?.id === camera.id
                      ? 'border-white bg-white text-black'
                      : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800'
                  }
                `}
              >
                {camera.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
