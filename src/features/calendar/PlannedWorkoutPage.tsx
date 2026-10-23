import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { PlannedWorkout, PlannedWorkoutChange } from '@/api/weekPlans'
import { CalendarIcon, ChevronLeftIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import {
  ruleBasedGenerator,
  swapExercise,
  type GeneratedWorkout,
  type WorkoutRequest,
} from '@/domain/generator'
import { GeneratorForm } from '@/features/generator/GeneratorForm'
import { newSeed, toGeneratorProfile } from '@/features/generator/inputs'
import { FOCUS_LABELS, INTENSITY_LABELS } from '@/features/generator/labels'
import { WorkoutPreview } from '@/features/generator/WorkoutPreview'
import { readActiveSession, useActiveSessionKey } from '@/features/training/useActiveSession'
import { useStartTraining } from '@/features/training/useStartTraining'
import { toLocalIsoDate } from '@/lib/date'
import { formatLongDay, formatShortDay } from './format'
import { generateForDay, requestFor, type PlanningData } from './planning'
import {
  useDeletePlannedWorkout,
  usePlannedWorkout,
  useUpdatePlannedWorkout,
} from './usePlannedWorkouts'
import { usePlanningData } from './usePlanningData'
import { moveChange, moveTargets, weekStartOf } from './week'

export function PlannedWorkoutPage() {
  const { id = '' } = useParams()
  const planning = usePlanningData()
  const planned = usePlannedWorkout(id)

  const backLink = (week?: string) => (
    <Link
      to={week ? `/calendar?week=${week}` : '/calendar'}
      className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
    >
      <ChevronLeftIcon width={18} height={18} />
      Kalender
    </Link>
  )

  if (planning.status === 'loading' || planned.isPending) {
    return (
      <>
        {backLink()}
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      </>
    )
  }
  if (planning.status === 'error' || planned.isError) {
    return (
      <>
        {backLink()}
        <EmptyState icon={CalendarIcon} title="Daten konnten nicht geladen werden">
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              if (planning.status === 'error') planning.retry()
              void planned.refetch()
            }}
          >
            Erneut versuchen
          </Button>
        </EmptyState>
      </>
    )
  }
  if (!planned.data) {
    return (
      <>
        {backLink()}
        <EmptyState icon={CalendarIcon} title="Einheit nicht gefunden">
          Sie wurde vermutlich entfernt oder durch eine Neuplanung ersetzt.
        </EmptyState>
      </>
    )
  }

  return (
    <>
      {backLink(weekStartOf(planned.data.date))}
      {/* key: nach dem Neuladen (z. B. verschoben) mit frischem Zustand anzeigen */}
      <PlannedDetail key={planned.data.id} planned={planned.data} data={planning.data} />
    </>
  )
}

