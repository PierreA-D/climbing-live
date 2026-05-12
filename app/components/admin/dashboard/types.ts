export type CompetitionStatus = 'scheduled' | 'live' | 'finished';

export type CompetitionCategory = 'block' | 'speed' | 'difficulty' | 'team';

export type Competition = {
  id: number;
  name: string;
  location: string | null;
  startAt: string;
  endAt: string | null;
  status: CompetitionStatus | string | null;
  category: CompetitionCategory | string | null;
};

export type CompetitionFormState = {
  name: string;
  location: string;
  startAt: string;
  endAt: string;
  category: CompetitionCategory;
};

export type CompetitionWithResolvedStatus = Competition & {
  resolvedStatus: CompetitionStatus;
};

export type BackendStream = {
  name: string;
  ready: boolean;
  source: string | null;
  readersCount: number;
  authorized: boolean;
};
