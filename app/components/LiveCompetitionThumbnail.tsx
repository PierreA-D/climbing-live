'use client';

import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';

import 'video.js/dist/video-js.css';

type LiveCompetitionThumbnailProps = {
  previewUrl?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
  mode?: 'live' | 'snapshot';
};

export default function LiveCompetitionThumbnail({
  previewUrl,
  fallbackSrc,
  alt,
  className = '',
  mode = 'live',
}: LiveCompetitionThumbnailProps) {
  return (
    <LiveCompetitionThumbnailInner
      key={`${mode}:${previewUrl ?? 'none'}`}
      previewUrl={previewUrl}
      fallbackSrc={fallbackSrc}
      alt={alt}
      className={className}
      mode={mode}
    />
  );
}

function LiveCompetitionThumbnailInner({
  previewUrl,
  fallbackSrc,
  alt,
  className = '',
  mode = 'live',
}: LiveCompetitionThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const snapshotReadyRef = useRef(false);

  useEffect(() => {
    if (!videoRef.current || playerRef.current) {
      return;
    }

    const player = videojs(videoRef.current, {
      autoplay: true,
      controls: false,
      muted: true,
      preload: 'auto',
      responsive: false,
      fluid: false,
      bigPlayButton: false,
      liveui: false,
      userActions: {
        hotkeys: false,
      },
      html5: {
        vhs: {
          overrideNative: true,
          enableLowInitialPlaylist: true,
          limitRenditionByPlayerDimensions: true,
          smoothQualityChange: true,
          llhls: false,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
    });

    playerRef.current = player;
  }, []);

  useEffect(() => {
    snapshotReadyRef.current = false;

    const player = playerRef.current;

    if (!player || player.isDisposed() || !previewUrl) {
      return;
    }

    setHasError(false);
    setIsReady(false);

    player.src({
      src: previewUrl,
      type: 'application/x-mpegURL',
    });

    const freezeSnapshot = () => {
      if (mode !== 'snapshot' || snapshotReadyRef.current) {
        return;
      }

      snapshotReadyRef.current = true;
      requestAnimationFrame(() => {
        player.pause();
        setIsReady(true);
      });
    };

    const handleReady = () => {
      const playPromise = player.play();
      if (playPromise) {
        void playPromise.catch(() => {
          setHasError(true);
        });
      }

      if (mode === 'live') {
        setIsReady(true);
      }
    };

    const handleCanPlay = () => {
      if (mode !== 'snapshot') {
        setIsReady(true);
      }
    };

    const handlePlaying = () => {
      if (mode === 'snapshot') {
        freezeSnapshot();
        return;
      }

      setIsReady(true);
    };

    const handleError = () => {
      setHasError(true);
    };

    player.one('loadedmetadata', handleReady);

    player.on('canplay', handleCanPlay);
    player.on('playing', handlePlaying);
    player.on('error', handleError);

    return () => {
      player.off('canplay', handleCanPlay);
      player.off('playing', handlePlaying);
      player.off('error', handleError);
    };
  }, [previewUrl, mode]);

  const showFallback = !previewUrl || hasError || !isReady;

  return (
    <div className={`relative overflow-hidden bg-zinc-950 ${className}`.trim()}>
      {previewUrl ? (
        <div className={`absolute inset-0 ${showFallback ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
          <div data-vjs-player className="h-full w-full">
            <video
              ref={videoRef}
              className="video-js h-full w-full object-cover"
              muted
              playsInline
              crossOrigin="anonymous"
            />
          </div>
        </div>
      ) : null}

      {fallbackSrc ? (
        <img
          src={fallbackSrc}
          alt={alt}
          className={`h-full w-full object-cover transition-opacity duration-300 ${showFallback ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <div
          aria-label={alt}
          className={`h-full w-full bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.35),_transparent_45%),linear-gradient(135deg,_#27272a,_#09090b)] transition-opacity duration-300 ${showFallback ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}