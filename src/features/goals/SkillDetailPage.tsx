import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeftIcon, InfoIcon, TargetIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { getLibraryExercise } from '@/data/exercises'
import {
  getSkill,
  MAX_ACTIVE_SKILLS,
  SKILL_AREA_LABELS,
  SKILL_KIND_LABELS,
  type SkillDefinition,
} from '@/data/skills'
import {
  activateAt,
  canActivate,
  completeCurrentStage,
  skillState,
  stageAchievedAt,
  type ActivationCheck,
  type SkillGoal,
  type StageLogEntry,
} from '@/domain/skills/goals'
import { stageProgress } from '@/domain/skills/detect'
import { useTrainingHistory } from '@/features/training/useTrainingHistory'
import { cn } from '@/lib/cn'
import { describeCriterion, requirementText, STATUS_LABELS } from './format'
import { ProgressBar } from './parts'
import { StageAchievedCards } from './StageAchieved'
import { useDeleteSkillGoal, useSetSkillProgress, useSkillGoals } from './useSkillGoals'

const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
})

const BLOCKED_TEXT: Record<Exclude<ActivationCheck, { ok: true }>['reason'], string> = {
  limit: `Du hast schon ${MAX_ACTIVE_SKILLS} aktive Ziele. Schiebe eines auf „Später", um dieses zu starten.`,
  requirement: '',
  achieved: 'Dieses Ziel hast du bereits erreicht.',
  active: '',
}

export function SkillDetailPage() {
  const { slug = '' } = useParams()
  const skill = getSkill(slug)
  const skillGoals = useSkillGoals()

  if (!skill) {
    return (
      <>
        <BackLink />
        <EmptyState icon={TargetIcon} title="Ziel nicht gefunden">
          <Link to="/goals" className="text-accent">
            Zur Übersicht
          </Link>
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <BackLink />
      <PageHeader title={skill.name} subtitle={skill.description} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge>{SKILL_AREA_LABELS[skill.area]}</Badge>
        <Badge>{SKILL_KIND_LABELS[skill.kind]}</Badge>
        {skill.longTerm && <Badge tone="hyrox">Fernziel</Badge>}
      </div>

      {skillGoals.isPending ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : skillGoals.isError ? (
        <Card className="flex flex-col items-start gap-3 text-sm text-fg-muted">
          Der Fortschritt konnte nicht geladen werden.
          <Button variant="secondary" onClick={() => void skillGoals.refetch()}>
            Erneut versuchen
          </Button>
        </Card>
      ) : (
        <SkillContent skill={skill} goals={skillGoals.data.goals} log={skillGoals.data.log} />
      )}
    </>
  )
}

function BackLink() {
  return (
    <Link
      to="/goals"
      className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-fg-muted hover:text-fg"
    >
      <ChevronLeftIcon width={18} height={18} /> Ziele
    </Link>
  )
}

function SkillContent({
  skill,
  goals,
  log,
}: {
  skill: SkillDefinition
  goals: SkillGoal[]
  log: StageLogEntry[]
}) {
  const goal = goals.find((g) => g.skillSlug === skill.slug)
  const state = skillState(skill, goal)
  const [assessing, setAssessing] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {skill.safety && (
        <Card className="flex gap-3 border-hyrox/40 bg-hyrox/10 text-sm">
          <InfoIcon className="shrink-0 text-hyrox" />
          <p>{skill.safety}</p>
        </Card>
      )}

      {goal?.status === 'active' && !assessing ? (
        <ActiveCard skill={skill} goal={goal} log={log} onReassess={() => setAssessing(true)} />
      ) : goal?.status === 'achieved' ? (
        <AchievedCard skill={skill} goal={goal} />
      ) : (
        <StartCard
          skill={skill}
          goal={goal}
          check={canActivate(skill, goals)}
          onDone={() => setAssessing(false)}
          onCancel={assessing ? () => setAssessing(false) : undefined}
        />
      )}

      <Card>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-fg-muted uppercase">Stufen</h2>
          <span className="text-sm text-fg-muted">
            {state.completed} / {state.total} geschafft
          </span>
        </div>
        <ol className="flex flex-col">
          {skill.stages.map((stage, index) => {
            const number = index + 1
            const done = number <= state.completed
            const current = goal !== undefined && number === state.currentNumber
            const entry = done ? stageAchievedAt(log, skill.slug, number) : undefined
            return (
              <li
                key={number}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex gap-3 border-l-2 py-3 pl-4',
                  done ? 'border-hyrox' : current ? 'border-accent' : 'border-line',
                )}
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold',
                    done
                      ? 'bg-hyrox text-on-accent'
                      : current
                        ? 'bg-accent text-on-accent'
                        : 'bg-surface-raised text-fg-muted',
                  )}
                  aria-label={done ? `Stufe ${number} geschafft` : `Stufe ${number}`}
                >
                  {done ? '✓' : number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn('font-semibold', !done && !current && 'text-fg-muted')}>
                    {stage.title}
                  </p>
                  {stage.note && <p className="text-xs text-fg-muted">{stage.note}</p>}
                  {entry && (
                    <p className="text-xs text-fg-muted">
                      {entry.source === 'assessment' ? 'Bei der Einstufung angegeben' : 'Geschafft'}{' '}
                      am {dateFormat.format(new Date(entry.achievedAt))}
                    </p>
                  )}
                  {stage.criteria.some((c) => c.kind === 'manual') && !done && (
                    <p className="text-xs text-fg-muted">
                      Bestätigst du selbst, sobald du es kannst.
                    </p>
                  )}
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {stage.exercises.map((exerciseSlug) => (
                      <li key={exerciseSlug}>
                        <Link
                          to={`/exercises/${exerciseSlug}`}
                          className="inline-flex min-h-9 items-center rounded-full border border-line px-3 text-xs hover:border-accent hover:text-accent"
                        >
                          {getLibraryExercise(exerciseSlug)?.name ?? exerciseSlug}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          })}
        </ol>
      </Card>

      {goal && <RemoveGoal skill={skill} />}
    </div>
  )
}

