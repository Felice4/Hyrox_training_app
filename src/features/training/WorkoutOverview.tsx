import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { exerciseOutcome, goToSet, skipExercise, unskipExercise } from '@/domain/session/session'
import type { ActiveSession, Step } from '@/domain/session/types'
import { BLOCK_LABELS } from '@/features/generator/labels'
import { cn } from '@/lib/cn'
import type { SessionAction } from './useActiveSession'

interface WorkoutOverviewProps {
  session: ActiveSession
  current: Step | undefined
  apply: (action: SessionAction) => void
  onClose: () => void
}

/** Übersicht aller Übungen: Sätze antippen, um dorthin zu springen. */
export function WorkoutOverview({ session, current, apply, onClose }: WorkoutOverviewProps) {
  return (
    <div className="flex flex-col gap-3">
      {session.exercises.map((exercise, exerciseIndex) => {
        const outcome = exerciseOutcome(exercise)
        const showBlock = session.exercises[exerciseIndex - 1]?.block !== exercise.block
        return (
          <div key={exercise.id}>
            {showBlock && (
              <h2 className="mt-2 mb-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">
                {BLOCK_LABELS[exercise.block]}
                {exercise.inCircuit && ' · Zirkel'}
              </h2>
            )}
            <Card className={cn('flex flex-col gap-3 p-4', exercise.skipped && 'opacity-60')}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">
                  {exercise.exerciseName}
                  {exercise.replacedSlug && (
                    <span className="ml-2 text-xs font-normal text-fg-muted">(getauscht)</span>
                  )}
                </p>
                <span className="text-xs text-fg-muted">
                  {exercise.skipped
                    ? 'übersprungen'
                    : outcome === 'completed'
                      ? 'erledigt'
                      : `${exercise.sets.filter((s) => s.completed).length}/${exercise.sets.length}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {exercise.sets.map((set, setIndex) => {
                  const isCurrent =
                    current?.exerciseIndex === exerciseIndex && current.setIndex === setIndex
                  return (
                    <button
                      key={set.id}
                      type="button"
                      onClick={() => {
                        apply((s) => goToSet(unskipExercise(s, exercise.id), exercise.id, set.id))
                        onClose()
                      }}
                      aria-label={`${exercise.exerciseName}, Satz ${set.setNumber}${set.completed ? ', erledigt' : ''}`}
                      className={cn(
                        'grid size-11 place-items-center rounded-xl border text-sm font-semibold',
                        set.completed
                          ? 'border-accent bg-accent text-on-accent'
                          : 'border-line bg-surface-raised text-fg-muted',
                        isCurrent && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
                      )}
                    >
                      {set.completed ? '✓' : set.type === 'warmup' ? 'A' : set.setNumber}
                    </button>
                  )
                })}
              </div>
              {exercise.skipped ? (
                <Button
                  variant="ghost"
                  className="min-h-10 self-start px-3 text-sm"
                  onClick={() => apply((s) => unskipExercise(s, exercise.id))}
                >
                  Doch machen
                </Button>
              ) : (
                outcome !== 'completed' && (
                  <Button
                    variant="ghost"
                    className="min-h-10 self-start px-3 text-sm"
                    onClick={() => apply((s) => skipExercise(s, exercise.id))}
                  >
                    Überspringen
                  </Button>
                )
              )}
            </Card>
          </div>
        )
      })}
    </div>
  )
}
