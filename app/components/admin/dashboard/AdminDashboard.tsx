'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

type AdminDashboardData = {
  cameras: Camera[];
  competitions: Competition[];
  streams: BackendStream[];
  deviceTokens: Record<string, string>;
};

// const defaultAthleteForm = {
//   firstName: '',
//   lastName: '',
//   bib: '',
//   category: 'open',
// };

const API_BASE = '/api/admin';
const ADMIN_DASHBOARD_QUERY_KEY = ['admin-dashboard'] as const;
const PUBLIC_APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim() ?? '';
const PUBLIC_STREAM_HOST = process.env.NEXT_PUBLIC_STREAM_HOST?.trim() ?? '';

function toDeviceTokenMap(devices: DeviceWithSecret[]) {
  const tokens: Record<string, string> = {};
  for (const device of devices) {
    if (typeof device.id === 'string' && typeof device.token === 'string' && device.token.length > 0) {
      tokens[device.id] = device.token;
    }
  }

  return tokens;
}

function getCameraStreamKey(camera: Camera): string {
  if (!camera.hlsUrl) {
    return '';
  }

  try {
    const hls = new URL(camera.hlsUrl);
    const chunks = hls.pathname.split('/').filter(Boolean);
    const pathChunks = chunks.at(-1) === 'index.m3u8' ? chunks.slice(0, -1) : chunks;
    return pathChunks.slice(1).join('/');
  } catch {
    return '';
  }
}

function toCameraTokenMap(cameras: Camera[]) {
  const tokens: Record<string, string> = {};

  for (const camera of cameras) {
    const token = getCameraStreamKey(camera);
    if (token) {
      tokens[camera.id] = token;
    }
  }

  return tokens;
}

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function parseCompetitionIdFromStreamPath(urlValue: unknown): number | null {
  if (typeof urlValue !== 'string' || !urlValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(urlValue);
    const chunks = parsedUrl.pathname.split('/').filter(Boolean);
    const candidate = chunks.find((chunk) => /^\d+-/.test(chunk));
    if (!candidate) {
      return null;
    }

    const [competitionIdPart] = candidate.split('-', 1);
    return parsePositiveInteger(competitionIdPart);
  } catch {
    return null;
  }
}

function resolveCameraCompetitionId(camera: Camera): number | null {
  const rawCamera = camera as unknown as Record<string, unknown>;

  const directCompetitionId = parsePositiveInteger(rawCamera.competitionId ?? rawCamera.competition_id);
  if (directCompetitionId !== null) {
    return directCompetitionId;
  }

  const competitionValue = rawCamera.competition;
  if (typeof competitionValue === 'string') {
    const matched = /\/competitions\/(\d+)$/.exec(competitionValue);
    if (matched) {
      return parsePositiveInteger(matched[1]);
    }
  }

  if (competitionValue && typeof competitionValue === 'object') {
    const nestedId = parsePositiveInteger((competitionValue as { id?: unknown }).id);
    if (nestedId !== null) {
      return nestedId;
    }
  }

  return parseCompetitionIdFromStreamPath(camera.hlsUrl) ?? parseCompetitionIdFromStreamPath(camera.rtmpUrl);
}

