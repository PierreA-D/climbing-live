export type MediaMtxPathStatus = {
  name: string;
  ready: boolean;
  source: string | null;
  readersCount: number;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as UnknownRecord;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function listMediaMtxPaths(apiBaseUrl: string): Promise<MediaMtxPathStatus[]> {
  const response = await fetch(`${apiBaseUrl}/v3/paths/list`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`MediaMTX API unavailable (${response.status})`);
  }

  const payload = (await response.json()) as UnknownRecord;
  const items = Array.isArray(payload.items) ? payload.items : [];

  return items
    .map((item) => {
      const record = asRecord(item);
      if (!record) {
        return null;
      }

      const name = asString(record.name);
      if (!name) {
        return null;
      }

      const readers = Array.isArray(record.readers)
        ? record.readers.length
        : asNumber(record.readersCount);

      return {
        name,
        ready: asBoolean(record.ready),
        source: asString(record.source),
        readersCount: readers,
      } satisfies MediaMtxPathStatus;
    })
    .filter((item): item is MediaMtxPathStatus => item !== null);
}
