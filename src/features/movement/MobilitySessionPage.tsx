import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeftIcon, MoveIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { Spinner } from '@/components/ui/Spinner'
import { MOVEMENT_GROUP_LABELS } from '@/data/exercises/vocabulary'
import {
  addExercise,
  buildMovementWorkout,
  EMPTY_MOVEMENT_PLAN,
  moveItem,
  removeItem,
  type MovementMode,
  type MovementPlanItem,
} from '@/domain/movement/session'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { useStartTraining } from '@/features/training/useStartTraining'
import { formatDurationClock } from '@/lib/time'
import { CompactStepper } from './CompactStepper'
import { MovementPicker } from './MovementPicker'
import { useMovementPlan } from './useMovementPlan'

const MODES: { value: MovementMode; label: string }[] = [
  { value: 'sequence', label: 'Übung für Übung' },
  { value: 'circuit', label: 'Zirkel (Runden)' },
]

const kgFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

/** Mobility-Einheit aus Übungen des Movement Lab zusammenstellen (`/movement/training`). */
export function MobilitySessionPage() {
  const { catalog } = useExerciseCatalog()
  const exercises = catalog.data?.exercises ?? []
  const { plan, update } = useMovementPlan()
  const start = useStartTraining(exercises)
  const [picking, setPicking] = useState(false)

  // Übungen, die nicht mehr im Movement Lab sind, können nicht gestartet werden
  const available = new Set(exercises.map((e) => e.slug))
  const missing = catalog.data ? plan.items.filter((item) => !available.has(item.slug)) : []
  const workout = buildMovementWorkout(plan)
  const circuit = plan.mode === 'circuit' && plan.items.length > 1

  function patchItem(index: number, patch: Partial<MovementPlanItem>) {
    update((p) => ({
      ...p,
      items: p.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }

  return (
    <>
      <Link
        to="/movement"
        className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
      >
        <ChevronLeftIcon width={18} height={18} />
        Movement Lab
      </Link>
      <PageHeader
        title="Mobility-Einheit"
        subtitle="Übungen aus dem Movement Lab kombinieren und im Trainingsmodus absolvieren – z. B. am Ruhetag."
      />

      {catalog.isPending ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : catalog.isError ? (
        <p role="alert" className="text-sm text-danger">
          Die Übungen konnten nicht geladen werden. Bitte Internetverbindung prüfen.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {plan.items.length === 0 && !picking && (
            <EmptyState icon={MoveIcon} title="Noch keine Übungen gewählt">
              Füge Übungen hinzu – hier oder über „Zur Mobility-Einheit hinzufügen“ bei einer Übung.
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
            <MovementPicker
              exercises={exercises}
              selected={plan.items.map((i) => i.slug)}
              onPick={(exercise) => update((p) => addExercise(p, exercise))}
              onClose={() => setPicking(false)}
            />
          ) : (
            <Button variant="secondary" onClick={() => setPicking(true)}>
              + Übung hinzufügen
            </Button>
          )}

          {plan.items.length > 1 && (
            <Card className="flex flex-col gap-4">
              <SingleChoiceChips
                label="Ablauf"
                hint={
                  plan.mode === 'circuit'
                    ? 'Alle Übungen im Wechsel, Runde für Runde. Pause nach der letzten Übung einer Runde.'
                    : 'Jede Übung mit ihren Sätzen, dann die nächste.'
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

          {missing.length > 0 && (
            <p
              role="status"
              className="rounded-xl border border-hyrox/40 bg-hyrox/10 px-4 py-3 text-sm"
            >
              Nicht mehr im Movement Lab: {missing.map((item) => item.name).join(', ')}. Bitte
              entfernen, um zu starten.
            </p>
          )}

          {workout && (
            <Card className="flex flex-col gap-3">
              <p className="text-sm text-fg-muted">
                {workout.title} · etwa {workout.estimatedDurationMin} min
              </p>
              <Button
                fullWidth
                className="min-h-14 text-lg"
                disabled={missing.length > 0}
                onClick={() => start(workout)}
              >
                Mobility-Einheit starten
              </Button>
              <Button
                variant="ghost"
                className="self-start px-2 text-sm"
                onClick={() => {
                  if (window.confirm('Alle Übungen aus der Mobility-Einheit entfernen?')) {
                    update(() => EMPTY_MOVEMENT_PLAN)
                  }
                }}
              >
                Auswahl leeren
              </Button>
            </Card>
          )}

          <p className="text-xs text-fg-muted">
            Die Auswahl bleibt auf diesem Gerät gespeichert – so kannst du dieselbe Einheit
            wiederholen. Gespeichert wird die Einheit wie jedes andere Training (Verlauf, Kalender,
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
  item: MovementPlanItem
  index: number
  count: number
  circuit: boolean
  onChange: (patch: Partial<MovementPlanItem>) => void
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
          <Link
            to={`/movement/exercise/${item.slug}`}
            state={{ backTo: '/movement/training' }}
            className="font-semibold transition-colors hover:text-accent"
          >
            {item.name}
          </Link>
          <p className="text-xs text-fg-muted">
            {item.groups.map((g) => MOVEMENT_GROUP_LABELS[g]).join(' · ')}
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
