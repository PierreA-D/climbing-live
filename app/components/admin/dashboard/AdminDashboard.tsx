'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import CompetitionSection from '@/app/components/admin/dashboard/CompetitionSection';
import CompetitionConfiguration, {
  type Camera,
} from '@/app/components/admin/dashboard/CompetitionConfiguration';
import type { BackendStream, Competition } from '@/data/competitions';
import { useCompetitionSection } from '@/app/components/admin/dashboard/useCompetitionSection';

// type Athlete = {
//   id: string;
//   firstName: string;
//   lastName: string;
//   bib: string | null;
//   category: string;
// };

type DeviceWithSecret = {
  id: string;
  token?: string;
};

type CameraProvisionResponse = {
  camera: Camera;
  device: DeviceWithSecret;
  streamKey: string;
};

// const defaultAthleteForm = {
//   firstName: '',
//   lastName: '',
//   bib: '',
//   category: 'open',
// };

const API_BASE = '/api/admin';
const PUBLIC_APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim() ?? '';
const PUBLIC_STREAM_HOST = process.env.NEXT_PUBLIC_STREAM_HOST?.trim() ?? '';

function getAppBaseUrl() {
  if (PUBLIC_APP_BASE_URL) {
    return PUBLIC_APP_BASE_URL.replace(/\/+$/, '');
  }

  return 'http://localhost:3000';
}

function getStreamHost() {
  if (PUBLIC_STREAM_HOST) {
    return PUBLIC_STREAM_HOST;
  }

  return 'localhost';
}

type AdminConsoleProps = {
  userName: string;
};

