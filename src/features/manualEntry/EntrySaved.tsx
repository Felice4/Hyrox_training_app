import { Link } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import type { SaveSessionResult } from '@/api/sessions'
import { Card } from '@/components/ui/Card'
import { detectCompletedStages } from '@/domain/skills/detect'
import { StageAchievedCards } from '@/features/goals/StageAchieved'
import { useSkillGoals } from '@/features/goals/useSkillGoals'
import { describeRecord } from '@/features/training/format'
import { useTrainingHistory } from '@/features/training/useTrainingHistory'

/**
 * Bestätigung nach dem Eintragen: neue Bestleistungen und geschaffte Skill-Stufen
 * (wie nach einem Training im Trainingsmodus).
 */
export function EntrySaved({
  result,
  catalog,
  showRecords,
  calendarLink,
}: {
  result: SaveSessionResult
  catalog: readonly CatalogExercise[]
  /** Beim Bearbeiten wären „neue" Bestleistungen irreführend (sie wurden neu berechnet) */
  showRecords: boolean
  calendarLink: string
}) {
  const nameOf = (slug: string) => catalog.find((e) => e.slug === slug)?.name ?? slug
  const skillGoals = useSkillGoals()
  const history = useTrainingHistory()
  const detected =
    skillGoals.data && history.data
      ? detectCompletedStages(skillGoals.data.goals, skillGoals.data.log, history.data).filter(
          (d) => d.sessionIds.includes(result.session_id),
        )
      : []

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-accent/40">
        <h2 className="font-display text-3xl font-bold tracking-wide uppercase">Gespeichert ✓</h2>
        <p className="text-sm text-fg-muted">
          Das Training steht jetzt im Kalender und zählt für Belastung, Statistik und
          Gewichtsvorschläge.
        </p>
      </Card>
      <StageAchievedCards
        detected={detected}
        goals={skillGoals.data?.goals ?? []}
        sessionId={result.session_id}
      />
      {showRecords && result.new_records.length > 0 && (
        <Card className="flex flex-col gap-3 border-accent/40">
          <h2 className="font-display text-2xl font-bold text-accent uppercase">
            {result.new_records.length === 1 ? 'Neue Bestleistung!' : 'Neue Bestleistungen!'}
          </h2>
          <ul className="flex flex-col gap-2">
            {result.new_records.map((record) => {
              const { label, value } = describeRecord(record)
              return (
                <li
                  key={`${record.exercise_slug}-${record.record_type}-${record.context_key}`}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span>
                    <span className="font-semibold">{nameOf(record.exercise_slug)}</span>
                    <span className="block text-xs text-fg-muted">{label}</span>
                  </span>
                  <span className="font-display text-2xl font-bold">{value}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
      <Link
        to={calendarLink}
        className="inline-flex min-h-14 items-center justify-center rounded-xl bg-accent px-5 text-lg font-semibold text-on-accent shadow-glow transition duration-200 hover:bg-accent-strong active:scale-[0.97]"
      >
        Zum Kalender
      </Link>
      <Link
        to={`/history/${result.session_id}`}
        className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-semibold text-fg-muted hover:bg-surface-raised"
      >
        Training ansehen
      </Link>
    </div>
  )
}
