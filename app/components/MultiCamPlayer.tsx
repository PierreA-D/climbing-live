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

const cameras: Camera[] = [
  {
    id: 'main',
    name: 'Vue principale',
    url: 'http://localhost:8888/main/index.m3u8',
  },
  {
    id: 'bloc1',
    name: 'Bloc 1',
    url: 'http://localhost:8888/bloc1/index.m3u8',
  },
  {
    id: 'bloc2',
    name: 'Bloc 2',
    url: 'http://localhost:8888/bloc2/index.m3u8',
  },
];

export default function MultiCamPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const [currentCamera, setCurrentCamera] = useState<Camera>(cameras[0]);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    if (!playerRef.current) {
      playerRef.current = videojs(videoRef.current, {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        liveui: true,
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
      <h1 className="mb-6 text-3xl font-bold">Live Escalade Multi-Cam</h1>

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
                  currentCamera.id === camera.id
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
    </div>
  );
}
