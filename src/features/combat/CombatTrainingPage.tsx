import { useState } from 'react'
import { Link } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import { ChevronLeftIcon, GloveIcon, SearchIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import {
  COMBAT_LEVEL_LABELS,
  COMBAT_SPORTS,
  COMBAT_SPORT_LABELS,
  type CombatSport,
} from '@/data/exercises/vocabulary'
import { drillsForSport, isCombatDrill } from '@/domain/combat/drills'
import {
  addDrill,
  buildCombatWorkout,
  EMPTY_COMBAT_PLAN,
  moveItem,
  removeItem,
  type CombatMode,
  type CombatPlanItem,
} from '@/domain/combat/workout'
import { normalizeSearch } from '@/features/exercises/filter'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { useStartTraining } from '@/features/training/useStartTraining'
import { formatDurationClock } from '@/lib/time'
import { useCombatPlan } from './useCombatPlan'

const MODES: { value: CombatMode; label: string }[] = [
  { value: 'sequence', label: 'Drill für Drill' },
  { value: 'circuit', label: 'Zirkel (Runden)' },
]

const kgFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

/** Kampfsport-Training aus Drills mehrerer Sportarten zusammenstellen (`/combat/training`). */
export function CombatTrainingPage() {
  const { catalog } = useExerciseCatalog()
  const exercises = catalog.data?.exercises ?? []
  const { plan, update } = useCombatPlan()
  const start = useStartTraining(exercises)
  const [picking, setPicking] = useState(false)

  const workout = buildCombatWorkout(plan)
  const circuit = plan.mode === 'circuit' && plan.items.length > 1

  function patchItem(index: number, patch: Partial<CombatPlanItem>) {
    update((p) => ({
      ...p,
      items: p.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }

  return (
    <>
      <Link
        to="/combat"
        className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
      >
        <ChevronLeftIcon width={18} height={18} />
        Kampfsport
      </Link>
      <PageHeader
        title="Kampfsport-Training"
        subtitle="Drills aus allen Sportarten kombinieren und im Trainingsmodus absolvieren."
      />

      {catalog.isPending ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : catalog.isError ? (
        <p role="alert" className="text-sm text-danger">
          Die Drills konnten nicht geladen werden. Bitte Internetverbindung prüfen.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {plan.items.length === 0 && !picking && (
            <EmptyState icon={GloveIcon} title="Noch keine Drills gewählt">
              Füge Drills hinzu – hier oder über „Zum Training hinzufügen“ bei einem Drill.
            </EmptyState>
          )}

          {plan.items.length > 0 && (
            <ol className="flex flex-col gap-3">
              {plan.items.map((item, index) => (
                <li key={item.slug}>
                  <PlanItemCard
                    item={item}
                    index={index}
                    count={plan.items.length}
                    circuit={circuit}
                    onChange={(patch) => patchItem(index, patch)}
                    onMove={(offset) => update((p) => moveItem(p, index, offset))}
                    onRemove={() => update((p) => removeItem(p, index))}
                  />
                </li>
              ))}
            </ol>
          )}

          {picking ? (
            <DrillPicker
              exercises={exercises}
              selected={plan.items.map((i) => i.slug)}
              onPick={(drill) => update((p) => addDrill(p, drill))}
              onClose={() => setPicking(false)}
            />
          ) : (
            <Button variant="secondary" onClick={() => setPicking(true)}>
              + Drill hinzufügen
            </Button>
          )}

          {plan.items.length > 1 && (
            <Card className="flex flex-col gap-4">
              <SingleChoiceChips
                label="Ablauf"
                hint={
                  plan.mode === 'circuit'
                    ? 'Alle Drills im Wechsel, Runde für Runde. Pause nach dem letzten Drill einer Runde.'
                    : 'Jeder Drill mit seinen Sätzen, dann der nächste.'
                }
                options={MODES}
                value={plan.mode}
                onChange={(mode) => update((p) => ({ ...p, mode }))}
              />
              {plan.mode === 'circuit' && (
                <CompactStepper
                  label="Runden"
                  value={plan.rounds}
                  min={2}
                  max={20}
                  onChange={(rounds) => update((p) => ({ ...p, rounds }))}
                />
              )}
            </Card>
          )}

          {workout && (
            <Card className="flex flex-col gap-3">
              <p className="text-sm text-fg-muted">
                {workout.title} · etwa {workout.estimatedDurationMin} min
              </p>
              <Button fullWidth className="min-h-14 text-lg" onClick={() => start(workout)}>
                Training starten
              </Button>
              <Button
                variant="ghost"
                className="self-start px-2 text-sm"
                onClick={() => {
                  if (window.confirm('Alle Drills aus dem Kampfsport-Training entfernen?')) {
                    update(() => EMPTY_COMBAT_PLAN)
                  }
                }}
              >
                Auswahl leeren
              </Button>
            </Card>
          )}

          <p className="text-xs text-fg-muted">
            Die Auswahl bleibt auf diesem Gerät gespeichert – so kannst du dasselbe Training
            wiederholen. Gespeichert wird das Training wie jedes andere (Verlauf, Kalender,
            Statistik).
          </p>
        </div>
      )}
    </>
  )
}

function PlanItemCard({
  item,
  index,
  count,
  circuit,
  onChange,
  onMove,
  onRemove,
}: {
  item: CombatPlanItem
  index: number
  count: number
  circuit: boolean
  onChange: (patch: Partial<CombatPlanItem>) => void
  onMove: (offset: -1 | 1) => void
  onRemove: () => void
}) {
  const weighted = item.measurement === 'weight_reps' || item.measurement === 'weight_time'
  const iconButton =
    'grid size-10 place-items-center rounded-lg border border-line-strong bg-surface-raised text-sm transition hover:bg-surface-high disabled:opacity-40'
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent/12 text-sm font-semibold text-accent">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{item.name}</p>
          <p className="text-xs text-fg-muted">
            {item.sports.map((s) => COMBAT_SPORT_LABELS[s]).join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className={iconButton}
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label={`${item.name} nach oben`}
          >
            ↑
          </button>
          <button
            type="button"
            className={iconButton}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            aria-label={`${item.name} nach unten`}
          >
            ↓
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={onRemove}
            aria-label={`${item.name} entfernen`}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {!circuit && (
          <CompactStepper
            label="Sätze"
            value={item.sets}
            min={1}
            max={20}
            onChange={(sets) => onChange({ sets })}
          />
        )}
        {item.durationSec !== undefined ? (
          <CompactStepper
            label="Dauer"
            value={item.durationSec}
            min={15}
            max={1800}
            step={15}
            format={formatDurationClock}
            onChange={(durationSec) => onChange({ durationSec })}
          />
        ) : (
          <CompactStepper
            label="Wiederholungen"
            value={item.reps ?? 1}
            min={1}
            max={200}
            onChange={(reps) => onChange({ reps })}
          />
        )}
        {weighted && (
          <CompactStepper
            label="Gewicht"
            value={item.weightKg ?? 1}
            min={1}
            max={300}
            format={(v) => `${kgFormat.format(v)} kg`}
            onChange={(weightKg) => onChange({ weightKg })}
          />
        )}
        {(!circuit || index === count - 1) && (
          <CompactStepper
            label={circuit ? 'Pause nach der Runde' : 'Pause'}
            value={item.restSec}
            min={0}
            max={600}
            step={15}
            format={(v) => `${v} s`}
            onChange={(restSec) => onChange({ restSec })}
          />
        )}
      </div>
    </Card>
  )
}

/** Kleiner Zahlenwert mit ± – für mehrere Werte je Drill auf dem Handy. */
function CompactStepper({
  label,
  value,
  min,
  max,
  step = 1,
  format = String,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (value: number) => string
  onChange: (value: number) => void
}) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)))
  const button =
    'grid size-10 place-items-center rounded-lg border border-line-strong bg-surface-raised text-lg font-semibold transition hover:bg-surface-high active:scale-95 disabled:opacity-40'
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-fg-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={button}
          disabled={value <= min}
          onClick={() => set(value - step)}
          aria-label={`${label} verringern`}
        >
          −
        </button>
        <output className="min-w-14 flex-1 text-center font-semibold" aria-live="polite">
          {format(value)}
        </output>
        <button
          type="button"
          className={button}
          disabled={value >= max}
          onClick={() => set(value + step)}
          aria-label={`${label} erhöhen`}
        >
          +
        </button>
      </div>
    </div>
  )
}

