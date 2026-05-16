import { NextResponse } from 'next/server';

import { getBackendApiBase } from '@/app/features/auth/server/backend';
import { createSessionToken, setSessionCookie } from '@/app/features/auth/server/session';

export const runtime = 'nodejs';

type LoginPayload = {
  email?: string;
  password?: string;
};

type BackendLoginResponse = {
  token?: string;
  expiresAt?: string;
  user?: {
    email?: string;
    name?: string;
    role?: 'admin';
  };
  error?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as LoginPayload | null;
  const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
  const password = typeof payload?.password === 'string' ? payload.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 });
  }

  try {
    const backendResponse = await fetch(`${getBackendApiBase()}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({ email, password }),
    });

    const result = (await backendResponse.json().catch(() => null)) as BackendLoginResponse | null;

    if (!backendResponse.ok) {
      const status =
        backendResponse.status === 401 || backendResponse.status === 400 || backendResponse.status === 403
          ? backendResponse.status
          : 502;
      return NextResponse.json(
        { error: result?.error ?? 'Connexion impossible.' },
        { status },
      );
    }

    if (
      typeof result?.token !== 'string' ||
      typeof result?.expiresAt !== 'string' ||
      typeof result.user?.email !== 'string' ||
      typeof result.user?.name !== 'string' ||
      result.user.role !== 'admin'
    ) {
      return NextResponse.json({ error: 'Réponse de connexion invalide.' }, { status: 502 });
    }

    const response = NextResponse.json({
      user: {
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    });

    setSessionCookie(
      response,
      createSessionToken({
        email: result.user.email,
        name: result.user.name,
        role: 'admin',
        backendToken: result.token,
        expiresAt: result.expiresAt,
      }),
    );

    return response;
  } catch {
    return NextResponse.json({ error: 'Connexion indisponible.' }, { status: 502 });
  }
}