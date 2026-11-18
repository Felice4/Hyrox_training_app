import { useState } from 'react'
import type { CatalogExercise } from '@/api/exercises'
import { MoveIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SingleChoiceChips } from '@/components/ui/ChoiceChips'
import type { GeneratedWorkout } from '@/domain/generator'
import { movementInWorkout, type MovementPlacement } from '@/domain/movement/placement'
import { MovementPicker } from '@/features/movement/MovementPicker'

const PLACEMENTS: { value: MovementPlacement; label: string }[] = [
  { value: 'warmup', label: 'Warm-up' },
  { value: 'cooldown', label: 'Cool-down' },
]

const where = (placement: MovementPlacement) =>
  placement === 'warmup' ? 'im Warm-up' : 'im Cool-down'

/**
 * „Movement einbauen" in der Vorschau: Übungen aus dem Movement Lab auf Wunsch ins Warm-up
 * oder Cool-down einbauen bzw. entfernen (docs/MOVEMENT.md §5). Bedienung wie „Skill üben".
 */
export function MovementPracticeCard({
  workout,
  exercises,
  onAdd,
  onRemove,
}: {
  workout: GeneratedWorkout
  exercises: readonly CatalogExercise[]
  onAdd: (exercise: CatalogExercise, placement: MovementPlacement) => void
  onRemove: (exerciseSlug: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<MovementPlacement>('warmup')
  const included = movementInWorkout(workout)
  const slugsInWorkout = workout.blocks.flatMap((b) => b.items.map((i) => i.exerciseSlug))

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <MoveIcon width={18} height={18} className="text-accent" />
          Movement einbauen
        </h2>
        {!open && (
          <Button variant="ghost" className="min-h-10 px-3 text-sm" onClick={() => setOpen(true)}>
            {included.length > 0 ? 'Weitere Übung' : 'Übung einbauen'}
          </Button>
        )}
      </div>

      {included.length === 0 && !open && (
        <p className="text-sm text-fg-muted">
          Baue Übungen aus dem Movement Lab ins Warm-up oder Cool-down ein – Mobilität,
          Bodenbewegungen, Flows und mehr.
        </p>
      )}

      {included.length > 0 && (
        <ul className="flex flex-col gap-2">
          {included.map(({ placement: at, item }) => (
            <li
              key={item.exerciseSlug}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised px-4 py-2"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.exerciseName}</p>
                <p className="text-xs text-fg-muted">{where(at)}</p>
              </div>
              <Button
                variant="ghost"
                className="min-h-10 shrink-0 px-3 text-sm"
                onClick={() => onRemove(item.exerciseSlug)}
              >
                Entfernen
              </Button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="flex flex-col gap-3">
          <SingleChoiceChips
            label="Wohin?"
            hint="Movement-Übungen kommen nur ins Warm-up oder Cool-down, nie in Hauptteil oder Kondition."
            options={PLACEMENTS}
            value={placement}
            onChange={setPlacement}
          />
          <MovementPicker
            exercises={exercises}
            selected={slugsInWorkout}
            label={`Übung ${where(placement)} einbauen`}
            onPick={(exercise) => onAdd(exercise, placement)}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </Card>
  )
}
