import { useState } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'
import { getSkill } from '@/data/skills'
import { resolvedProgress } from '@/domain/skills/milestones'
import { useMilestoneData } from './useMilestoneData'
import { useSkillGoals } from './useSkillGoals'

const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
  year: '2-digit',
})
/** Geschaffte Stufen: zuerst nur die neuesten */
const STAGES_SHOWN = 5

/**
 * Abzeichen (Statistik → Rekorde): erreichte Skill-Ziele, geschaffte Stufen und
 * geschaffte Meilensteine. Stufen aus der Einstufung zählen nicht als Abzeichen.
 */
export function BadgesCard() {
  const skillGoals = useSkillGoals()
  const milestoneData = useMilestoneData()
  const [showAllStages, setShowAllStages] = useState(false)
  if (!skillGoals.data || !milestoneData.data || !milestoneData.milestones) return null

  const achievedSkills = skillGoals.data.goals.flatMap((goal) => {
    const skill = getSkill(goal.skillSlug)
    return goal.status === 'achieved' && skill ? [{ skill, at: goal.achievedAt }] : []
  })
  const stages = skillGoals.data.log
    .filter((entry) => entry.source !== 'assessment')
    .flatMap((entry) => {
      const skill = getSkill(entry.skillSlug)
      const stage = skill?.stages[entry.stage - 1]
      return skill && stage ? [{ ...entry, skill, stageTitle: stage.title }] : []
    })
    .sort((a, b) => Date.parse(b.achievedAt) - Date.parse(a.achievedAt))
  const data = milestoneData.data
  const milestones = milestoneData.milestones.filter(
    (m) => !m.hidden && resolvedProgress(m, data).achieved,
  )
  const empty = achievedSkills.length === 0 && stages.length === 0 && milestones.length === 0

  return (
    <Card className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold tracking-wide text-fg-muted uppercase">Abzeichen</h2>
      {empty && (
        <p className="text-sm text-fg-muted">
          Noch keine Abzeichen. Sie erscheinen hier, sobald du Skill-Stufen oder Meilensteine
          schaffst.{' '}
          <Link to="/goals" className="font-medium text-accent">
            Zu den Zielen →
          </Link>
        </p>
      )}

      {achievedSkills.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {achievedSkills.map(({ skill, at }) => (
            <li key={skill.slug}>
              <Link
                to={`/goals/${skill.slug}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-hyrox/15 px-4 text-sm font-semibold text-hyrox"
              >
                🏅 {skill.name}
                {at && <span className="font-normal">· {dateFormat.format(new Date(at))}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {milestones.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-fg-muted">Meilensteine geschafft</p>
          <ul className="flex flex-wrap gap-2">
            {milestones.map((m) => (
              <li key={m.key}>
                <Link
                  to={`/goals/milestones/${m.key}`}
                  className="inline-flex min-h-10 items-center rounded-full border border-hyrox/40 px-3 text-sm text-hyrox"
                >
                  ✓ {m.definition.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stages.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-fg-muted">Skill-Stufen geschafft</p>
          <ul className="divide-y divide-line">
            {(showAllStages ? stages : stages.slice(0, STAGES_SHOWN)).map((entry) => (
              <li
                key={`${entry.skillSlug}-${entry.stage}`}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {entry.skill.name} · Stufe {entry.stage}
                  </p>
                  <p className="text-xs text-fg-muted">{entry.stageTitle}</p>
                </div>
                <span className="shrink-0 text-xs text-fg-muted">
                  {dateFormat.format(new Date(entry.achievedAt))}
                </span>
              </li>
            ))}
          </ul>
          {stages.length > STAGES_SHOWN && (
            <button
              type="button"
              onClick={() => setShowAllStages((v) => !v)}
              className="mt-1 min-h-11 text-sm font-medium text-accent"
            >
              {showAllStages ? 'Weniger anzeigen' : `Alle ${stages.length} anzeigen`}
            </button>
          )}
        </div>
      )}
    </Card>
  )
}