/** Ziel starten bzw. „Später"-Ziel wieder aufnehmen – mit Einstufung. */
function StartCard({
  skill,
  goal,
  check,
  onDone,
  onCancel,
}: {
  skill: SkillDefinition
  goal: SkillGoal | undefined
  check: ActivationCheck
  onDone: () => void
  onCancel: (() => void) | undefined
}) {
  const save = useSetSkillProgress()
  const [start, setStart] = useState<number>(skillState(skill, goal).currentNumber ?? 1)
  const reassessing = goal?.status === 'active'
  const options = skill.stages.map((_, index) => ({
    value: index + 1,
    label: `Stufe ${index + 1}`,
  }))
  const blocked = !check.ok && !reassessing
  const blockedText = check.ok
    ? ''
    : check.reason === 'requirement'
      ? `${requirementText(skill)} – erst dann lässt sich dieses Ziel starten.`
      : BLOCKED_TEXT[check.reason]

  function submit(status: 'active' | 'later') {
    const update = { ...activateAt(skill, start), status }
    save.mutate({ skillSlug: skill.slug, update, source: 'assessment' }, { onSuccess: onDone })
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold">
          {reassessing
            ? 'Einstufung ändern'
            : goal?.status === 'later'
              ? 'Ziel fortsetzen'
              : 'Ziel starten'}
        </h2>
        <p className="text-sm text-fg-muted">
          Wähle die erste Stufe, die du noch <strong className="text-fg">nicht</strong> sicher
          schaffst. Unsicher? Starte mit Stufe 1 – die ersten Stufen sind schnell erledigt.
        </p>
      </div>
      <SingleChoiceChips
        label="Ich arbeite an"
        options={options}
        value={start}
        onChange={setStart}
      />
      <p className="-mt-2 text-sm">
        <span className="text-fg-muted">Stufe {start}:</span> {skill.stages[start - 1]?.title}
      </p>
      {blocked && blockedText && <p className="text-sm text-hyrox">{blockedText}</p>}
      {save.isError && (
        <p role="alert" className="text-sm text-danger">
          Speichern fehlgeschlagen. Bitte versuche es erneut.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={blocked} loading={save.isPending} onClick={() => submit('active')}>
          {reassessing ? 'Speichern' : 'Als aktives Ziel starten'}
        </Button>
        {!reassessing && (
          <Button variant="secondary" disabled={save.isPending} onClick={() => submit('later')}>
            Für später merken
          </Button>
        )}
        {onCancel && (
          <Button variant="ghost" disabled={save.isPending} onClick={onCancel}>
            Abbrechen
          </Button>
        )}
      </div>
    </Card>
  )
}

function ActiveCard({
  skill,
  goal,
  log,
  onReassess,
}: {
  skill: SkillDefinition
  goal: SkillGoal
  log: StageLogEntry[]
  onReassess: () => void
}) {
  const save = useSetSkillProgress()
  const state = skillState(skill, goal)
  const history = useTrainingHistory()
  const progress = history.data ? stageProgress(goal, log, history.data) : undefined
  const [justDone, setJustDone] = useState<string | undefined>()

  function completeStage() {
    if (!state.current || state.currentNumber === undefined) return
    const confirmed = window.confirm(
      `Stufe ${state.currentNumber} „${state.current.title}" als geschafft eintragen?`,
    )
    if (!confirmed) return
    const title = state.current.title
    save.mutate(
      { skillSlug: skill.slug, update: completeCurrentStage(skill, goal), source: 'manual' },
      { onSuccess: () => setJustDone(title) },
    )
  }

  return (
    <>
      {/* Immer eingebunden, damit die Bestätigung nach dem Speichern stehen bleibt */}
      <StageAchievedCards detected={progress?.met ? [progress] : []} goals={[goal]} />
      <Card className="flex flex-col gap-4 border-accent/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-fg-muted">
              {STATUS_LABELS.active} · Stufe {state.currentNumber} von {state.total}
            </p>
            <p className="font-display text-2xl font-bold uppercase">{state.current?.title}</p>
          </div>
        </div>
        <ProgressBar
          ratio={state.completed / state.total}
          label={`${state.completed} von ${state.total} Stufen geschafft`}
        />
        {justDone && (
          <p role="status" className="font-semibold text-hyrox">
            Stark! „{justDone}" ist geschafft.
          </p>
        )}
        {progress && !progress.manualOnly && (
          <div className="text-sm">
            <p className="text-fg-muted">Dein Bestwert seit Beginn der Stufe:</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {progress.criteria.map((c, i) => (
                <li key={i} className={c.met ? 'text-hyrox' : undefined}>
                  {c.met ? '✓ ' : ''}
                  {describeCriterion(c)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-sm text-fg-muted">
          {progress?.manualOnly
            ? 'Diese Stufe bestätigst du selbst, sobald du sie sicher kannst.'
            : 'Die App erkennt die Stufe nach dem Speichern eines Trainings. Im Test außerhalb der App geschafft? Dann trage sie hier ein.'}
        </p>
        {save.isError && (
          <p role="alert" className="text-sm text-danger">
            Speichern fehlgeschlagen. Bitte versuche es erneut.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button loading={save.isPending} onClick={completeStage}>
            Stufe geschafft
          </Button>
          <Button
            variant="secondary"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                skillSlug: skill.slug,
                update: { status: 'later', completedStages: goal.completedStages },
                source: 'manual',
              })
            }
          >
            Auf später verschieben
          </Button>
          <Button variant="ghost" disabled={save.isPending} onClick={onReassess}>
            Einstufung ändern
          </Button>
        </div>
      </Card>
    </>
  )
}

function AchievedCard({ skill, goal }: { skill: SkillDefinition; goal: SkillGoal }) {
  return (
    <Card className="flex items-center gap-4 border-hyrox/40 bg-hyrox/10">
      <span className="text-4xl" aria-hidden="true">
        🏅
      </span>
      <div>
        <p className="font-display text-2xl font-bold text-hyrox uppercase">Erreicht!</p>
        <p className="text-sm text-fg-muted">
          Alle {skill.stages.length} Stufen geschafft
          {goal.achievedAt && ` · ${dateFormat.format(new Date(goal.achievedAt))}`}
        </p>
      </div>
    </Card>
  )
}

function RemoveGoal({ skill }: { skill: SkillDefinition }) {
  const remove = useDeleteSkillGoal()
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="ghost"
        className="text-sm"
        loading={remove.isPending}
        onClick={() => {
          if (
            window.confirm(
              `Ziel „${skill.name}" entfernen? Dein Fortschritt und die Daten der Stufen werden gelöscht.`,
            )
          ) {
            remove.mutate(skill.slug, { onSuccess: () => void navigate('/goals') })
          }
        }}
      >
        Ziel entfernen
      </Button>
      {remove.isError && (
        <p role="alert" className="text-sm text-danger">
          Entfernen fehlgeschlagen. Bitte versuche es erneut.
        </p>
      )}
    </div>
  )
}