async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  const [camerasRes, competitionsRes, devicesRes, streamsRes] = await Promise.all([
    fetch(`${API_BASE}/cameras`, { cache: 'no-store' }),
    fetch(`${API_BASE}/competitions`, { cache: 'no-store' }),
    fetch('/api/backend/devices?includeSecrets=true', { cache: 'no-store' }),
    fetch('/api/backend/streams', { cache: 'no-store' }),
  ]);

  if (!camerasRes.ok || !competitionsRes.ok) {
    throw new Error('Impossible de charger les donnees.');
  }

  const cameras = (await camerasRes.json()) as Camera[];
  const competitions = (await competitionsRes.json()) as Competition[];
  const streams = streamsRes.ok ? ((await streamsRes.json()) as BackendStream[]) : [];
  const deviceTokens = {
    ...toCameraTokenMap(cameras),
    ...(devicesRes.ok ? toDeviceTokenMap((await devicesRes.json()) as DeviceWithSecret[]) : {}),
  };

  return {
    cameras,
    competitions,
    streams,
    deviceTokens,
  };
}

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
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // const [newAthlete, setNewAthlete] = useState(defaultAthleteForm);
  const selectedCompetitionIdParam = searchParams.get('competitionId');
  const selectedCompetitionId = selectedCompetitionIdParam ? Number(selectedCompetitionIdParam) : null;

  const dashboardQuery = useQuery({
    queryKey: ADMIN_DASHBOARD_QUERY_KEY,
    queryFn: fetchAdminDashboardData,
    refetchInterval: 10000,
  });

  const cameras = dashboardQuery.data?.cameras ?? [];
  const competitions = dashboardQuery.data?.competitions ?? [];
  const streams = dashboardQuery.data?.streams ?? [];
  const deviceTokens = dashboardQuery.data?.deviceTokens ?? {};
  const camerasForSelectedCompetition = useMemo(() => {
    if (selectedCompetitionId === null || Number.isNaN(selectedCompetitionId)) {
      return cameras;
    }

    return cameras.filter((camera: Camera) => resolveCameraCompetitionId(camera) === selectedCompetitionId);
  }, [cameras, selectedCompetitionId]);
  const lastRefreshAt = dashboardQuery.dataUpdatedAt
    ? new Date(dashboardQuery.dataUpdatedAt).toISOString()
    : '';

  const invalidateDashboard = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ADMIN_DASHBOARD_QUERY_KEY,
      refetchType: 'active',
    });
  }, [queryClient]);

  useEffect(() => {
    setSelectedCamera((prev: Camera | null) => {
      const activeCameraList = selectedCompetitionId === null || Number.isNaN(selectedCompetitionId)
        ? cameras
        : camerasForSelectedCompetition;

      if (activeCameraList.length === 0) {
        return null;
      }

      if (!prev) {
        return activeCameraList[0] ?? null;
      }

      return activeCameraList.find((camera: Camera) => camera.id === prev.id) ?? activeCameraList[0] ?? null;
    });
  }, [cameras, camerasForSelectedCompetition, selectedCompetitionId]);

  // const connectedCount = useMemo(() => {
  //   return cameras.filter((camera: Camera) => camera.status === 'online').length;
  // }, [cameras]);

  const competitionSection = useCompetitionSection({
    competitions,
    streams,
    lastRefreshAt,
    invalidateDashboard,
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
    if (!dashboardQuery.data || selectedCompetitionId === null || Number.isNaN(selectedCompetitionId)) {
      return;
    }

    if (!selectedCompetition) {
      router.replace('/admin/dashboard');
    }
  }, [dashboardQuery.data, router, selectedCompetition, selectedCompetitionId]);

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

  const createCameraMutation = useMutation({
    mutationFn: async (competitionId: number) => {
      const response = await fetch(`${API_BASE}/cameras/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionId }),
      });

      if (!response.ok) {
        throw new Error('Creation de camera impossible.');
      }

      return (await response.json()) as CameraProvisionResponse;
    },
    onMutate: () => {
      setErrorMessage('');
    },
    onSuccess: async (created: CameraProvisionResponse) => {
      setSelectedCamera(created.camera);
      await invalidateDashboard();
    },
    onError: () => {
      setErrorMessage('Creation de camera impossible.');
    },
  });

  const patchCameraMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Camera, 'authorized' | 'status'>>;
    }) => {
      const response = await fetch(`${API_BASE}/cameras/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        throw new Error('Mise a jour camera impossible.');
      }
    },
    onMutate: () => {
      setErrorMessage('');
    },
    onSuccess: async () => {
      await invalidateDashboard();
    },
    onError: () => {
      setErrorMessage('Mise a jour camera impossible.');
    },
  });

  const deleteCameraMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/cameras/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Suppression camera impossible.');
      }
    },
    onMutate: () => {
      setErrorMessage('');
    },
    onSuccess: async () => {
      await invalidateDashboard();
    },
    onError: () => {
      setErrorMessage('Suppression camera impossible.');
    },
  });

  const createCamera = async () => {
    if (!selectedCompetition) {
      setErrorMessage('Selectionnez une competition avant de creer une camera.');
      return;
    }

    await createCameraMutation.mutateAsync(selectedCompetition.id);
  };

  const patchCamera = async (id: string, patch: Partial<Pick<Camera, 'authorized' | 'status'>>) => {
    await patchCameraMutation.mutateAsync({ id, patch });
  };

  const deleteCamera = async (id: string) => {
    await deleteCameraMutation.mutateAsync(id);
  };

  const displayErrorMessage = errorMessage || (dashboardQuery.isError ? 'Impossible de charger les donnees.' : '');

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

        {displayErrorMessage ? (
          <div className="rounded-xl border border-red-600/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            {displayErrorMessage}
          </div>
        ) : null}

        {dashboardQuery.isLoading && !dashboardQuery.data ? (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300">
            Chargement du dashboard admin...
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
            cameras={camerasForSelectedCompetition}
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
