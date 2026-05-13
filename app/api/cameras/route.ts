import { NextResponse } from 'next/server';

import { listActiveCameraStreams } from '@/lib/backend/cameras';

export const runtime = 'nodejs';

function parseCompetitionId(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const competitionId = parseCompetitionId(url.searchParams.get('competitionId'));
    const cameras = await listActiveCameraStreams(competitionId);

    return NextResponse.json(cameras);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch streams',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