export default function AdminDashboard({ userName }: AdminConsoleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cameras, setCameras] = useState<Camera[]>([]);
  // const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [streams, setStreams] = useState<BackendStream[]>([]);
  const [deviceTokens, setDeviceTokens] = useState<Record<string, string>>({});
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastRefreshAt, setLastRefreshAt] = useState<string>('');

  // const [newAthlete, setNewAthlete] = useState(defaultAthleteForm);
  const selectedCompetitionIdParam = searchParams.get('competitionId');
  const selectedCompetitionId = selectedCompetitionIdParam ? Number(selectedCompetitionIdParam) : null;

  const refreshAll = useCallback(async () => {
    setErrorMessage('');
    const [camerasRes, athletesRes, competitionsRes, devicesRes, streamsRes] = await Promise.all([
      fetch(`${API_BASE}/cameras`, { cache: 'no-store' }),
      fetch(`${API_BASE}/athletes`, { cache: 'no-store' }),
      fetch(`${API_BASE}/competitions`, { cache: 'no-store' }),
      fetch('/api/backend/devices?includeSecrets=true', { cache: 'no-store' }),
      fetch('/api/backend/streams', { cache: 'no-store' }),
    ]);

    if (!camerasRes.ok || !athletesRes.ok || !competitionsRes.ok) {
      setErrorMessage('Impossible de charger les donnees.');
      return;
    }

    const camerasData: Camera[] = await camerasRes.json();
    // const athletesData: Athlete[] = await athletesRes.json();
    const competitionsData: Competition[] = await competitionsRes.json();
    const streamsData: BackendStream[] = streamsRes.ok ? await streamsRes.json() : [];

    if (devicesRes.ok) {
      const devicesData: DeviceWithSecret[] = await devicesRes.json();
      const tokens: Record<string, string> = {};
      for (const device of devicesData) {
        if (typeof device.id === 'string' && typeof device.token === 'string' && device.token.length > 0) {
          tokens[device.id] = device.token;
        }
      }
      setDeviceTokens(tokens);
    }

    setCameras(camerasData);
    // setAthletes(athletesData);
    setCompetitions(competitionsData);
    setStreams(streamsData);
    setLastRefreshAt(new Date().toISOString());
    setSelectedCamera((prev: Camera | null) => {
      if (!prev) return camerasData[0] ?? null;
      return camerasData.find((camera: Camera) => camera.id === prev.id) ?? camerasData[0] ?? null;
    });
  }, []);

  // const connectedCount = useMemo(() => {
  //   return cameras.filter((camera: Camera) => camera.status === 'online').length;
  // }, [cameras]);

  const competitionSection = useCompetitionSection({
    competitions,
    streams,
    lastRefreshAt,
    refreshAll,
    setErrorMessage,
    onCompetitionCreated: (competition) => {
      setSelectedCamera(null);
      router.replace(`/admin/dashboard?competitionId=${competition.id}&step=onboarding`);
    },
  });

  const selectedCompetition = useMemo(() => {
    if (selectedCompetitionId === null || Number.isNaN(selectedCompetitionId)) {
      return null;
    }

    return competitionSection.competitions.find((competition) => competition.id === selectedCompetitionId) ?? null;
  }, [competitionSection.competitions, selectedCompetitionId]);

  useEffect(() => {
    if (!lastRefreshAt || selectedCompetitionId === null || Number.isNaN(selectedCompetitionId)) {
      return;
    }

    if (!selectedCompetition) {
      router.replace('/admin/dashboard');
    }
  }, [lastRefreshAt, router, selectedCompetition, selectedCompetitionId]);

  const streamDetails = useMemo(() => {
    const fallbackStreamKey = selectedCamera ? deviceTokens[selectedCamera.id] ?? '' : '';

    if (!selectedCamera?.hlsUrl) {
      return {
        path: 'main',
        streamKey: fallbackStreamKey,
        publishPath: fallbackStreamKey ? `main/${fallbackStreamKey}` : 'main',
      };
    }

    try {
      const hls = new URL(selectedCamera.hlsUrl);
      const chunks = hls.pathname.split('/').filter(Boolean);
      const pathChunks = chunks.at(-1) === 'index.m3u8' ? chunks.slice(0, -1) : chunks;
      const [path = 'main', ...streamKeyParts] = pathChunks;
      const streamKey = streamKeyParts.join('/') || fallbackStreamKey;
      const publishPath = streamKey ? `${path}/${streamKey}` : path;

      return {
        path,
        streamKey,
        publishPath,
      };
    } catch {
      return {
        path: 'main',
        streamKey: fallbackStreamKey,
        publishPath: fallbackStreamKey ? `main/${fallbackStreamKey}` : 'main',
      };
    }
  }, [deviceTokens, selectedCamera]);

  useEffect(() => {
    const runRefresh = () => {
      void refreshAll();
    };

    const t = window.setTimeout(runRefresh, 0);
    const i = window.setInterval(runRefresh, 10000);

    return () => {
      window.clearTimeout(t);
      window.clearInterval(i);
    };
  }, [refreshAll]);

  const onboardingUrl = useMemo(() => {
    if (!selectedCamera) {
      return '';
    }

    const path = streamDetails.path;
    const base = getAppBaseUrl();
    if (!base) {
      return '';
    }

    const streamHost = getStreamHost();
    const token = deviceTokens[selectedCamera.id] ?? '';
    const params = new URLSearchParams({
      deviceId: selectedCamera.id,
      path,
      streamHost,
      token,
    });

    return `${base}/onboard?${params.toString()}`;
  }, [deviceTokens, selectedCamera, streamDetails.path]);

  const streamUrls = useMemo(() => {
    if (!selectedCamera) return null;
    const host = getStreamHost();
    const path = streamDetails.path;
    const publishPath = streamDetails.publishPath;
    return {
      path,
      streamKey: streamDetails.streamKey,
      publishPath,
      rtmp: `rtmp://${host}:1935/${path}`,
      rtmpServer: `rtmp://${host}:1935/${path}`,
      rtsp: `rtsp://${host}:8554/${publishPath}`,
      srt: `srt://${host}:8890?streamid=publish:${publishPath}`,
    };
  }, [selectedCamera, streamDetails]);

  useEffect(() => {
    const renderQr = async () => {
      if (!onboardingUrl) {
        setQrDataUrl(null);
        return;
      }

      const dataUrl = await QRCode.toDataURL(onboardingUrl, {
        margin: 1,
        width: 260,
      });
      setQrDataUrl(dataUrl);
    };

    void renderQr();
  }, [onboardingUrl]);

  const createCamera = async () => {
    if (!selectedCompetition) {
      setErrorMessage('Selectionnez une competition avant de creer une camera.');
      return;
    }

    const res = await fetch(`${API_BASE}/cameras/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        competitionId: selectedCompetition.id,
      }),
    });

    if (res.ok) {
      const created = (await res.json()) as CameraProvisionResponse;
      if (created.device.token) {
        setDeviceTokens((prev) => ({ ...prev, [created.device.id]: created.device.token as string }));
      }

      setSelectedCamera(created.camera);
      await refreshAll();
      return;
    }

    setErrorMessage('Creation de camera impossible.');
  };

  const patchCamera = async (id: string, patch: Partial<Pick<Camera, 'authorized' | 'status'>>) => {
    const res = await fetch(`${API_BASE}/cameras/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (res.ok) {
      await refreshAll();
      return;
    }

    setErrorMessage('Mise a jour camera impossible.');
  };

  const deleteCamera = async (id: string) => {
    const res = await fetch(`${API_BASE}/cameras/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      await refreshAll();
      return;
    }

    setErrorMessage('Suppression camera impossible.');
  };

  // const createAthlete = async () => {
  //   const res = await fetch(`${API_BASE}/athletes`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       firstName: newAthlete.firstName,
  //       lastName: newAthlete.lastName,
  //       bib: newAthlete.bib || null,
  //       category: newAthlete.category,
  //     }),
  //   });

  //   if (res.ok) {
  //     setNewAthlete(defaultAthleteForm);
  //     await refreshAll();
  //     return;
  //   }

  //   setErrorMessage('Creation de grimpeur impossible.');
  // };

  // const deleteAthlete = async (id: string) => {
  //   const res = await fetch(`${API_BASE}/athletes/${id}`, {
  //     method: 'DELETE',
  //   });

  //   if (res.ok) {
  //     await refreshAll();
  //     return;
  //   }

  //   setErrorMessage('Suppression de grimpeur impossible.');
  // };

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Admin API Symfony</h1>
            <p className="text-zinc-400">Gestion des cameras, grimpeurs et competitions.</p>
            <p className="mt-1 text-sm text-zinc-500">Session ouverte: {userName}</p>
          </div>
          {selectedCompetition && (
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className="rounded-xl bg-white px-4 py-2 font-semibold text-black">
                Retour au dashboard
              </Link>
            </div>
        )}
        </header>

        {errorMessage ? (
          <div className="rounded-xl border border-red-600/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {/* <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4">
            <p className="text-sm text-zinc-400">Cameras enregistrees</p>
            <p className="text-3xl font-bold">{cameras.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4">
            <p className="text-sm text-zinc-400">Cameras en ligne</p>
            <p className="text-3xl font-bold">{connectedCount}</p>
          </div>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4">
            <p className="text-sm text-zinc-400">Competitions</p>
            <p className="text-3xl font-bold">{competitions.length}</p>
          </div>
        </section> */}

        {selectedCompetition ? (
          <CompetitionConfiguration
            selectedCompetition={selectedCompetition}
            cameras={cameras}
            selectedCamera={selectedCamera}
            qrDataUrl={qrDataUrl}
            selectedCameraToken={selectedCamera ? deviceTokens[selectedCamera.id] ?? '' : ''}
            streamUrls={streamUrls}
            onCreateCamera={() => void createCamera()}
            onToggleAuthorized={(camera) =>
              void patchCamera(camera.id, { authorized: !camera.authorized })
            }
            onViewCamera={(camera) => setSelectedCamera(camera)}
            onDeleteCamera={(cameraId) => void deleteCamera(cameraId)}
          />
        ) : (
          <section className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              <CompetitionSection
                competition={competitionSection}
                activeCompetitionId={selectedCompetition?.id ?? null}
                onOpenCompetition={(competitionId) => {
                  setSelectedCamera(null);
                  router.replace(`/admin/dashboard?competitionId=${competitionId}&step=onboarding`);
                }}
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
