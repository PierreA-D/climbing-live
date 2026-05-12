'use client';

import type { CompetitionCategory } from '@/app/components/admin/dashboard/types';
import type { CompetitionSectionController } from '@/app/components/admin/dashboard/useCompetitionSection';
import Select from "react-select";
import { selectStyles } from "@/styles/selectStyles";
import ReactCountryFlag from "react-country-flag";

import countries from "i18n-iso-countries";
import fr from "i18n-iso-countries/langs/fr.json";

countries.registerLocale(fr);

const countryOptions = Object.entries(
  countries.getNames("fr")
).map(([code, name]) => ({
  value: name,
  label: (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <ReactCountryFlag countryCode={code} svg />
      {name}
    </div>
  ),
}));

type CompetitionSectionProps = {
  competition: CompetitionSectionController;
  activeCompetitionId?: number | null;
  onOpenCompetition: (competitionId: number) => void;
};

const competitionCategories: CompetitionCategory[] = ['block', 'speed', 'difficulty', 'team'];

export default function CompetitionSection({
  competition,
  activeCompetitionId = null,
  onOpenCompetition,
}: CompetitionSectionProps) {
  const {
    isCompetitionFormOpen,
    toggleCompetitionForm,
    newCompetition,
    setNewCompetition,
    scheduleCompetition,
    setScheduleCompetition,
    competitionFormIsValid,
    competitions,
    createCompetition,
    deleteCompetition,
    formatCompetitionDate,
  } = competition;

  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Compétitions</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Créez d'abord une compétition pour lancer un live sur la plateforme.
          </p>
        </div>
        <button
          onClick={toggleCompetitionForm}
          className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-100"
        >
          {isCompetitionFormOpen ? 'Fermer le formulaire' : 'Nouvelle compétition'}
        </button>
      </div>

      {isCompetitionFormOpen ? (
        <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-950/60 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={newCompetition.name}
              onChange={(e) =>
                setNewCompetition((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Nom compétition"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <Select
              placeholder="Location"
              options={countryOptions}
              value={
                countryOptions.find(
                  (c) => c.value === newCompetition.location
                ) || null
              }
              onChange={(selected) =>
                setNewCompetition((prev) => ({
                  ...prev,
                  location: selected?.value || "",
                }))
              }
              styles={selectStyles}
            />
            <label className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={scheduleCompetition}
                onChange={(e) => setScheduleCompetition(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-900"
              />
              Programmer la compétition
            </label>
            <label className="flex flex-col gap-2 text-sm text-zinc-300">
              <span>Catégorie</span>
              <select
                value={newCompetition.category}
                onChange={(e) =>
                  setNewCompetition((prev) => ({
                    ...prev,
                    category: e.target.value as CompetitionCategory,
                  }))
                }
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
              >
                {competitionCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            {scheduleCompetition ? (
              <label className="flex flex-col gap-2 text-sm text-zinc-300 md:col-span-2">
                <span>Début</span>
                <input
                  type="datetime-local"
                  value={newCompetition.startAt}
                  onChange={(e) =>
                    setNewCompetition((prev) => ({ ...prev, startAt: e.target.value }))
                  }
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"
                />
              </label>
            ) : null}
          </div>
          <button
            onClick={() => void createCompetition()}
            disabled={!competitionFormIsValid}
            className="mt-4 rounded-xl bg-white px-4 py-2 font-semibold text-black disabled:cursor-not-allowed disabled:bg-zinc-500"
          >
            Ajouter compétition
          </button>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {competitions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950/40 px-4 py-6 text-sm text-zinc-400">
            Aucune compétition pour le moment.
          </div>
        ) : (
          competitions.map((competition) => (
            <div
              key={competition.id}
              className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-100">{competition.name}</p>
                    <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[11px] uppercase tracking-wide text-zinc-300">
                      {competition.resolvedStatus}
                    </span>
                    <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-orange-200">
                      {competition.category ?? 'sans categorie'}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400">
                    {competition.location ? `${competition.location} · ` : ''}
                    Debut: {formatCompetitionDate(competition.startAt)}
                    {competition.endAt ? ` · Fin: ${formatCompetitionDate(competition.endAt)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onOpenCompetition(competition.id)}
                    className={`rounded-lg border px-2 py-1 text-xs ${
                      activeCompetitionId === competition.id
                        ? 'border-white bg-white text-black'
                        : 'border-zinc-600 text-zinc-100'
                    }`}
                  >
                    Configuration
                  </button>
                  <button
                    onClick={() => void deleteCompetition(competition.id.toString())}
                    className="rounded-lg border border-red-500/60 px-2 py-1 text-xs text-red-300"
                  >
                    supprimer
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
