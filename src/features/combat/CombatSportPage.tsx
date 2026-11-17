import type { ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import { ChevronLeftIcon, ChevronRightIcon, GloveIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import {
  COMBAT_LEVEL_LABELS,
  COMBAT_SPORT_LABELS,
  GI_MODE_LABELS,
  type CombatSport,
  type Difficulty,
} from '@/data/exercises/vocabulary'
import { drillsForSport, groupByLevel, type GiFilter } from '@/domain/combat/drills'
import { useArchivedCustomExercises, useSetArchived } from '@/features/exercises/useExerciseActions'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { drillDosage, parseSport } from './format'

const LEVEL_FILTERS: { value: Difficulty | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle Stufen' },
  { value: 1, label: COMBAT_LEVEL_LABELS[1] },
  { value: 2, label: COMBAT_LEVEL_LABELS[2] },
  { value: 3, label: COMBAT_LEVEL_LABELS[3] },
]

const GI_FILTERS: { value: GiFilter; label: string }[] = [
  { value: 'all', label: 'Gi & NoGi' },
  { value: 'gi', label: 'Gi' },
  { value: 'nogi', label: 'NoGi' },
]

function parseLevel(value: string | null): Difficulty | 'all' {
  return value === '1' || value === '2' || value === '3' ? (Number(value) as Difficulty) : 'all'
}

function parseGi(value: string | null): GiFilter {
  return value === 'gi' || value === 'nogi' ? value : 'all'
}

/** Drills einer Kampfsportart, gruppiert nach Stufe (`/combat/:sport`). */
export function CombatSportPage() {
  const sport = parseSport(useParams().sport)
  const [params, setParams] = useSearchParams()
  const { catalog } = useExerciseCatalog()
  const level = parseLevel(params.get('stufe'))
  const gi = parseGi(params.get('gi'))

  function updateFilter(patch: { stufe?: string; gi?: string }) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value === 'all') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  const backLink = (
    <Link
      to="/combat"
      className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
    >
      <ChevronLeftIcon width={18} height={18} />
      Kampfsport
    </Link>
  )

  if (!sport) {
    return (
      <>
        {backLink}
        <EmptyState icon={GloveIcon} title="Sportart nicht gefunden" />
      </>
    )
  }

  const drills = drillsForSport(catalog.data?.exercises ?? [], sport, { level, gi })
  const groups = groupByLevel(drills)
  const query = params.toString()

  return (
    <>
      {backLink}
      <PageHeader title={COMBAT_SPORT_LABELS[sport]} />

      <div className="flex flex-col gap-3">
        <Link
          to={`/combat/${sport}/new`}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-5 font-semibold text-on-accent shadow-glow transition duration-200 hover:bg-accent-strong active:scale-[0.97]"
        >
          + Eigenen Drill anlegen
        </Link>
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
        {sport === 'bjj' && (
          <FilterRow label="Gi oder NoGi">
            {GI_FILTERS.map((f) => (
              <Chip
                key={f.value}
                selected={gi === f.value}
                onClick={() => updateFilter({ gi: f.value })}
              >
                {f.label}
              </Chip>
            ))}
          </FilterRow>
        )}
      </div>

      <section className="mt-5 flex flex-col gap-5" aria-live="polite">
        {catalog.isPending ? (
          <div role="status" className="flex justify-center py-12">
            <Spinner className="text-accent" />
          </div>
        ) : catalog.isError ? (
          <p role="alert" className="text-sm text-danger">
            Die Drills konnten nicht geladen werden. Bitte Internetverbindung prüfen.
          </p>
        ) : groups.length === 0 ? (
          <EmptyState icon={GloveIcon} title="Keine Drills für diese Auswahl">
            Passe die Filter an oder lege einen eigenen Drill an.
          </EmptyState>
        ) : (
          groups.map((group) => (
            <div key={group.level}>
              <h2 className="mb-2 eyebrow">{COMBAT_LEVEL_LABELS[group.level]}</h2>
              <ul className="flex flex-col gap-2">
                {group.drills.map((drill) => (
                  <li key={drill.id}>
                    <DrillListItem drill={drill} sport={sport} query={query} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <ArchivedDrills sport={sport} />
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

function DrillListItem({
  drill,
  sport,
  query,
}: {
  drill: CatalogExercise
  sport: CombatSport
  query: string
}) {
  return (
    <Link
      to={`/combat/${sport}/drill/${drill.slug}`}
      state={{ backTo: `/combat/${sport}${query ? `?${query}` : ''}` }}
      className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-raised"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{drill.name}</p>
        <p className="truncate text-sm text-fg-muted">{drillDosage(drill.loadParams)}</p>
      </div>
      {drill.source === 'custom' && <Badge tone="accent">Eigener</Badge>}
      {sport === 'bjj' && drill.giMode && drill.giMode !== 'both' && (
        <Badge>{GI_MODE_LABELS[drill.giMode]}</Badge>
      )}
      <ChevronRightIcon width={20} height={20} className="shrink-0 text-fg-muted" />
    </Link>
  )
}

/** Archivierte eigene Drills dieser Sportart – lassen sich wiederherstellen. */
function ArchivedDrills({ sport }: { sport: CombatSport }) {
  const archived = useArchivedCustomExercises()
  const restore = useSetArchived()
  const drills = (archived.data ?? []).filter(
    (e) => e.category === 'combat' && e.combatSports.includes(sport),
  )
  if (drills.length === 0) return null
  return (
    <Card className="mt-6 p-4">
      <h2 className="mb-1 font-semibold">Archivierte eigene Drills</h2>
      <p className="mb-2 text-xs text-fg-muted">
        Gespeicherte Trainings mit diesen Drills bleiben erhalten.
      </p>
      <ul className="divide-y divide-line">
        {drills.map((drill) => (
          <li key={drill.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 truncate">{drill.name}</span>
            <Button
              variant="secondary"
              className="min-h-10 shrink-0 px-3 text-sm"
              disabled={restore.isPending}
              onClick={() => restore.mutate({ id: drill.id, archived: false })}
            >
              Wiederherstellen
            </Button>
          </li>
        ))}
      </ul>
      {restore.isError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          Wiederherstellen fehlgeschlagen. Bitte versuche es erneut.
        </p>
      )}
    </Card>
  )
}
