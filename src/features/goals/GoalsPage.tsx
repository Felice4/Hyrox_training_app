import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronRightIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import {
  MAX_ACTIVE_SKILLS,
  MILESTONE_AREA_LABELS,
  MILESTONE_AREAS,
  SKILL_AREA_LABELS,
  SKILL_AREAS,
  SKILL_LIBRARY,
  getSkill,
} from '@/data/skills'
import { activeGoals, requirementMet, suggestSkills } from '@/domain/skills/goals'
import {
  resolvedProgress,
  type MilestoneProgress,
  type ResolvedMilestone,
} from '@/domain/skills/milestones'
import type { SkillBlockSetting } from '@/domain/generator'
import { toSkillBlockSetting } from '@/features/generator/inputs'
import { useProfileDetails, useSaveSkillBlock } from '@/features/profile/useProfile'
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

      {active.length > 0 && <SkillBlockSettingCard />}

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

const SKILL_BLOCK_CHOICES: { value: SkillBlockSetting; label: string }[] = [
  { value: 'off', label: 'Aus' },
  { value: 'small', label: 'Klein' },
  { value: 'normal', label: 'Normal' },
]
const SKILL_BLOCK_HINTS: Record<SkillBlockSetting, string> = {
  off: 'Der Generator plant keine Skills ein. In der Vorschau kannst du trotzdem einen Skill einbauen.',
  small: 'Etwa 8 % der Trainingsdauer – bei 60 min rund 5 min.',
  normal: 'Etwa 15 % der Trainingsdauer, höchstens 15 min – bei 60 min rund 9 min.',
}

/** Umfang des Skill-Blocks, den der Generator automatisch einplant. */
function SkillBlockSettingCard() {
  const details = useProfileDetails()
  const save = useSaveSkillBlock()
  if (!details.data) return null
  const value =
    save.isPending && save.variables ? save.variables : toSkillBlockSetting(details.data)

  return (
    <Section title="Skill-Block im Training">
      <SingleChoiceChips<SkillBlockSetting>
        label="Umfang"
        options={SKILL_BLOCK_CHOICES}
        value={value}
        onChange={(setting) => save.mutate(setting)}
      />
      <p className="mt-2 text-sm text-fg-muted">{SKILL_BLOCK_HINTS[value]}</p>
      <p className="mt-1 text-xs text-fg-muted">
        Die Zeit geht vom Training ab, das Haupttraining hat Vorrang. Kraft- und Balance-Skills
        kommen ans Ende des Warm-ups, Beweglichkeit ins Cool-down; mehrere Ziele wechseln sich ab.
      </p>
      {save.isError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          Speichern fehlgeschlagen. Bitte versuche es erneut.
        </p>
      )}
    </Section>
  )
}

function MilestonesTab() {
  const milestoneData = useMilestoneData()
  if (milestoneData.isPending) return <Loading />
  if (milestoneData.isError || !milestoneData.data || !milestoneData.milestones) {
    return <LoadError onRetry={milestoneData.refetch} />
  }

  const data = milestoneData.data
  const all = milestoneData.milestones.map((milestone) => ({
    milestone,
    progress: resolvedProgress(milestone, data),
  }))
  const visible = all.filter((m) => !m.milestone.hidden)
  const hidden = all.filter((m) => m.milestone.hidden)
  const needsWeight = visible.some((m) => m.progress.missingBodyWeight)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          Meilensteine füllen sich aus deinem Training und deinen Bestleistungen. Tippe auf einen
          Meilenstein, um ihn zu ändern, zurückzusetzen oder einen Stand einzutragen.
        </p>
        <Link
          to="/goals/milestones/new"
          className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent"
        >
          + Eigener Meilenstein
        </Link>
      </div>
      {needsWeight && (
        <Card className="text-sm text-fg-muted">
          Für Meilensteine im Verhältnis zum Körpergewicht fehlt dein Gewicht.{' '}
          <Link to="/stats?tab=body" className="font-medium text-accent">
            Jetzt eintragen →
          </Link>
        </Card>
      )}
      <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
        {MILESTONE_AREAS.map((area) => {
          const items = visible.filter((m) => m.milestone.definition.area === area)
          if (items.length === 0) return null
          return (
            <Section
              key={area}
              title={MILESTONE_AREA_LABELS[area]}
              aside={
                <span className="text-xs text-fg-muted">
                  {items.filter((i) => i.progress.achieved).length} / {items.length} geschafft
                </span>
              }
            >
              <ul className="divide-y divide-line">
                {items.map(({ milestone, progress }) => (
                  <li key={milestone.key}>
                    <MilestoneRow milestone={milestone} progress={progress} />
                  </li>
                ))}
              </ul>
            </Section>
          )
        })}
      </div>
      {hidden.length > 0 && (
        <Section title="Ausgeblendet">
          <ul className="divide-y divide-line">
            {hidden.map(({ milestone, progress }) => (
              <li key={milestone.key}>
                <MilestoneRow milestone={milestone} progress={progress} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

function MilestoneRow({
  milestone,
  progress,
}: {
  milestone: ResolvedMilestone
  progress: MilestoneProgress
}) {
  return (
    <Link
      to={`/goals/milestones/${milestone.key}`}
      className="flex items-center gap-3 py-3 hover:text-accent"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-medium">
            {progress.achieved && <span className="text-hyrox">✓ </span>}
            {milestone.definition.name}
          </p>
          <span className="flex shrink-0 gap-1">
            {!milestone.builtin && <Badge>Eigener</Badge>}
            {milestone.customized && <Badge>Geändert</Badge>}
          </span>
        </div>
        <ProgressBar
          ratio={progress.ratio}
          tone={progress.achieved ? 'done' : 'accent'}
          label={`${milestone.definition.name}: ${Math.round(progress.ratio * 100)} %`}
        />
        <p className="text-xs text-fg-muted">{describeMilestoneProgress(progress)}</p>
      </div>
      <ChevronRightIcon width={20} height={20} className="shrink-0 text-fg-muted" />
    </Link>
  )
}
