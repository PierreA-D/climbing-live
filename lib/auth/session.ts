import { createHmac, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const AUTH_COOKIE_NAME = 'climbing_live_admin_session';

const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type AdminSession = {
  email: string;
  name: string;
  role: 'admin';
  backendToken: string;
  expiresAt: string;
  exp: number;
};

type SessionCookieOptions = Parameters<NextResponse['cookies']['set']>[2];

function getSessionSecret(): string {
  return process.env.AUTH_SESSION_SECRET?.trim() || process.env.APP_SECRET?.trim() || 'climbing-live-dev-session-secret';
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

function sign(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('hex');
}

function getCookieOptions(maxAge: number): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export function createSessionToken(session: Omit<AdminSession, 'exp'>): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = encodeBase64Url(JSON.stringify({ ...session, exp }));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function readSessionToken(token: string | undefined): AdminSession | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split('.', 2);
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);
  const providedBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  const decoded = decodeBase64Url(payload);
  if (!decoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoded) as Partial<AdminSession>;

    if (
      typeof parsed.email !== 'string' ||
      typeof parsed.name !== 'string' ||
      parsed.role !== 'admin' ||
      typeof parsed.backendToken !== 'string' ||
      typeof parsed.expiresAt !== 'string' ||
      typeof parsed.exp !== 'number' ||
      parsed.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return parsed as AdminSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, getCookieOptions(SESSION_TTL_SECONDS));
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', getCookieOptions(0));
}