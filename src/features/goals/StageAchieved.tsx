import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { StageProgress } from '@/domain/skills/detect'
import { completeCurrentStage, type SkillGoal } from '@/domain/skills/goals'
import { describeCriterion } from './format'
import { useSetSkillProgress } from './useSkillGoals'

/**
 * „Stufe geschafft!" laut Training – mit Bestätigung (Wiederholungen mit Hilfe oder
 * unsauber? Dann „Noch nicht"). Bleibt nach dem Bestätigen mit einer Meldung stehen.
 */
export function StageAchievedCards({
  detected,
  goals,
  sessionId,
}: {
  detected: readonly StageProgress[]
  goals: readonly SkillGoal[]
  /** Gerade gespeichertes Training – wird bevorzugt im Verlauf vermerkt */
  sessionId?: string | undefined
}) {
  const save = useSetSkillProgress()
  const [done, setDone] = useState<Record<string, string>>({})
  const [dismissed, setDismissed] = useState<string[]>([])

  const open = detected.filter(
    (d) => !dismissed.includes(d.skill.slug) && done[d.skill.slug] === undefined,
  )
  const messages = Object.entries(done)
  if (open.length === 0 && messages.length === 0) return null

  function confirm(progress: StageProgress) {
    const goal = goals.find((g) => g.skillSlug === progress.skill.slug)
    if (!goal) return
    const update = completeCurrentStage(progress.skill, goal)
    const next = progress.skill.stages[progress.stageNumber]
    save.mutate(
      {
        skillSlug: progress.skill.slug,
        update,
        source: 'session',
        sessionId:
          sessionId && progress.sessionIds.includes(sessionId)
            ? sessionId
            : progress.sessionIds.at(-1),
      },
      {
        onSuccess: () =>
          setDone((d) => ({
            ...d,
            [progress.skill.slug]:
              update.status === 'achieved'
                ? `🏅 ${progress.skill.name} erreicht – alle Stufen geschafft!`
                : `Eingetragen. Weiter mit Stufe ${progress.stageNumber + 1}: ${next?.title ?? ''}`,
          })),
      },
    )
  }

  return (
    <>
      {open.map((progress) => (
        <Card key={progress.skill.slug} className="flex flex-col gap-3 border-hyrox/40 bg-hyrox/10">
          <h2 className="font-display text-2xl font-bold text-hyrox uppercase">
            🏅 Stufe geschafft!
          </h2>
          <div>
            <p className="font-semibold">
              {progress.skill.name} · Stufe {progress.stageNumber}
            </p>
            <p className="text-sm">{progress.stage.title}</p>
          </div>
          <ul className="flex flex-col gap-1 text-sm text-fg-muted">
            {progress.criteria.map((c, i) => (
              <li key={i}>✓ {describeCriterion(c)}</li>
            ))}
          </ul>
          <p className="text-xs text-fg-muted">
            Sauber und ohne Hilfe geschafft? Dann bestätige die Stufe.
          </p>
          {save.isError && (
            <p role="alert" className="text-sm text-danger">
              Speichern fehlgeschlagen. Bitte versuche es erneut.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button loading={save.isPending} onClick={() => confirm(progress)}>
              Stufe bestätigen
            </Button>
            <Button
              variant="ghost"
              disabled={save.isPending}
              onClick={() => setDismissed((d) => [...d, progress.skill.slug])}
            >
              Noch nicht
            </Button>
          </div>
        </Card>
      ))}
      {messages.map(([slug, message]) => (
        <Card key={slug} role="status" className="flex flex-col gap-2 border-hyrox/40">
          <p className="font-semibold text-hyrox">{message}</p>
          <Link to={`/goals/${slug}`} className="text-sm font-medium text-accent">
            Zum Skill-Ziel →
          </Link>
        </Card>
      ))}
    </>
  )
}
