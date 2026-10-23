import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import { ChevronLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ruleBasedGenerator, type GeneratorProfile, type HistorySession } from '@/domain/generator'
import { doseExercise } from '@/domain/generator/dosing'
import {
  activeSeconds,
  currentStep,
  finishSession,
  pauseSession,
  replaceExercise,
  restRemaining,
  resumeSession,
  sessionProgress,
  skipRest,
  stopWorkTimer,
  upcomingStep,
  workTimerRemaining,
} from '@/domain/session/session'
import type { ActiveSession } from '@/domain/session/types'
import { formatDurationClock } from '@/lib/time'
import { CurrentSetCard } from './CurrentSetCard'
import { describeTarget } from './format'
import { lastPerformance } from './lastTime'
import { RestCard } from './RestCard'
import type { SessionAction } from './useActiveSession'
import { useNow, useWakeLock, vibrate } from './useDeviceFeatures'
import { WorkoutOverview } from './WorkoutOverview'

interface ActiveWorkoutProps {
  session: ActiveSession
  apply: (action: SessionAction) => void
  catalog: readonly CatalogExercise[]
  profile: GeneratorProfile
  history: readonly HistorySession[]
}

export function ActiveWorkout({ session, apply, catalog, profile, history }: ActiveWorkoutProps) {
  const now = useNow(true)
  useWakeLock(true)
  const [view, setView] = useState<'set' | 'overview'>('set')
  const [swapping, setSwapping] = useState(false)

  const paused = session.pausedSince !== undefined
  const step = currentStep(session)
  const upcoming = upcomingStep(session)
  const exercise = step ? session.exercises[step.exerciseIndex] : undefined
  const set = step && exercise ? exercise.sets[step.setIndex] : undefined
  const meta = (slug: string) => catalog.find((e) => e.slug === slug)
  const progress = sessionProgress(session)
  const restLeft = restRemaining(session, now)
  const countdownLeft =
    session.workTimer?.mode === 'countdown' ? workTimerRemaining(session, now) : undefined

  // Signal bei Ende der Pause bzw. des Countdowns
  useEffect(() => {
    if (session.rest && !paused && restLeft === 0) {
      vibrate()
      apply((s) => skipRest(s))
    }
  }, [session.rest, paused, restLeft, apply])
  useEffect(() => {
    if (countdownLeft === 0 && !paused) {
      vibrate()
      apply((s, n) => stopWorkTimer(s, n))
    }
  }, [countdownLeft, paused, apply])

  function confirmFinish() {
    const open = progress.totalSets - progress.completedSets
    const question =
      open > 0
        ? `Noch ${open} ${open === 1 ? 'Satz' : 'Sätze'} offen. Training trotzdem beenden?`
        : 'Training beenden?'
    if (window.confirm(question)) apply((s, n) => finishSession(s, n))
  }

  const upcomingExercise = upcoming ? session.exercises[upcoming.exerciseIndex] : undefined
  const upcomingSet = upcoming ? upcomingExercise?.sets[upcoming.setIndex] : undefined

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <header className="sticky top-0 z-10 -mx-4 border-b border-line bg-canvas/95 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Link
            to="/training"
            className="grid size-11 place-items-center rounded-xl text-fg-muted hover:bg-surface-raised"
            aria-label="Zur Trainingsübersicht (Training läuft weiter)"
          >
            <ChevronLeftIcon />
          </Link>
          <div className="flex-1 text-center">
            <p className="font-display text-3xl font-bold tabular-nums">
              {formatDurationClock(activeSeconds(session, now))}
            </p>
            <p className="text-xs text-fg-muted">{paused ? 'Pausiert' : 'Trainingszeit'}</p>
          </div>
          <Button
            variant="secondary"
            className="min-h-11 px-3 text-sm"
            onClick={() => apply((s, n) => (paused ? resumeSession(s, n) : pauseSession(s, n)))}
          >
            {paused ? '▶ Weiter' : '❚❚ Pause'}
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.totalSets}
            aria-valuenow={progress.completedSets}
            aria-label="Fortschritt"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{
                width: `${progress.totalSets ? (progress.completedSets / progress.totalSets) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs text-fg-muted tabular-nums">
            {progress.completedSets}/{progress.totalSets}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2" role="tablist">
          {(['set', 'overview'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`min-h-10 rounded-lg text-sm font-medium ${view === v ? 'bg-surface-raised text-fg' : 'text-fg-muted'}`}
            >
              {v === 'set' ? 'Aktueller Satz' : 'Übersicht'}
            </button>
          ))}
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 pt-4">
        {paused && (
          <Card className="flex flex-col items-center gap-3 text-center">
            <p className="font-display text-2xl font-bold uppercase">Training pausiert</p>
            <p className="text-sm text-fg-muted">Zeit und Timer stehen still.</p>
            <Button onClick={() => apply((s, n) => resumeSession(s, n))}>▶ Fortsetzen</Button>
          </Card>
        )}

        {view === 'overview' ? (
          <WorkoutOverview
            session={session}
            current={step}
            apply={apply}
            onClose={() => setView('set')}
          />
        ) : (
          <>
            {session.rest && !paused && restLeft > 0 && (
              <RestCard remaining={restLeft} total={session.rest.durationSec} apply={apply} />
            )}

            {exercise && set ? (
              swapping ? (
                <SwapPanel
                  session={session}
                  exerciseId={exercise.id}
                  catalog={catalog}
                  profile={profile}
                  history={history}
                  apply={apply}
                  onDone={() => setSwapping(false)}
                />
              ) : (
                <CurrentSetCard
                  session={session}
                  exercise={exercise}
                  set={set}
                  meta={meta(exercise.exerciseSlug)}
                  lastTime={lastPerformance(history, exercise.exerciseSlug, session.startedAt)}
                  now={now}
                  apply={apply}
                  onSwap={() => setSwapping(true)}
                />
              )
            ) : (
              <Card className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="font-display text-3xl font-bold uppercase">Alles erledigt!</p>
                <p className="text-fg-muted">Alle geplanten Sätze sind abgehakt.</p>
                <Button
                  className="min-h-14 text-lg"
                  onClick={() => apply((s, n) => finishSession(s, n))}
                >
                  Training abschließen
                </Button>
              </Card>
            )}

            {upcomingExercise && upcomingSet && !swapping && (
              <Card className="p-4">
                <p className="text-xs text-fg-muted uppercase">Als Nächstes</p>
                <p className="font-semibold">{upcomingExercise.exerciseName}</p>
                <p className="text-sm text-fg-muted">{describeTarget(upcomingSet.target)}</p>
              </Card>
            )}
          </>
        )}

        <Button variant="ghost" className="mt-auto self-center text-danger" onClick={confirmFinish}>
          Training beenden
        </Button>
      </main>
    </div>
  )
}

function SwapPanel({
  session,
  exerciseId,
  catalog,
  profile,
  history,
  apply,
  onDone,
}: {
  session: ActiveSession
  exerciseId: string
  catalog: readonly CatalogExercise[]
  profile: GeneratorProfile
  history: readonly HistorySession[]
  apply: (action: SessionAction) => void
  onDone: () => void
}) {
  const exercise = session.exercises.find((e) => e.id === exerciseId)
  if (!exercise) return null
  const suggestions = ruleBasedGenerator.suggestAlternatives({
    exerciseSlug: exercise.exerciseSlug,
    exercises: catalog,
    profile,
    excludeSlugs: session.exercises.map((e) => e.exerciseSlug),
  })

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">„{exercise.exerciseName}" tauschen gegen:</h2>
      {suggestions.length === 0 && (
        <p className="text-sm text-fg-muted">
          Keine passende Alternative mit deinen Geräten gefunden.
        </p>
      )}
      {suggestions.map(({ exercise: alternative, reason }) => (
        <button
          key={alternative.slug}
          type="button"
          onClick={() => {
            const dosed = doseExercise(alternative, exercise.role, {
              intensity: session.workout.intensity,
              volumeFactor: 1,
              loadFactor: 1,
              history,
              fixedSets: exercise.inCircuit ? exercise.sets.length : undefined,
            })
            // Im Zirkel bleiben die Pausen an ihrer Position (Rundenpause nach der letzten Übung)
            const sets = exercise.inCircuit
              ? dosed.sets.map((s, i) => ({
                  ...s,
                  restSec: exercise.sets[i]?.target.restSec ?? s.restSec,
                }))
              : dosed.sets
            apply((s, _now, newId) =>
              replaceExercise(
                s,
                exercise.id,
                {
                  slug: alternative.slug,
                  name: alternative.name,
                  measurement: alternative.measurement,
                  sets,
                  note: dosed.note,
                },
                newId,
              ),
            )
            onDone()
          }}
          className="flex min-h-12 flex-col items-start justify-center rounded-xl bg-surface-raised px-4 py-2 text-left hover:bg-line"
        >
          <span className="font-medium">{alternative.name}</span>
          <span className="text-xs text-fg-muted">{reason}</span>
        </button>
      ))}
      <Button variant="secondary" onClick={onDone}>
        Abbrechen
      </Button>
    </Card>
  )
}
