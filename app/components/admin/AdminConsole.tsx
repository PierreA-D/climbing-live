'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';

type Device = {
  id: string;
  name: string;
  token?: string;
  authorized: boolean;
  blocked: boolean;
  allowedPaths: string[];
  status: 'online' | 'offline';
  lastSeenAt: string | null;
  lastIp: string | null;
  currentPath: string | null;
};

type Settings = {
  mediamtxApiUrl: string;
  hlsBaseUrl: string;
  requireDeviceAuth: boolean;
  allowUnknownDevices: boolean;
  autoRegisterUnknownDevices: boolean;
  autoAuthorizeNewDevices: boolean;
  exposeOnlyAuthorizedPaths: boolean;
  maxDevices: number;
  maxConnectedDevices: number;
  deviceOfflineAfterMs: number;
  pollIntervalMs: number;
  enablePublish: boolean;
  enableRead: boolean;
};

const defaultSettings: Settings = {
  mediamtxApiUrl: 'http://localhost:9997',
  hlsBaseUrl: 'http://localhost:8888',
  requireDeviceAuth: true,
  allowUnknownDevices: false,
  autoRegisterUnknownDevices: false,
  autoAuthorizeNewDevices: false,
  exposeOnlyAuthorizedPaths: false,
  maxDevices: 200,
  maxConnectedDevices: 20,
  deviceOfflineAfterMs: 45000,
  pollIntervalMs: 10000,
  enablePublish: true,
  enableRead: true,
};

function CopyRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
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

