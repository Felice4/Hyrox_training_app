import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import {
  MAX_ACTIVE_SKILLS,
  MILESTONE_AREA_LABELS,
  MILESTONE_AREAS,
  MILESTONE_LIBRARY,
  SKILL_AREA_LABELS,
  SKILL_AREAS,
  SKILL_LIBRARY,
  getSkill,
} from '@/data/skills'
import { activeGoals, requirementMet, suggestSkills } from '@/domain/skills/goals'
import { milestoneSeries } from '@/domain/skills/milestones'
import { cn } from '@/lib/cn'
import { describeMilestoneProgress } from './format'
import { ActiveGoalLink, ProgressBar, SkillRow } from './parts'
import { useMilestoneData } from './useMilestoneData'
import { useSkillGoals } from './useSkillGoals'

const TABS = [
  { value: 'skills', label: 'Skills' },
  { value: 'milestones', label: 'Meilensteine' },
] as const
type Tab = (typeof TABS)[number]['value']

const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
})

/** Ziele: Skills Stufe für Stufe und Meilensteine aus dem normalen Training (docs/SKILLS.md). */
export function GoalsPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'skills'

  return (
    <>
      <PageHeader
        title="Ziele"
        subtitle="Skills Stufe für Stufe – dein HYROX-, Kraft- und Ausdauertraining bleibt die Basis."
      />
      <div
        role="tablist"
        aria-label="Bereich"
        className="mb-4 grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-line bg-surface p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() =>
              setParams(t.value === 'skills' ? {} : { tab: t.value }, { replace: true })
            }
            className={cn(
              'min-h-11 rounded-lg text-sm font-semibold transition',
              tab === t.value ? 'bg-surface-raised text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'skills' ? <SkillsTab /> : <MilestonesTab />}
    </>
  )
}

function Loading() {
  return (
    <div role="status" className="flex justify-center py-12">
      <Spinner className="text-accent" />
    </div>
  )
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="flex flex-col items-start gap-3 text-sm text-fg-muted">
      Die Ziele konnten nicht geladen werden.
      <Button variant="secondary" onClick={onRetry}>
        Erneut versuchen
      </Button>
    </Card>
  )
}

function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{title}</h2>
        {aside}
      </div>
      {children}
    </Card>
  )
}

function SkillsTab() {
  const skillGoals = useSkillGoals()
  if (skillGoals.isPending) return <Loading />
  if (skillGoals.isError) return <LoadError onRetry={() => void skillGoals.refetch()} />

  const { goals } = skillGoals.data
  const goalOf = (slug: string) => goals.find((g) => g.skillSlug === slug)
  const active = activeGoals(goals).flatMap((goal) => {
    const skill = getSkill(goal.skillSlug)
    return skill ? [{ skill, goal }] : []
  })
  const suggestions = suggestSkills(SKILL_LIBRARY, goals)
  const achieved = goals
    .filter((g) => g.status === 'achieved')
    .flatMap((goal) => {
      const skill = getSkill(goal.skillSlug)
      return skill ? [{ skill, goal }] : []
    })

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Aktive Ziele"
        aside={
          <span className="text-sm text-fg-muted">
            {active.length} / {MAX_ACTIVE_SKILLS}
          </span>
        }
      >
        {active.length === 0 ? (
          <p className="text-sm text-fg-muted">
            Noch kein aktives Ziel. Wähle unten einen Skill – höchstens {MAX_ACTIVE_SKILLS}{' '}
            gleichzeitig, am besten 1–2 Kraft- bzw. Balance-Ziele und 1 Beweglichkeitsziel.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {active.map(({ skill, goal }) => (
              <ActiveGoalLink key={skill.slug} skill={skill} goal={goal} />
            ))}
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-fg-muted">Vorschläge passend zu deinen Zielen:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((skill) => (
                <Link
                  key={skill.slug}
                  to={`/goals/${skill.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium hover:border-accent hover:text-accent"
                >
                  {skill.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </Section>

      {achieved.length > 0 && (
        <Section title="Erreicht">
          <ul className="flex flex-wrap gap-2">
            {achieved.map(({ skill, goal }) => (
              <li key={skill.slug}>
                <Link
                  to={`/goals/${skill.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-hyrox/15 px-4 text-sm font-semibold text-hyrox"
                >
                  🏅 {skill.name}
                  {goal.achievedAt && (
                    <span className="font-normal">
                      · {dateFormat.format(new Date(goal.achievedAt))}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
        {SKILL_AREAS.map((area) => {
          const skills = SKILL_LIBRARY.filter((s) => s.area === area)
          return (
            <Section key={area} title={SKILL_AREA_LABELS[area]}>
              <ul className="divide-y divide-line">
                {skills.map((skill) => (
                  <li key={skill.slug}>
                    <SkillRow
                      skill={skill}
                      goal={goalOf(skill.slug)}
                      locked={!requirementMet(skill, goals)}
                    />
                  </li>
                ))}
              </ul>
            </Section>
          )
        })}
      </div>
    </div>
  )
}

function MilestonesTab() {
  const milestoneData = useMilestoneData()
  if (milestoneData.isPending) return <Loading />
  if (milestoneData.isError || !milestoneData.data) {
    return <LoadError onRetry={milestoneData.refetch} />
  }

  const series = milestoneSeries(MILESTONE_LIBRARY, milestoneData.data)
  const needsWeight = series.some((s) => s.items.some((i) => i.missingBodyWeight))

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-fg-muted">
        Meilensteine kommen aus deinem normalen Training und deinen Bestleistungen – ganz ohne
        Extra-Block.
      </p>
      {needsWeight && (
        <Card className="text-sm text-fg-muted">
          Für die Kraft-Meilensteine fehlt dein Körpergewicht.{' '}
          <Link to="/stats?tab=body" className="font-medium text-accent">
            Jetzt eintragen →
          </Link>
        </Card>
      )}
      <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
        {MILESTONE_AREAS.map((area) => {
          const areaSeries = series.filter((s) => s.items[0]?.milestone.area === area)
          return (
            <Section key={area} title={MILESTONE_AREA_LABELS[area]}>
              <ul className="flex flex-col gap-4">
                {areaSeries.map((s) => {
                  const shown = s.next ?? s.items.at(-1)!
                  const done = s.next === undefined
                  return (
                    <li key={s.series} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-medium">{shown.milestone.name}</p>
                        <span className="shrink-0 text-xs text-fg-muted">
                          {s.achievedCount} / {s.items.length} geschafft
                        </span>
                      </div>
                      <ProgressBar
                        ratio={shown.ratio}
                        tone={done ? 'done' : 'accent'}
                        label={`${shown.milestone.name}: ${Math.round(shown.ratio * 100)} %`}
                      />
                      <p className="text-xs text-fg-muted">{describeMilestoneProgress(shown)}</p>
                      {s.achievedCount > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {s.items
                            .filter((i) => i.achieved)
                            .map((i) => (
                              <Badge key={i.milestone.slug} tone="hyrox">
                                ✓ {i.milestone.name}
                              </Badge>
                            ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Section>
          )
        })}
      </div>
    </div>
  )
}
