import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { getSkill } from '@/data/skills'
import { activeGoals } from '@/domain/skills/goals'
import { ActiveGoalLink } from './parts'
import { useSkillGoals } from './useSkillGoals'

/** Dashboard: aktive Skill-Ziele mit dem nächsten Kriterium. */
export function GoalsCard() {
  const skillGoals = useSkillGoals()
  const active = activeGoals(skillGoals.data?.goals ?? []).flatMap((goal) => {
    const skill = getSkill(goal.skillSlug)
    return skill ? [{ skill, goal }] : []
  })

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-fg-muted uppercase">
        Skill-Ziele
      </h2>
      {skillGoals.isPending ? (
        <div className="flex justify-center py-4">
          <Spinner className="text-accent" />
        </div>
      ) : skillGoals.isError ? (
        <p className="text-sm text-fg-muted">Konnte nicht geladen werden.</p>
      ) : active.length === 0 ? (
        <p className="text-sm text-fg-muted">
          Muscle-Up, Handstand, Spagat? Wähle ein Ziel – die App plant es neben deinem normalen
          Training ein.
        </p>
      ) : (
        <div className="divide-y divide-line">
          {active.map(({ skill, goal }) => (
            <ActiveGoalLink key={skill.slug} skill={skill} goal={goal} compact />
          ))}
        </div>
      )}
      <Link
        to="/goals"
        className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-accent"
      >
        {active.length === 0 ? 'Ziele ansehen →' : 'Alle Ziele und Meilensteine →'}
      </Link>
    </Card>
  )
}