export default function AdminConsole() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connected, setConnected] = useState<Device[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPaths, setNewPaths] = useState('main');

  const refreshAll = useCallback(async () => {
    const [devicesRes, connectedRes, settingsRes] = await Promise.all([
      fetch('/api/backend/devices?includeSecrets=true'),
      fetch('/api/backend/devices/connected'),
      fetch('/api/backend/settings'),
    ]);

      if (devicesRes.ok) {
        const data: Device[] = await devicesRes.json();
        setDevices(data);
        if (data.length > 0 && !selectedDevice) {
          setSelectedDevice(data[0]);
        }
      }

      if (connectedRes.ok) {
        const data: Device[] = await connectedRes.json();
        setConnected(data);
      }

    if (settingsRes.ok) {
      const data: Settings = await settingsRes.json();
      setSettings(data);
    }
  }, [selectedDevice]);

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
    if (!selectedDevice || !selectedDevice.token) {
      return '';
    }

    if (typeof window === 'undefined') {
      return '';
    }

    const path = selectedDevice.allowedPaths[0] ?? 'main';
    const base = window.location.origin;
    const params = new URLSearchParams({
      deviceId: selectedDevice.id,
      token: selectedDevice.token,
      path,
    });

    return `${base}/onboard?${params.toString()}`;
  }, [selectedDevice]);

  const streamUrls = useMemo(() => {
    if (typeof window === 'undefined' || !selectedDevice) return null;
    const host = window.location.hostname;
    const path = selectedDevice.allowedPaths[0] ?? 'main';
    return {
      path,
      rtmp: `rtmp://${host}:1935/${path}`,
      rtmpServer: `rtmp://${host}:1935/`,
      rtsp: `rtsp://${host}:8554/${path}`,
      srt: `srt://${host}:8890?streamid=publish:${path}`,
    };
  }, [selectedDevice]);

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

  const createDevice = async () => {
    const allowedPaths = newPaths
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const res = await fetch('/api/backend/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newId || undefined,
        name: newName || undefined,
        authorized: true,
        allowedPaths,
      }),
    });

    if (res.ok) {
      setNewId('');
      setNewName('');
      setNewPaths('main');
      await refreshAll();
    }
  };

  const patchDevice = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/backend/devices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (res.ok) {
      await refreshAll();
    }
  };

  const saveSettings = async () => {
    const res = await fetch('/api/backend/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (res.ok) {
      await refreshAll();
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Admin Flux</h1>
            <p className="text-zinc-400">Gestion des appareils, des autorisations, et des settings backend.</p>
          </div>
          <Link href="/" className="rounded-xl bg-white px-4 py-2 font-semibold text-black">
            Retour au live
          </Link>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4">
            <p className="text-sm text-zinc-400">Appareils enregistrés</p>
            <p className="text-3xl font-bold">{devices.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4">
            <p className="text-sm text-zinc-400">Appareils connectés</p>
            <p className="text-3xl font-bold">{connected.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4">
            <p className="text-sm text-zinc-400">Etat</p>
            <p className="text-xl font-semibold">Actif</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/30 p-4">
              <h2 className="text-xl font-semibold">Ajouter un appareil</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  placeholder="id-appareil"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nom"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
                <input
                  value={newPaths}
                  onChange={(e) => setNewPaths(e.target.value)}
                  placeholder="main,bloc1"
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
              </div>
              <button
                onClick={() => void createDevice()}
                className="mt-3 rounded-xl bg-white px-4 py-2 font-semibold text-black"
              >
                Creer appareil
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/30 p-4">
              <h2 className="text-xl font-semibold">Appareils</h2>
              <div className="mt-3 space-y-3">
                {devices.map((d) => (
                  <div key={d.id} className="rounded-xl border border-zinc-700 bg-zinc-950/80 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-xs text-zinc-400">{d.id}</p>
                        <p className="text-xs text-zinc-400">
                          Flux: {d.allowedPaths.join(', ') || 'tous'} | Statut: {d.status}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void patchDevice(d.id, { authorized: !d.authorized })}
                          className="rounded-lg border border-zinc-600 px-3 py-1 text-sm"
                        >
                          {d.authorized ? 'Retirer autorisation' : 'Autoriser'}
                        </button>
                        <button
                          onClick={() => void patchDevice(d.id, { blocked: !d.blocked })}
                          className="rounded-lg border border-zinc-600 px-3 py-1 text-sm"
                        >
                          {d.blocked ? 'Debloquer' : 'Bloquer'}
                        </button>
                        <button
                          onClick={() => setSelectedDevice(d)}
                          className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-black"
                        >
                          QR onboarding
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/30 p-4">
              <h2 className="text-xl font-semibold">Settings backend</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.requireDeviceAuth}
                    onChange={(e) => setSettings((s) => ({ ...s, requireDeviceAuth: e.target.checked }))}
                  />
                  Auth appareil obligatoire
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.allowUnknownDevices}
                    onChange={(e) => setSettings((s) => ({ ...s, allowUnknownDevices: e.target.checked }))}
                  />
                  Autoriser appareils inconnus
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.autoRegisterUnknownDevices}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, autoRegisterUnknownDevices: e.target.checked }))
                    }
                  />
                  Auto-enregistrer inconnus
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.autoAuthorizeNewDevices}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, autoAuthorizeNewDevices: e.target.checked }))
                    }
                  />
                  Auto-autoriser nouveaux
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.exposeOnlyAuthorizedPaths}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, exposeOnlyAuthorizedPaths: e.target.checked }))
                    }
                  />
                  Exposer seulement flux autorises
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.enablePublish}
                    onChange={(e) => setSettings((s) => ({ ...s, enablePublish: e.target.checked }))}
                  />
                  Autoriser publication
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.enableRead}
                    onChange={(e) => setSettings((s) => ({ ...s, enableRead: e.target.checked }))}
                  />
                  Autoriser lecture
                </label>
                <label className="text-sm">
                  Max appareils
                  <input
                    type="number"
                    value={settings.maxDevices}
                    onChange={(e) => setSettings((s) => ({ ...s, maxDevices: Number(e.target.value) || 1 }))}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  Max connectes
                  <input
                    type="number"
                    value={settings.maxConnectedDevices}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, maxConnectedDevices: Number(e.target.value) || 1 }))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  Offline timeout (ms)
                  <input
                    type="number"
                    value={settings.deviceOfflineAfterMs}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, deviceOfflineAfterMs: Number(e.target.value) || 5000 }))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  Polling UI (ms)
                  <input
                    type="number"
                    value={settings.pollIntervalMs}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, pollIntervalMs: Number(e.target.value) || 1000 }))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                  />
                </label>
              </div>
              <button
                onClick={() => void saveSettings()}
                className="mt-4 rounded-xl bg-white px-4 py-2 font-semibold text-black"
              >
                Sauvegarder settings
              </button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4">
              <h2 className="text-xl font-semibold">QR code onboarding</h2>
              {selectedDevice ? (
                <>
                  <p className="mt-2 text-sm text-zinc-400">Appareil: {selectedDevice.id}</p>
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
                <p className="mt-2 text-sm text-zinc-400">Selectionnez un appareil pour generer le QR.</p>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4">
              <h2 className="text-lg font-semibold">Sans QR code</h2>
              {!selectedDevice ? (
                <p className="mt-2 text-sm text-zinc-400">Selectionnez un appareil pour afficher les credentials.</p>
              ) : (
                <div className="mt-3 space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Identifiants</p>
                    <CopyRow label="Utilisateur (user)" value={selectedDevice.id} />
                    <CopyRow label="Cle de stream (stream key)" value={streamUrls?.path ?? 'main'} />
                    <CopyRow label="Mot de passe (token)" value={selectedDevice.token ?? '—'} />
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
                        <CopyRow label="Utilisateur" value={selectedDevice.id} />
                        <CopyRow label="Mot de passe" value={selectedDevice.token ?? '—'} />
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