/** Drill wählen: nach Sportart filtern und suchen. Schon gewählte sind markiert. */
function DrillPicker({
  exercises,
  selected,
  onPick,
  onClose,
}: {
  exercises: readonly CatalogExercise[]
  selected: readonly string[]
  onPick: (drill: CatalogExercise) => void
  onClose: () => void
}) {
  const [sport, setSport] = useState<CombatSport | 'all'>('all')
  const [query, setQuery] = useState('')
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean)
  const pool =
    sport === 'all'
      ? exercises.filter(isCombatDrill).sort((a, b) => a.name.localeCompare(b.name, 'de'))
      : drillsForSport(exercises, sport)
  const matches = pool.filter((d) => {
    const name = normalizeSearch(d.name)
    return words.every((word) => name.includes(word))
  })

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-surface-raised p-4 shadow-raised">
      <TextField
        label="Drill hinzufügen"
        type="search"
        placeholder="Drill suchen, z. B. Sprawl, Jab …"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        trailing={
          <SearchIcon width={18} height={18} className="mr-3 text-fg-muted" aria-hidden="true" />
        }
      />
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        role="group"
        aria-label="Sportart"
      >
        <Chip selected={sport === 'all'} onClick={() => setSport('all')}>
          Alle
        </Chip>
        {COMBAT_SPORTS.map((s) => (
          <Chip key={s} selected={sport === s} onClick={() => setSport(s)}>
            {s === 'bjj' ? 'BJJ' : COMBAT_SPORT_LABELS[s]}
          </Chip>
        ))}
      </div>
      <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
        {matches.map((drill) => {
          const added = selected.includes(drill.slug)
          return (
            <li key={drill.slug}>
              <button
                type="button"
                disabled={added}
                onClick={() => onPick(drill)}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2 text-left transition duration-200 hover:border-line-strong hover:bg-surface-high active:scale-[0.99] disabled:opacity-60"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{drill.name}</span>
                  <span className="text-xs text-fg-muted">
                    {COMBAT_LEVEL_LABELS[drill.difficulty]}
                    {drill.source === 'custom' && ' · eigener Drill'}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-accent">
                  {added ? '✓' : '+'}
                </span>
              </button>
            </li>
          )
        })}
        {matches.length === 0 && (
          <li className="px-1 text-sm text-fg-muted">Kein Drill gefunden.</li>
        )}
      </ul>
      <Button variant="ghost" className="self-start px-2 text-sm" onClick={onClose}>
        Fertig
      </Button>
    </div>
  )
}
