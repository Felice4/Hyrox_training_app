import { Link } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import { InfoIcon, SwapIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { weightStep } from '@/domain/progression/progression'
import {
  addSet,
  canReplace,
  cancelWorkTimer,
  completeSet,
  MEASURED_FIELDS,
  setActual,
  skipExercise,
  startWorkTimer,
  stopWorkTimer,
  workTimerElapsed,
  workTimerRemaining,
} from '@/domain/session/session'
import type { ActiveExercise, ActiveSession, ActiveSet } from '@/domain/session/types'
import { BLOCK_LABELS } from '@/features/generator/labels'
import { formatDurationClock } from '@/lib/time'
import { describeTarget } from './format'
import { DurationInput } from './inputs/DurationInput'
import { RpePicker } from './inputs/RpePicker'
import { distanceIncrement } from './inputs/steps'
import { ValueInput } from './inputs/ValueInput'
import type { LastPerformance } from './lastTime'
import type { SessionAction } from './useActiveSession'

const dayFormat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric' })

interface CurrentSetCardProps {
  session: ActiveSession
  exercise: ActiveExercise
  set: ActiveSet
  /** Bibliotheksdaten der Übung (Geräte für die Gewichtsstufen) */
  meta: CatalogExercise | undefined
  now: string
  apply: (action: SessionAction) => void
  onSwap: () => void
  /** Was bei dieser Übung zuletzt geschafft wurde */
  lastTime?: LastPerformance | undefined
}

/** Position des Satzes: „Satz 2 von 4", „Runde 3 von 5" oder „Aufwärmsatz". */
function positionLabel(exercise: ActiveExercise, set: ActiveSet): string {
  if (set.type === 'warmup') return 'Aufwärmsatz'
  if (exercise.inCircuit) return `Runde ${set.setNumber} von ${exercise.sets.length}`
  const working = exercise.sets.filter((s) => s.type !== 'warmup')
  return `Satz ${working.indexOf(set) + 1} von ${working.length}`
}

export function CurrentSetCard({
  session,
  exercise,
  set,
  meta,
  now,
  apply,
  onSwap,
  lastTime,
}: CurrentSetCardProps) {
  const fields = MEASURED_FIELDS[exercise.measurement]
  const change = (patch: Parameters<typeof setActual>[3]) =>
    apply((s) => setActual(s, exercise.id, set.id, patch))
  const timer = session.workTimer?.setId === set.id ? session.workTimer : undefined
  const showsRpe =
    set.type !== 'warmup' &&
    (exercise.measurement === 'weight_reps' || exercise.measurement === 'reps')

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-fg-muted">
          {BLOCK_LABELS[exercise.block]} · {positionLabel(exercise, set)}
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="font-display text-4xl leading-tight font-bold tracking-wide uppercase">
            {exercise.exerciseName}
          </h1>
          <Link
            to={`/exercises/${exercise.exerciseSlug}`}
            state={{ backTo: '/training/active' }}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-fg-muted hover:bg-surface-raised hover:text-fg"
            aria-label="Anleitung anzeigen"
          >
            <InfoIcon />
          </Link>
        </div>
        {describeTarget(set.target) && (
          <p className="mt-1 text-lg">
            <span className="text-fg-muted">Ziel: </span>
            <span className="font-semibold text-accent">{describeTarget(set.target)}</span>
          </p>
        )}
        {lastTime && (
          <p className="mt-1 text-sm">
            <span className="text-fg-muted">
              Letztes Mal ({dayFormat.format(new Date(lastTime.date))}):{' '}
            </span>
            {lastTime.text}
          </p>
        )}
        {exercise.note && set.type !== 'warmup' && (
          <p className="mt-2 text-sm text-fg-muted">{exercise.note}</p>
        )}
      </div>

      {fields.includes('durationSec') && (
        <WorkTimerControl
          session={session}
          exercise={exercise}
          set={set}
          now={now}
          running={timer !== undefined}
          apply={apply}
        />
      )}

      <div className="flex flex-col gap-4">
        {fields.includes('weightKg') && (
          <ValueInput
            label="Gewicht"
            unit="kg"
            step={weightStep(meta?.equipment ?? [])}
            value={set.actual.weightKg}
            target={set.target.weightKg}
            onChange={(weightKg) => change({ weightKg })}
          />
        )}
        {fields.includes('reps') && (
          <ValueInput
            label="Wiederholungen"
            unit="Wdh."
            step={1}
            value={set.actual.reps}
            target={set.target.reps}
            onChange={(reps) => change({ reps })}
          />
        )}
        {fields.includes('distanceM') && (
          <ValueInput
            label="Strecke"
            unit="m"
            step={distanceIncrement(set.target.distanceM)}
            value={set.actual.distanceM}
            target={set.target.distanceM}
            onChange={(distanceM) => change({ distanceM })}
          />
        )}
        {fields.includes('calories') && (
          <ValueInput
            label="Kalorien"
            unit="kcal"
            step={1}
            value={set.actual.calories}
            target={set.target.calories}
            onChange={(calories) => change({ calories })}
          />
        )}
        {fields.includes('durationSec') && !timer && (
          <DurationInput
            label="Zeit"
            value={set.actual.durationSec}
            target={set.target.durationSec}
            onChange={(durationSec) => change({ durationSec })}
          />
        )}
        {showsRpe && (
          <RpePicker
            label="Anstrengung (optional)"
            min={6}
            max={10}
            value={set.rpe}
            onChange={(rpe) => change({ rpe })}
          />
        )}
      </div>

      <Button
        fullWidth
        className="min-h-16 text-xl"
        onClick={() => apply((s, now) => completeSet(s, exercise.id, set.id, now))}
      >
        ✓ Satz geschafft
      </Button>

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="ghost"
          className="min-h-11 px-2 text-sm"
          onClick={() => apply((s, _now, newId) => addSet(s, exercise.id, newId))}
        >
          + Satz
        </Button>
        <Button
          variant="ghost"
          className="min-h-11 px-2 text-sm"
          disabled={!canReplace(exercise)}
          onClick={onSwap}
        >
          <SwapIcon width={18} height={18} />
          Tauschen
        </Button>
        <Button
          variant="ghost"
          className="min-h-11 px-2 text-sm"
          onClick={() => apply((s) => skipExercise(s, exercise.id))}
        >
          Überspringen
        </Button>
      </div>
    </Card>
  )
}

