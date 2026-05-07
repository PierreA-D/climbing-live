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

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return null;
}

function getReadyFlag(record: UnknownRecord): boolean {
  return asBoolean(record.ready) || asBoolean(record.sourceReady) || asBoolean(record.hasSource);
}

function getSourceValue(record: UnknownRecord): string | null {
  return firstString(record.source, record.sourceType, record.sourceId);
}

function getReadersCount(record: UnknownRecord): number {
  if (Array.isArray(record.readers)) {
    return record.readers.length;
  }

  return Math.max(asNumber(record.readersCount), asNumber(record.numReaders));
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

      return {
        name,
        ready: getReadyFlag(record),
        source: getSourceValue(record),
        readersCount: getReadersCount(record),
      } satisfies MediaMtxPathStatus;
    })
    .filter((item): item is MediaMtxPathStatus => item !== null);
}