function PlannedDetail({ planned, data }: { planned: PlannedWorkout; data: PlanningData }) {
  const navigate = useNavigate()
  const [today] = useState(() => toLocalIsoDate())
  const update = useUpdatePlannedWorkout()
  const remove = useDeletePlannedWorkout()
  const startTraining = useStartTraining(data.exercises)
  const activeKey = useActiveSessionKey()
  const [hasActive] = useState(() => readActiveSession(activeKey) !== null)

  // Sofort anzeigen, im Hintergrund speichern (Austausch soll sich nicht träge anfühlen)
  const [localWorkout, setLocalWorkout] = useState<GeneratedWorkout | null>(null)
  const workout = localWorkout ?? planned.workout
  const [editing, setEditing] = useState(false)

  const completed = planned.status === 'completed'
  const skipped = planned.status === 'skipped'
  const isPast = planned.date < today
  const editable = !completed && !isPast
  const profile = toGeneratorProfile(data.details)

  function save(change: PlannedWorkoutChange, onSaved?: () => void) {
    update.mutate({ id: planned.id, change }, { onSuccess: onSaved })
  }

  function regenerate(request: WorkoutRequest) {
    const next = generateForDay(data, request, planned.date, today, newSeed())
    setLocalWorkout(next)
    setEditing(false)
    save({
      workout: next,
      focus: request.focus,
      intensity: request.intensity,
      durationMin: request.durationMin,
    })
    window.scrollTo({ top: 0 })
  }

  function start(current: GeneratedWorkout) {
    // Eine Einheit von einem anderen Tag wird zuerst auf heute verschoben
    if (planned.date !== today) {
      save(moveChange(planned, today), () => startTraining(current, planned.id))
    } else {
      startTraining(current, planned.id)
    }
  }

  function deletePlanned() {
    if (!window.confirm('Diese Einheit entfernen?')) return
    remove.mutate(planned.id, {
      onSuccess: () => void navigate(`/calendar?week=${weekStartOf(planned.date)}`),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          {completed ? (
            <Badge tone="accent">Erledigt</Badge>
          ) : skipped ? (
            <Badge>Ausgefallen</Badge>
          ) : isPast ? (
            <Badge>Nicht absolviert</Badge>
          ) : (
            <Badge tone="accent">Geplant</Badge>
          )}
          {planned.source === 'manual' && <Badge tone="hyrox">Spontan</Badge>}
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-wide uppercase">
          {FOCUS_LABELS[planned.focus]}
        </h1>
        <p className="text-fg-muted">
          {formatLongDay(planned.date)} · {planned.durationMin} min ·{' '}
          {INTENSITY_LABELS[planned.intensity]}
        </p>
        {planned.originalDate && (
          <p className="text-sm text-fg-muted">
            Verschoben von {formatShortDay(planned.originalDate)}
          </p>
        )}
      </header>

      {(update.isError || remove.isError) && (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.
        </p>
      )}

      {completed && (
        <Card className="text-sm text-fg-muted">
          Diese Einheit hast du absolviert. Sie gehört zu deinem Trainingsverlauf und bleibt
          unverändert.
        </Card>
      )}

      {editable && (
        <PlanActions
          planned={planned}
          today={today}
          busy={update.isPending || remove.isPending}
          onMove={(date) => save(moveChange(planned, date))}
          onToggleSkipped={() => save({ status: skipped ? 'planned' : 'skipped' })}
          onDelete={deletePlanned}
        />
      )}

      {isPast && !completed && (
        <Card className="flex flex-col gap-3 text-sm text-fg-muted">
          Diese Einheit liegt in der Vergangenheit und kann nicht mehr geändert werden.
          <Button variant="ghost" className="self-start" onClick={deletePlanned}>
            Einheit entfernen
          </Button>
        </Card>
      )}

      {editable && !skipped && (editing || !workout) && (
        <>
          {!workout && (
            <p className="text-sm text-fg-muted">
              Für diese Einheit ist noch kein Workout gespeichert. Erzeuge es jetzt:
            </p>
          )}
          <GeneratorForm
            initial={requestFor(planned)}
            profileEquipment={profile.availableEquipment}
            onSubmit={regenerate}
          />
          {workout && (
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Abbrechen
            </Button>
          )}
        </>
      )}

      {workout && !editing && (
        <WorkoutView
          workout={workout}
          interactive={editable && !skipped}
          canStart={editable && !skipped && !hasActive}
          startHint={
            hasActive
              ? 'Es läuft bereits ein Training.'
              : planned.date !== today
                ? 'Die Einheit wird dabei auf heute verschoben.'
                : undefined
          }
          data={data}
          onStart={() => start(workout)}
          onRegenerate={() => regenerate(requestFor(planned))}
          onEdit={() => setEditing(true)}
          onRecovery={() =>
            regenerate({ ...requestFor(planned), focus: 'recovery', intensity: 'easy' })
          }
          onChange={(next) => {
            setLocalWorkout(next)
            save({ workout: next })
          }}
        />
      )}
    </div>
  )
}

function PlanActions({
  planned,
  today,
  busy,
  onMove,
  onToggleSkipped,
  onDelete,
}: {
  planned: PlannedWorkout
  today: string
  busy: boolean
  onMove: (date: string) => void
  onToggleSkipped: () => void
  onDelete: () => void
}) {
  const [moving, setMoving] = useState(false)
  const skipped = planned.status === 'skipped'
  const targets = moveTargets(planned, today)

  return (
    <Card className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {!skipped && (
          <Button
            variant="secondary"
            disabled={busy || targets.length === 0}
            aria-expanded={moving}
            onClick={() => setMoving((v) => !v)}
          >
            Verschieben
          </Button>
        )}
        <Button variant="secondary" disabled={busy} onClick={onToggleSkipped}>
          {skipped ? 'Wieder einplanen' : 'Fällt aus'}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onDelete}>
          Entfernen
        </Button>
      </div>
      {moving && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-fg-muted">Verschieben auf (diese Woche):</p>
          <div className="flex flex-wrap gap-2">
            {targets.map((date) => (
              <Button
                key={date}
                variant="secondary"
                className="min-h-11 px-3 text-sm"
                disabled={busy}
                onClick={() => {
                  setMoving(false)
                  onMove(date)
                }}
              >
                {date === today ? 'Heute' : formatShortDay(date)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function WorkoutView({
  workout,
  interactive,
  canStart,
  startHint,
  data,
  onStart,
  onRegenerate,
  onEdit,
  onRecovery,
  onChange,
}: {
  workout: GeneratedWorkout
  interactive: boolean
  canStart: boolean
  startHint: string | undefined
  data: PlanningData
  onStart: () => void
  onRegenerate: () => void
  onEdit: () => void
  onRecovery: () => void
  onChange: (workout: GeneratedWorkout) => void
}) {
  const profile = toGeneratorProfile(data.details)
  const slugsInWorkout = workout.blocks.flatMap((b) => b.items.map((i) => i.exerciseSlug))

  if (!interactive) {
    return (
      <Card>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">
          Geplantes Workout
        </h2>
        {workout.blocks.map((block) => (
          <p key={block.type} className="text-sm">
            {block.items.map((item) => item.exerciseName).join(' · ')}
          </p>
        ))}
      </Card>
    )
  }

  return (
    <WorkoutPreview
      workout={workout}
      backTo="/calendar"
      startHint={startHint}
      startDisabled={!canStart}
      onStart={onStart}
      onRegenerate={onRegenerate}
      onEdit={onEdit}
      onSwitchToRecovery={onRecovery}
      alternativesFor={(slug) =>
        ruleBasedGenerator.suggestAlternatives({
          exerciseSlug: slug,
          exercises: data.exercises,
          profile,
          excludeSlugs: slugsInWorkout,
        })
      }
      onSwap={(blockIndex, itemIndex, suggestion) =>
        onChange(
          swapExercise(workout, blockIndex, itemIndex, suggestion.exercise, {
            level: profile.trainingLevel,
            history: data.history,
          }),
        )
      }
    />
  )
}
