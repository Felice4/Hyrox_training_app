import type { ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ChevronLeftIcon, MoveIcon } from '@/components/icons'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import {
  COMBAT_SPORTS,
  COMBAT_SPORT_LABELS,
  DIFFICULTY_LABELS,
  MOVEMENT_GROUP_HINTS,
  MOVEMENT_GROUP_LABELS,
  type CombatSport,
  type Difficulty,
} from '@/data/exercises/vocabulary'
import { exercisesInGroup, originsOf } from '@/domain/movement/library'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { parseGroup } from './format'
import { MovementListItem } from './MovementListItem'

const LEVEL_FILTERS: { value: Difficulty | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle Stufen' },
  { value: 1, label: DIFFICULTY_LABELS[1] },
  { value: 2, label: DIFFICULTY_LABELS[2] },
  { value: 3, label: DIFFICULTY_LABELS[3] },
]

function parseLevel(value: string | null): Difficulty | 'all' {
  return value === '1' || value === '2' || value === '3' ? (Number(value) as Difficulty) : 'all'
}

function parseOrigin(value: string | null): CombatSport | 'all' {
  return (COMBAT_SPORTS as readonly string[]).includes(value ?? '') ? (value as CombatSport) : 'all'
}

/** Übungen einer Gruppe im Movement Lab (`/movement/:group`). */
export function MovementGroupPage() {
  const group = parseGroup(useParams().group)
  const [params, setParams] = useSearchParams()
  const { catalog } = useExerciseCatalog()
  const level = parseLevel(params.get('stufe'))
  const origin = parseOrigin(params.get('herkunft'))

  function updateFilter(patch: { stufe?: string; herkunft?: string }) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value === 'all') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  const backLink = (
    <Link
      to="/movement"
      className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
    >
      <ChevronLeftIcon width={18} height={18} />
      Movement Lab
    </Link>
  )

  if (!group) {
    return (
      <>
        {backLink}
        <EmptyState icon={MoveIcon} title="Gruppe nicht gefunden" />
      </>
    )
  }

  const all = exercisesInGroup(catalog.data?.exercises ?? [], group)
  const origins = originsOf(all)
  const exercises = exercisesInGroup(all, group, { level, origin })
  const query = params.toString()
  const backTo = `/movement/${group}${query ? `?${query}` : ''}`

  return (
    <>
      {backLink}
      <PageHeader title={MOVEMENT_GROUP_LABELS[group]} subtitle={MOVEMENT_GROUP_HINTS[group]} />

      {all.length > 0 && (
        <div className="flex flex-col gap-3">
          <FilterRow label="Stufe">
            {LEVEL_FILTERS.map((f) => (
              <Chip
                key={f.value}
                selected={level === f.value}
                onClick={() => updateFilter({ stufe: String(f.value) })}
              >
                {f.label}
              </Chip>
            ))}
          </FilterRow>
          {origins.length > 0 && (
            <FilterRow label="Herkunft">
              <Chip selected={origin === 'all'} onClick={() => updateFilter({ herkunft: 'all' })}>
                Jede Herkunft
              </Chip>
              {origins.map((sport) => (
                <Chip
                  key={sport}
                  selected={origin === sport}
                  onClick={() => updateFilter({ herkunft: sport })}
                >
                  {COMBAT_SPORT_LABELS[sport]}
                </Chip>
              ))}
            </FilterRow>
          )}
        </div>
      )}

      <section className="mt-5" aria-live="polite">
        {catalog.isPending ? (
          <div role="status" className="flex justify-center py-12">
            <Spinner className="text-accent" />
          </div>
        ) : catalog.isError ? (
          <p role="alert" className="text-sm text-danger">
            Die Übungen konnten nicht geladen werden. Bitte Internetverbindung prüfen.
          </p>
        ) : all.length === 0 ? (
          <EmptyState icon={MoveIcon} title="Noch keine Übungen">
            In dieser Gruppe sind noch keine Übungen – sie kommen nach und nach dazu.
          </EmptyState>
        ) : exercises.length === 0 ? (
          <EmptyState icon={MoveIcon} title="Keine Übungen für diese Auswahl">
            Passe die Filter an.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {exercises.map((exercise) => (
              <li key={exercise.id}>
                <MovementListItem exercise={exercise} backTo={backTo} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  )
}
