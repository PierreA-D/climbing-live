import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ApiCamera = {
  id: string;
  name: string;
  status?: string;
  hlsUrl?: string | null;
};

export async function GET() {
  try {
    const apiBaseUrl = 'http://localhost:8000/api';
    const response = await fetch(`${apiBaseUrl}/cameras`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch cameras from backend API',
          status: response.status,
        },
        { status: 502 }
      );
    }

    const data = (await response.json()) as ApiCamera[];
    const cameras = data
      .map((camera) => ({
        id: camera.id,
        name: camera.name,
        url: camera.hlsUrl ?? '',
        status: camera.status ?? 'offline',
      }))
      .filter((camera) => camera.url.length > 0)
      .filter((camera) => camera.status === 'online');

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
