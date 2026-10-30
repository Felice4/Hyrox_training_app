import { Link, useSearchParams } from 'react-router'
import { BookIcon, ChevronRightIcon, SearchIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SelectField, type SelectOption } from '@/components/ui/SelectField'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import type { CatalogExercise } from '@/api/exercises'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  HYROX_STATION_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  PREFERENCE_LABELS,
} from '@/data/exercises/vocabulary'
import { ArchivedExercises } from './ArchivedExercises'
import {
  EMPTY_FILTER,
  filterExercises,
  isFilterActive,
  parseExerciseFilter,
  toSearchParams,
  type ExerciseFilter,
} from './filter'
import { useExerciseCatalog } from './useExerciseCatalog'

const byLabel = (a: SelectOption<string>, b: SelectOption<string>) =>
  a.label.localeCompare(b.label, 'de')

const MUSCLE_OPTIONS: SelectOption<ExerciseFilter['muscle']>[] = [
  { value: 'all', label: 'Alle Muskeln' },
  ...MUSCLE_GROUPS.map((m) => ({ value: m, label: MUSCLE_GROUP_LABELS[m] })).sort(byLabel),
]

const EQUIPMENT_OPTIONS: SelectOption<ExerciseFilter['equipment']>[] = [
  { value: 'all', label: 'Alle Geräte' },
  { value: 'none', label: 'Ohne Geräte' },
  ...EQUIPMENT.map((e) => ({ value: e, label: EQUIPMENT_LABELS[e] })).sort(byLabel),
]

export function ExerciseListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseExerciseFilter(searchParams)
  const { catalog, isSyncing } = useExerciseCatalog()

  const exercises = catalog.data?.exercises
  const visible = exercises ? filterExercises(exercises, filter) : []

  function updateFilter(patch: Partial<ExerciseFilter>) {
    setSearchParams(toSearchParams({ ...filter, ...patch }), { replace: true })
  }

  return (
    <>
      <PageHeader
        title="Übungen"
        subtitle={exercises ? `${exercises.length} Übungen in deiner Bibliothek` : 'Bibliothek'}
      />

      <div className="flex flex-col gap-3">
        <Link
          to="/exercises/new"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-5 font-semibold text-on-accent"
        >
          + Eigene Übung anlegen
        </Link>
        <TextField
          label="Übung suchen"
          type="search"
          enterKeyHint="search"
          placeholder="z. B. Kniebeuge, Sled, Rudern"
          value={filter.query}
          onChange={(event) => updateFilter({ query: event.target.value })}
          trailing={<SearchIcon className="mr-3 text-fg-muted" width={20} height={20} />}
        />

        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
          role="group"
          aria-label="Kategorie"
        >
          <Chip
            selected={filter.category === 'all'}
            onClick={() => updateFilter({ category: 'all' })}
          >
            Alle
          </Chip>
          {CATEGORIES.map((category) => (
            <Chip
              key={category}
              selected={filter.category === category}
              onClick={() => updateFilter({ category })}
            >
              {CATEGORY_LABELS[category]}
            </Chip>
          ))}
        </div>

        <div className="flex gap-3">
          <SelectField
            label="Muskelgruppe"
            value={filter.muscle}
            options={MUSCLE_OPTIONS}
            onChange={(muscle) => updateFilter({ muscle })}
          />
          <SelectField
            label="Gerät"
            value={filter.equipment}
            options={EQUIPMENT_OPTIONS}
            onChange={(equipment) => updateFilter({ equipment })}
          />
        </div>
      </div>

      <section className="mt-5" aria-live="polite">
        {catalog.isPending ? (
          <div role="status" className="flex flex-col items-center gap-3 py-12 text-fg-muted">
            <Spinner className="text-accent" />
            <span className="text-sm">
              {isSyncing ? 'Übungsbibliothek wird eingerichtet …' : 'Übungen werden geladen …'}
            </span>
          </div>
        ) : catalog.isError ? (
          <EmptyState icon={BookIcon} title="Übungen konnten nicht geladen werden">
            <p>Bitte Internetverbindung prüfen.</p>
            <Button
              variant="secondary"
              className="mt-4"
              loading={catalog.isFetching}
              onClick={() => void catalog.refetch()}
            >
              Erneut versuchen
            </Button>
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState icon={SearchIcon} title="Keine Übung gefunden">
            <p>Passe die Suche oder die Filter an.</p>
            {isFilterActive(filter) && (
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => setSearchParams(toSearchParams(EMPTY_FILTER), { replace: true })}
              >
                Filter zurücksetzen
              </Button>
            )}
          </EmptyState>
        ) : (
          <>
            {isFilterActive(filter) && (
              <p className="mb-2 text-sm text-fg-muted">
                {visible.length} von {exercises?.length ?? 0} Übungen
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {visible.map((exercise) => (
                <li key={exercise.id}>
                  <ExerciseListItem exercise={exercise} filterParams={searchParams.toString()} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <ArchivedExercises />
    </>
  )
}

function ExerciseListItem({
  exercise,
  filterParams,
}: {
  exercise: CatalogExercise
  filterParams: string
}) {
  const muscles = exercise.primaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m]).join(', ')
  return (
    <Link
      to={`/exercises/${exercise.slug}`}
      state={{ backTo: `/exercises${filterParams ? `?${filterParams}` : ''}` }}
      className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-raised"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{exercise.name}</p>
        <p className="truncate text-sm text-fg-muted">
          {CATEGORY_LABELS[exercise.category]} · {muscles}
        </p>
      </div>
      {exercise.source === 'custom' && <Badge tone="accent">Eigene</Badge>}
      {exercise.preference !== 'neutral' && <Badge>{PREFERENCE_LABELS[exercise.preference]}</Badge>}
      {exercise.hyroxStation && (
        <Badge tone="hyrox">{HYROX_STATION_LABELS[exercise.hyroxStation]}</Badge>
      )}
      <ChevronRightIcon width={20} height={20} className="shrink-0 text-fg-muted" />
    </Link>
  )
}