function WorkTimerControl({
  session,
  exercise,
  set,
  now,
  running,
  apply,
}: {
  session: ActiveSession
  exercise: ActiveExercise
  set: ActiveSet
  now: string
  running: boolean
  apply: (action: SessionAction) => void
}) {
  if (!running) {
    const isCountdown =
      (set.actual.durationSec ?? set.target.durationSec) !== undefined &&
      (set.actual.distanceM ?? set.target.distanceM) === undefined
    return (
      <Button
        variant="secondary"
        fullWidth
        className="min-h-14 text-lg"
        onClick={() => apply((s, now) => startWorkTimer(s, exercise.id, set.id, now))}
      >
        {isCountdown ? '▶ Timer starten' : '▶ Stoppuhr starten'}
      </Button>
    )
  }
  const timer = session.workTimer
  const shown =
    timer?.mode === 'countdown' ? workTimerRemaining(session, now) : workTimerElapsed(session, now)
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-raised py-5">
      <p className="text-sm text-fg-muted">
        {timer?.mode === 'countdown' ? 'Noch' : 'Gemessene Zeit'}
      </p>
      <p className="font-display text-7xl font-bold tabular-nums" aria-live="off">
        {formatDurationClock(shown)}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => apply((s, now) => stopWorkTimer(s, now))}>■ Stopp</Button>
        <Button variant="ghost" onClick={() => apply((s) => cancelWorkTimer(s))}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
