import { Button } from '@/components/ui/Button'
import { FieldError } from '@/components/ui/FieldError'
import { RangeField } from '@/components/ui/RangeField'
import { DEFAULT_PROFILE_VALUES } from '@/domain/profile/defaults'
import { GOALS, GOAL_LABELS } from '@/domain/profile/vocabulary'
import type { SectionProps } from './types'

export function GoalsSection({ draft, errors, update }: SectionProps) {
  const total = GOALS.reduce((sum, goal) => sum + draft.goals[goal], 0)

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-fg-muted">
        Die Gewichtung bestimmt, wie häufig der Trainingsgenerator die jeweiligen Schwerpunkte
        einplant. Standard: alle vier Ziele gleich wichtig.
      </p>
      {GOALS.map((goal) => (
        <RangeField
          key={goal}
          label={GOAL_LABELS[goal]}
          min={0}
          max={100}
          step={5}
          value={draft.goals[goal]}
          detail={total > 0 ? `${Math.round((draft.goals[goal] / total) * 100)} %` : '–'}
          onChange={(value) => update({ goals: { ...draft.goals, [goal]: value } })}
        />
      ))}
      <FieldError message={errors.goals} />
      <Button
        variant="secondary"
        className="self-start"
        onClick={() => update({ goals: { ...DEFAULT_PROFILE_VALUES.goals } })}
      >
        Gleich gewichten
      </Button>
    </div>
  )
}
