import { NextResponse } from 'next/server';

import { listActiveCameraStreams } from '@/lib/backend/cameras';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const cameras = await listActiveCameraStreams();

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
