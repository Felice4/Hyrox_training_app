import { Link } from 'react-router'
import { ChevronRightIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import type { SkillDefinition } from '@/data/skills'
import { skillState, type SkillGoal } from '@/domain/skills/goals'
import { cn } from '@/lib/cn'
import { requirementText, STATUS_LABELS } from './format'

/** Fortschrittsbalken 0–1 mit zugänglicher Beschriftung. */
export function ProgressBar({
  ratio,
  label,
  tone = 'accent',
}: {
  ratio: number
  label: string
  tone?: 'accent' | 'done'
}) {
  const percent = Math.round(Math.min(Math.max(ratio, 0), 1) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 overflow-hidden rounded-full bg-surface-raised"
    >
      <div
        className={cn('h-full rounded-full', tone === 'done' ? 'bg-hyrox' : 'bg-accent')}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

/** Aktives Ziel als Karte: Stufe, Balken, nächstes Kriterium. */
export function ActiveGoalLink({
  skill,
  goal,
  compact = false,
}: {
  skill: SkillDefinition
  goal: SkillGoal
  compact?: boolean
}) {
  const state = skillState(skill, goal)
  return (
    <Link
      to={`/goals/${skill.slug}`}
      className={cn(
        'flex items-center gap-3 rounded-xl hover:bg-surface-raised',
        compact ? 'py-2.5' : 'border border-line p-4',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold">{skill.name}</p>
          <p className="shrink-0 text-xs text-fg-muted">
            Stufe {state.currentNumber ?? state.total} von {state.total}
          </p>
        </div>
        <div className="my-2">
          <ProgressBar
            ratio={state.completed / state.total}
            label={`${skill.name}: ${state.completed} von ${state.total} Stufen geschafft`}
          />
        </div>
        {state.current && (
          <p className="text-sm text-fg-muted">
            Nächstes Ziel: <span className="text-fg">{state.current.title}</span>
          </p>
        )}
      </div>
      <ChevronRightIcon className="shrink-0 text-fg-muted" />
    </Link>
  )
}

/** Zeile in der Skill-Liste mit Status. */
export function SkillRow({
  skill,
  goal,
  locked,
}: {
  skill: SkillDefinition
  goal: SkillGoal | undefined
  locked: boolean
}) {
  const state = skillState(skill, goal)
  return (
    <Link
      to={`/goals/${skill.slug}`}
      className="flex min-h-14 items-center gap-3 py-2.5 hover:text-accent"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium">{skill.name}</p>
        <p className="text-xs text-fg-muted">
          {goal
            ? `${state.completed} von ${state.total} Stufen`
            : locked
              ? requirementText(skill)
              : `${state.total} Stufen`}
          {skill.longTerm && ' · Fernziel'}
        </p>
      </div>
      {goal && (
        <Badge
          tone={
            goal.status === 'active' ? 'accent' : goal.status === 'achieved' ? 'hyrox' : 'neutral'
          }
        >
          {STATUS_LABELS[goal.status]}
        </Badge>
      )}
      <ChevronRightIcon width={20} height={20} className="shrink-0 text-fg-muted" />
    </Link>
  )
}
