'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';

type CompetitionStatus = 'scheduled' | 'live' | 'finished';

type Camera = {
  id: string;
  name: string;
  location: string | null;
  hlsUrl: string | null;
  rtmpUrl: string | null;
  status: 'online' | 'offline' | string;
  authorized: boolean;
};

type Athlete = {
  id: string;
  firstName: string;
  lastName: string;
  bib: string | null;
  category: string;
};

type Competition = {
  id: string;
  name: string;
  location: string | null;
  status: CompetitionStatus | string;
};

type CopyRowProps = {
  label: string;
  value: string;
  mono?: boolean;
};

type DeviceWithSecret = {
  id: string;
  token?: string;
};

const defaultAthleteForm = {
  firstName: '',
  lastName: '',
  bib: '',
  category: 'open',
};

const defaultCompetitionForm = {
  name: '',
  location: '',
  startAt: '',
  status: 'scheduled' as CompetitionStatus,
};

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

type AdminConsoleProps = {
  userName: string;
};

export default function AdminConsole({ userName }: AdminConsoleProps) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [deviceTokens, setDeviceTokens] = useState<Record<string, string>>({});
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [newAthlete, setNewAthlete] = useState(defaultAthleteForm);
  const [newCompetition, setNewCompetition] = useState(defaultCompetitionForm);

  const generateStreamKey = () => {
    return `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`.substring(0, 32);
  };

  const generateCameraId = () => {
    return `cam-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  const refreshAll = useCallback(async () => {
    setErrorMessage('');
    const [camerasRes, athletesRes, competitionsRes, devicesRes] = await Promise.all([
      fetch(`${API_BASE}/cameras`, { cache: 'no-store' }),
      fetch(`${API_BASE}/athletes`, { cache: 'no-store' }),
      fetch(`${API_BASE}/competitions`, { cache: 'no-store' }),
      fetch('/api/backend/devices?includeSecrets=true', { cache: 'no-store' }),
    ]);

    if (!camerasRes.ok || !athletesRes.ok || !competitionsRes.ok) {
      setErrorMessage('Impossible de charger les donnees de la console admin securisee.');
      return;
    }

    const camerasData: Camera[] = await camerasRes.json();
    const athletesData: Athlete[] = await athletesRes.json();
    const competitionsData: Competition[] = await competitionsRes.json();

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
    setAthletes(athletesData);
    setCompetitions(competitionsData);

    setSelectedCamera((prev: Camera | null) => {
      if (!prev) return camerasData[0] ?? null;
      return camerasData.find((camera: Camera) => camera.id === prev.id) ?? camerasData[0] ?? null;
    });
  }, []);

  const connectedCount = useMemo(() => {
    return cameras.filter((camera: Camera) => camera.status === 'online').length;
  }, [cameras]);

  const firstCameraPath = useMemo(() => {
    if (!selectedCamera?.hlsUrl) return 'main';
    try {
      const hls = new URL(selectedCamera.hlsUrl);
      const chunks = hls.pathname.split('/').filter(Boolean);
      return chunks[0] ?? 'main';
    } catch {
      return 'main';
    }
  }, [selectedCamera]);

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

    const path = firstCameraPath;
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
  }, [deviceTokens, firstCameraPath, selectedCamera]);

  const streamUrls = useMemo(() => {
    if (!selectedCamera) return null;
    const host = getStreamHost();
    const path = firstCameraPath;
    return {
      path,
      rtmp: `rtmp://${host}:1935/${path}`,
      rtmpServer: `rtmp://${host}:1935/`,
      rtsp: `rtsp://${host}:8554/${path}`,
      srt: `srt://${host}:8890?streamid=publish:${path}`,
    };
  }, [firstCameraPath, selectedCamera]);

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
    const cameraId = generateCameraId();
    const streamKey = generateStreamKey();

    const host = getStreamHost();

    const hlsUrl = `http://${host}:8888/${streamKey}/index.m3u8`;
    const rtmpUrl = `rtmp://${host}:1935/${streamKey}`;

    const newCameraData = {
      id: cameraId,
      name: cameraId,
      location: '',
      hlsUrl,
      rtmpUrl,
      status: 'offline' as const,
      authorized: true,
    };

    const res = await fetch(`${API_BASE}/cameras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCameraData),
    });

    const deviceRes = await fetch('/api/backend/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: cameraId,
        name: cameraId,
        authorized: true,
        allowedPaths: [streamKey],
      }),
    });

    if (deviceRes.ok) {
      const createdDevice = (await deviceRes.json()) as DeviceWithSecret;
      if (createdDevice.token) {
        setDeviceTokens((prev) => ({ ...prev, [cameraId]: createdDevice.token as string }));
      }
    }

    if (res.ok) {
      // Selectionner la nouvelle camera immediatement
      setSelectedCamera(newCameraData as Camera);
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

  const createAthlete = async () => {
    const res = await fetch(`${API_BASE}/athletes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: newAthlete.firstName,
        lastName: newAthlete.lastName,
        bib: newAthlete.bib || null,
        category: newAthlete.category,
      }),
    });

    if (res.ok) {
      setNewAthlete(defaultAthleteForm);
      await refreshAll();
      return;
    }

    setErrorMessage('Creation de grimpeur impossible.');
  };

  const deleteAthlete = async (id: string) => {
    const res = await fetch(`${API_BASE}/athletes/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      await refreshAll();
      return;
    }

    setErrorMessage('Suppression de grimpeur impossible.');
  };

  const createCompetition = async () => {
    const res = await fetch(`${API_BASE}/competitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newCompetition.name,
        location: newCompetition.location || '',
        startAt: newCompetition.startAt
          ? new Date(newCompetition.startAt).toISOString()
          : new Date().toISOString(),
        status: newCompetition.status,
      }),
    });

    if (res.ok) {
      setNewCompetition(defaultCompetitionForm);
      await refreshAll();
      return;
    }

    setErrorMessage('Creation de competition impossible.');
  };

  const patchCompetitionStatus = async (id: string, status: CompetitionStatus) => {
    const res = await fetch(`${API_BASE}/competitions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      await refreshAll();
      return;
    }

    setErrorMessage('Mise a jour competition impossible.');
  };

  const deleteCompetition = async (id: string) => {
    const res = await fetch(`${API_BASE}/competitions/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      await refreshAll();
      return;
    }

    setErrorMessage('Suppression competition impossible.');
  };

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Admin API Symfony</h1>
            <p className="text-zinc-400">Gestion des cameras, grimpeurs et competitions.</p>
            <p className="mt-1 text-sm text-zinc-500">Session ouverte: {userName}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-xl bg-white px-4 py-2 font-semibold text-black">
              Retour au live
            </Link>
          </div>
        </header>

        {errorMessage ? (
          <div className="rounded-xl border border-red-600/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
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
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/30 p-4">
              <h2 className="text-xl font-semibold">Ajouter une camera</h2>
              <p className="mt-2 text-sm text-zinc-400">
                ID, cle de stream et URLs seront generes automatiquement. Scannez le QR code pour configurer l appareil.
              </p>
              <button
                onClick={() => void createCamera()}
                className="mt-4 rounded-xl bg-white px-6 py-2 font-semibold text-black hover:bg-zinc-100"
              >
                + Creer une camera
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/30 p-4">
              <h2 className="text-xl font-semibold">Cameras</h2>
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
                          onClick={() =>
                            void patchCamera(camera.id, { authorized: !camera.authorized })
                          }
                          className="rounded-lg border border-zinc-600 px-3 py-1 text-sm"
                        >
                          {camera.authorized ? 'Retirer autorisation' : 'Autoriser'}
                        </button>
                        <button
                          onClick={() =>
                            void patchCamera(camera.id, {
                              status: camera.status === 'online' ? 'offline' : 'online',
                            })
                          }
                          className="rounded-lg border border-zinc-600 px-3 py-1 text-sm"
                        >
                          {camera.status === 'online' ? 'Passer offline' : 'Passer online'}
                        </button>
                        <button
                          onClick={() => setSelectedCamera(camera)}
                          className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-black"
                        >
                          QR onboarding
                        </button>
                        <button
                          onClick={() => void deleteCamera(camera.id)}
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

            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/30 p-4">
              <h2 className="text-xl font-semibold">Grimpeurs</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  value={newAthlete.firstName}
                  onChange={(e) => setNewAthlete((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Prenom"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
                <input
                  value={newAthlete.lastName}
                  onChange={(e) => setNewAthlete((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Nom"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
                <input
                  value={newAthlete.bib}
                  onChange={(e) => setNewAthlete((prev) => ({ ...prev, bib: e.target.value }))}
                  placeholder="Dossard"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
                <input
                  value={newAthlete.category}
                  onChange={(e) => setNewAthlete((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Categorie"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
              </div>
              <button
                onClick={() => void createAthlete()}
                className="mt-4 rounded-xl bg-white px-4 py-2 font-semibold text-black"
              >
                Ajouter grimpeur
              </button>

              <div className="mt-4 space-y-2">
                {athletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2"
                  >
                    <p className="text-sm">
                      {athlete.firstName} {athlete.lastName} - {athlete.category}
                      {athlete.bib ? ` (dossard ${athlete.bib})` : ''}
                    </p>
                    <button
                      onClick={() => void deleteAthlete(athlete.id)}
                      className="rounded-lg border border-red-500/60 px-3 py-1 text-xs text-red-300"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/30 p-4">
              <h2 className="text-xl font-semibold">Competitions</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  value={newCompetition.name}
                  onChange={(e) => setNewCompetition((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom competition"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
                <input
                  value={newCompetition.location}
                  onChange={(e) =>
                    setNewCompetition((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="Lieu"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
                <input
                  type="datetime-local"
                  value={newCompetition.startAt}
                  onChange={(e) =>
                    setNewCompetition((prev) => ({ ...prev, startAt: e.target.value }))
                  }
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
                <select
                  value={newCompetition.status}
                  onChange={(e) =>
                    setNewCompetition((prev) => ({
                      ...prev,
                      status: e.target.value as CompetitionStatus,
                    }))
                  }
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                >
                  <option value="scheduled">scheduled</option>
                  <option value="live">live</option>
                  <option value="finished">finished</option>
                </select>
              </div>
              <button
                onClick={() => void createCompetition()}
                className="mt-4 rounded-xl bg-white px-4 py-2 font-semibold text-black"
              >
                Ajouter competition
              </button>

              <div className="mt-4 space-y-2">
                {competitions.map((competition) => (
                  <div
                    key={competition.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2"
                  >
                    <p className="text-sm">
                      {competition.name} - {competition.status}
                      {competition.location ? ` (${competition.location})` : ''}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void patchCompetitionStatus(competition.id, 'scheduled')}
                        className="rounded-lg border border-zinc-600 px-2 py-1 text-xs"
                      >
                        scheduled
                      </button>
                      <button
                        onClick={() => void patchCompetitionStatus(competition.id, 'live')}
                        className="rounded-lg border border-zinc-600 px-2 py-1 text-xs"
                      >
                        live
                      </button>
                      <button
                        onClick={() => void patchCompetitionStatus(competition.id, 'finished')}
                        className="rounded-lg border border-zinc-600 px-2 py-1 text-xs"
                      >
                        finished
                      </button>
                      <button
                        onClick={() => void deleteCompetition(competition.id)}
                        className="rounded-lg border border-red-500/60 px-2 py-1 text-xs text-red-300"
                      >
                        supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                  <p className="mt-3 break-all text-xs text-zinc-400">{onboardingUrl}</p>
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
                    <CopyRow label="Mot de passe RTMP" value={deviceTokens[selectedCamera.id] ?? 'non-defini'} />
                    <CopyRow label="Cle de stream (stream key)" value={streamUrls?.path ?? 'main'} />
                    <p className="text-xs text-zinc-400">
                      Important: dans l'app RTMP, le nom d'utilisateur doit etre l'ID de la camera, pas la cle de stream.
                    </p>
                    <CopyRow
                      label="HLS"
                      value={selectedCamera.hlsUrl ?? `http://localhost:8888/${streamUrls?.path ?? 'main'}/index.m3u8`}
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
                        <CopyRow label="Cle de stream (stream key)" value={streamUrls.path} />
                      </div>
                    </>
                  )}

                  {onboardingUrl && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Lien onboarding</p>
                      <CopyRow label="Partager par message / mail" value={onboardingUrl} mono={false} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
