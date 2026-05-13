import MultiCamPlayer from '@/app/components/MultiCamPlayer';
import { listActiveCameraStreams } from '@/lib/backend/cameras';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function parseCompetitionId(value: string | string[] | undefined): number | null {
    const rawValue = Array.isArray(value) ? value[0] : value;
    if (!rawValue) {
        return null;
    }

    const parsedValue = Number(rawValue);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return parsedValue;
}

export default async function MulticamPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParams> | SearchParams;
}) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const competitionId = parseCompetitionId(resolvedSearchParams?.competitionId);
    const cameras = await listActiveCameraStreams(competitionId).catch(() => []);

    return (
        <MultiCamPlayer initialCameras={cameras} />
    );
}