export function getBackendApiBase(): string {
  const raw =
    process.env.API_URL?.trim() ||
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    'http://localhost:8000/api';

  return raw.replace(/\/+$/, '');
}