import { NextResponse } from 'next/server';

import { getBackendApiBase } from '@/lib/auth/backend';
import { clearSessionCookie, getSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

type Params = {
  params: Promise<{
    path: string[];
  }>;
};

async function forward(request: Request, context: Params, method: string) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await context.params;
  if (!Array.isArray(path) || path.length === 0) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(`${getBackendApiBase()}/${path.join('/')}`);
  targetUrl.search = sourceUrl.search;

  const contentType = request.headers.get('content-type');
  const body = method === 'GET' || method === 'DELETE' ? undefined : await request.text();

  try {
    const backendResponse = await fetch(targetUrl, {
      method,
      headers: {
        Authorization: `Bearer ${session.backendToken}`,
        ...(contentType ? { 'Content-Type': contentType } : {}),
      },
      cache: 'no-store',
      body,
    });

    const responseBody = await backendResponse.text();
    const response = new NextResponse(responseBody || null, {
      status: backendResponse.status,
      headers: {
        'content-type': backendResponse.headers.get('content-type') ?? 'application/json',
      },
    });

    if (backendResponse.status === 401) {
      clearSessionCookie(response);
    }

    return response;
  } catch {
    return NextResponse.json({ error: 'Backend admin indisponible.' }, { status: 502 });
  }
}

export async function GET(request: Request, context: Params) {
  return forward(request, context, 'GET');
}

export async function POST(request: Request, context: Params) {
  return forward(request, context, 'POST');
}

export async function PUT(request: Request, context: Params) {
  return forward(request, context, 'PUT');
}

export async function PATCH(request: Request, context: Params) {
  return forward(request, context, 'PATCH');
}

export async function DELETE(request: Request, context: Params) {
  return forward(request, context, 'DELETE');
}