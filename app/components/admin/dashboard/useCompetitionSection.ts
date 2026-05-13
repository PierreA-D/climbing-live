'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type {
  BackendStream,
  Competition,
  CompetitionCategory,
  CompetitionFormState,
  CompetitionStatus,
  CompetitionWithResolvedStatus,
} from '@/data/competitions';

const API_BASE = '/api/admin';

const defaultCompetitionForm: CompetitionFormState = {
  name: '',
  location: '',
  startAt: '',
  endAt: '',
  category: 'block' as CompetitionCategory,
};

function formatCompetitionDate(value: string | null) {
  if (!value) {
    return 'Non defini';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Non defini';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
}

function hasLiveRtmpStream(streams: BackendStream[]) {
  return streams.some(
    (stream) => stream.authorized && (stream.ready || stream.readersCount > 0 || stream.source !== null)
  );
}

function resolveCompetitionStatus(
  competition: Pick<Competition, 'startAt'>,
  now: Date,
  hasRtmpStream: boolean
): CompetitionStatus {
  const startAt = new Date(competition.startAt);
  const startAtTime = Number.isNaN(startAt.getTime()) ? now.getTime() : startAt.getTime();

  if (startAtTime > now.getTime()) {
    return 'scheduled';
  }

  if (hasRtmpStream) {
    return 'live';
  }

  return 'finished';
}

type UseCompetitionSectionOptions = {
  competitions: Competition[];
  streams: BackendStream[];
  lastRefreshAt: string;
  refreshAll: () => Promise<void>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  onCompetitionCreated?: (competition: Competition) => void;
};

export type CompetitionSectionController = {
  isCompetitionFormOpen: boolean;
  toggleCompetitionForm: () => void;
  newCompetition: CompetitionFormState;
  setNewCompetition: Dispatch<SetStateAction<CompetitionFormState>>;
  scheduleCompetition: boolean;
  setScheduleCompetition: Dispatch<SetStateAction<boolean>>;
  competitionFormIsValid: boolean;
  competitions: CompetitionWithResolvedStatus[];
  createCompetition: () => Promise<void>;
  deleteCompetition: (id: string) => Promise<void>;
  formatCompetitionDate: (value: string | null) => string;
};

export function useCompetitionSection({
  competitions,
  streams,
  lastRefreshAt,
  refreshAll,
  setErrorMessage,
  onCompetitionCreated,
}: UseCompetitionSectionOptions): CompetitionSectionController {
  const [isCompetitionFormOpen, setIsCompetitionFormOpen] = useState(true);
  const [scheduleCompetition, setScheduleCompetition] = useState(false);
  const [newCompetition, setNewCompetition] = useState<CompetitionFormState>(defaultCompetitionForm);
  const isSyncingCompetitionStatuses = useRef(false);

  const hasRtmpStream = useMemo(() => hasLiveRtmpStream(streams), [streams]);

  const competitionFormIsValid = useMemo(() => {
    if (!newCompetition.name.trim()) {
      return false;
    }

    const now = new Date();
    const effectiveStartAt = scheduleCompetition && newCompetition.startAt ? new Date(newCompetition.startAt) : now;

    if (scheduleCompetition) {
      if (!newCompetition.startAt) {
        return false;
      }

      if (effectiveStartAt.getTime() <= now.getTime()) {
        return false;
      }
    }

    if (!newCompetition.endAt) {
      return true;
    }

    return new Date(newCompetition.endAt).getTime() >= effectiveStartAt.getTime();
  }, [newCompetition.endAt, newCompetition.name, newCompetition.startAt, scheduleCompetition]);

  const competitionsWithResolvedStatus = useMemo(() => {
    const now = lastRefreshAt ? new Date(lastRefreshAt) : new Date();

    return competitions.map((competition) => ({
      ...competition,
      resolvedStatus: resolveCompetitionStatus(competition, now, hasRtmpStream),
    }));
  }, [competitions, hasRtmpStream, lastRefreshAt]);

  useEffect(() => {
    if (isSyncingCompetitionStatuses.current || competitions.length === 0) {
      return;
    }

    const updates = competitionsWithResolvedStatus.filter(
      (competition) => competition.status !== competition.resolvedStatus
    );

    if (updates.length === 0) {
      return;
    }

    let cancelled = false;

    const syncCompetitionStatuses = async () => {
      isSyncingCompetitionStatuses.current = true;

      try {
        for (const competition of updates) {
          const response = await fetch(`${API_BASE}/competitions/${competition.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: competition.resolvedStatus }),
          });

          if (!response.ok) {
            if (!cancelled) {
              setErrorMessage('Mise a jour automatique du statut competition impossible.');
            }
            return;
          }
        }

        if (!cancelled) {
          await refreshAll();
        }
      } finally {
        isSyncingCompetitionStatuses.current = false;
      }
    };

    void syncCompetitionStatuses();

    return () => {
      cancelled = true;
    };
  }, [competitions, competitionsWithResolvedStatus, refreshAll, setErrorMessage]);

  const createCompetition = async () => {
    if (!competitionFormIsValid) {
      setErrorMessage('Renseignez un nom, une date de debut future si la competition est programmee, et une date de fin coherente.');
      return;
    }

    const createdAt = new Date();
    const effectiveStartAt = scheduleCompetition && newCompetition.startAt
      ? new Date(newCompetition.startAt)
      : createdAt;
    const status = resolveCompetitionStatus(
      { startAt: effectiveStartAt.toISOString() },
      createdAt,
      hasRtmpStream
    );

    const response = await fetch(`${API_BASE}/competitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newCompetition.name.trim(),
        location: newCompetition.location.trim() || null,
        startAt: effectiveStartAt.toISOString(),
        endAt: newCompetition.endAt ? new Date(newCompetition.endAt).toISOString() : null,
        status,
        category: newCompetition.category,
      }),
    });

    if (!response.ok) {
      setErrorMessage('Creation de competition impossible.');
      return;
    }

    const createdCompetition = (await response.json()) as Competition;

    setNewCompetition(defaultCompetitionForm);
    setScheduleCompetition(false);
    setIsCompetitionFormOpen(false);
    await refreshAll();
    onCompetitionCreated?.(createdCompetition);
  };

  const deleteCompetition = async (id: string) => {
    const response = await fetch(`${API_BASE}/competitions/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      setErrorMessage('Suppression competition impossible.');
      return;
    }

    setIsCompetitionFormOpen(competitions.length <= 1);
    await refreshAll();
  };

  return {
    isCompetitionFormOpen,
    toggleCompetitionForm: () => setIsCompetitionFormOpen((prev) => !prev),
    newCompetition,
    setNewCompetition,
    scheduleCompetition,
    setScheduleCompetition,
    competitionFormIsValid,
    competitions: competitionsWithResolvedStatus,
    createCompetition,
    deleteCompetition,
    formatCompetitionDate,
  };
}
