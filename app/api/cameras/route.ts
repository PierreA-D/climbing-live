import { NextResponse } from 'next/server';

const MEDIAMTX_API = process.env.MEDIAMTX_API_URL ?? 'http://localhost:9997';
const HLS_BASE = process.env.HLS_BASE_URL ?? 'http://localhost:8888';

type MediaMTXPath = {
  name: string;
  ready: boolean;
};

type MediaMTXPathsResponse = {
  items: MediaMTXPath[];
};

export async function GET() {
  try {
    const res = await fetch(`${MEDIAMTX_API}/v3/paths/list`, {
      next: { revalidate: 5 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'MediaMTX unreachable' }, { status: 502 });
    }

    const data: MediaMTXPathsResponse = await res.json();

    const cameras = data.items
      .filter((p) => p.ready)
      .map((p) => ({
        id: p.name,
        name: p.name,
        url: `${HLS_BASE}/${p.name}/index.m3u8`,
      }));

    return NextResponse.json(cameras);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 });
  }
}
