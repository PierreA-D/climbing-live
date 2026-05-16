import { randomBytes, randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { getBackendApiBase } from '@/app/features/auth/server/backend';
import { getSession } from '@/app/features/auth/server/session';
import { rememberApiCameraDevice } from '@/lib/backend/camera-api';

export const runtime = 'nodejs';

type ProvisionCameraPayload = {
  competitionId?: unknown;
};

type CreatedDevice = {
  id: string;
  token?: string;
};

function getStreamHost() {
  const publicHost = process.env.NEXT_PUBLIC_STREAM_HOST?.trim();
  if (publicHost) {
    return publicHost;
  }

  return 'localhost';
}

function generateCameraId() {
  return `cam-${Date.now()}-${randomUUID().slice(0, 6)}`;
}

function buildStreamPath(competitionId: number, cameraName: string) {
  return `${competitionId}-${cameraName}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateStreamKey() {
  return randomBytes(32).toString('hex');
}

function parseCompetitionId(value: unknown): number | null {
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

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as ProvisionCameraPayload | null;
  const competitionId = parseCompetitionId(payload?.competitionId);

  if (!competitionId) {
    return NextResponse.json({ error: 'competitionId is required' }, { status: 400 });
  }

  const cameraId = generateCameraId();
  const cameraName = cameraId;
  const streamPath = buildStreamPath(competitionId, cameraName);
  const streamKey = generateStreamKey();
  const publishPath = `${streamPath}/${streamKey}`;
  const streamHost = getStreamHost();
  const cameraPayloadBase = {
    id: cameraId,
    name: cameraName,
    location: '',
    hlsUrl: `http://${streamHost}:8888/${publishPath}/index.m3u8`,
    rtmpUrl: `rtmp://${streamHost}:1935/${streamPath}`,
    status: 'offline',
    authorized: true,
  };

  const cameraResponse = await fetch(`${getBackendApiBase()}/cameras`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.backendToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      ...cameraPayloadBase,
      competition: `/api/competitions/${competitionId}`,
    }),
  });

  if (!cameraResponse.ok) {
    const body = await cameraResponse.text();
    return new NextResponse(body || JSON.stringify({ error: 'Camera creation failed' }), {
      status: cameraResponse.status,
      headers: {
        'content-type': cameraResponse.headers.get('content-type') ?? 'application/json',
      },
    });
  }

  const createdCameraText = await cameraResponse.text();
  let createdCamera: Record<string, unknown> = cameraPayloadBase;

  if (createdCameraText) {
    try {
      createdCamera = JSON.parse(createdCameraText) as Record<string, unknown>;
    } catch {
      createdCamera = cameraPayloadBase;
    }
  }

  const createdDevice: CreatedDevice = {
    id: cameraId,
    token: streamKey,
  };

  rememberApiCameraDevice(createdCamera);

  return NextResponse.json({
    camera: createdCamera,
    device: createdDevice,
    streamKey,
  }, { status: 201 });
}