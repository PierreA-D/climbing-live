import { getBackendApiBase } from '@/app/features/auth/server/backend';
import { listActiveCameraStreams } from '@/lib/backend/cameras';

export type CompetitionStatus = 'scheduled' | 'live' | 'finished';
export type CompetitionCategory = 'block' | 'speed' | 'difficulty' | 'team';

export type PublicCompetition = {
  id: number;
  name: string;
  image?: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  status: CompetitionStatus | string | null;
  category: CompetitionCategory | string | null;
  viewers?: number | null;
  previewUrl?: string | null;
};

function resolveCompetitionStatus(competition: Pick<PublicCompetition, 'startAt'>, now: Date, hasRtmpStream: boolean): CompetitionStatus {
  const startAt = new Date(competition.startAt);
  const startAtTime = Number.isNaN(startAt.getTime()) ? now.getTime() : startAt.getTime();

  if (startAtTime > now.getTime()) {
    return 'scheduled';
  }

  if (hasRtmpStream) {
    return 'live';
  }

  return 'finished';
}

function normalizeCompetitionCollection(payload: unknown): PublicCompetition[] {
  if (Array.isArray(payload)) {
    return payload as PublicCompetition[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const apiPlatformMembers = (payload as { 'hydra:member'?: unknown })['hydra:member'];
  if (Array.isArray(apiPlatformMembers)) {
    return apiPlatformMembers as PublicCompetition[];
  }

  const members = (payload as { member?: unknown }).member;
  if (Array.isArray(members)) {
    return members as PublicCompetition[];
  }

  return [];
}

export async function listCompetitions(): Promise<PublicCompetition[]> {
  try {
    const response = await fetch(`${getBackendApiBase()}/competitions`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as unknown;
    return normalizeCompetitionCollection(payload);
  } catch {
    return [];
  }
}

export async function listLiveCompetitions(): Promise<PublicCompetition[]> {
  const competitions = await listCompetitions();
  const now = new Date();
  const liveCameras = await listActiveCameraStreams().catch(() => []);
  const previewUrl = liveCameras[0]?.url ?? null;

  return competitions
    .map((competition) => ({
      ...competition,
      status: resolveCompetitionStatus(competition, now, liveCameras.length > 0),
      previewUrl,
    }))
    .filter((competition) => competition.status === 'live');
}