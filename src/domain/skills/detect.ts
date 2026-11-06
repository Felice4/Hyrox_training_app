import { getSkill, type Criterion, type SkillDefinition, type SkillStage } from '@/data/skills'
import type { HistorySession } from '@/domain/generator/types'
import type { SkillGoal, StageLogEntry } from './goals'

/**
 * Automatische Stufenprüfung (docs/SKILLS.md §5, Schritt 5.4): Hat das Training seit Beginn
 * der aktuellen Stufe das Kriterium erfüllt? Gewertet wird der beste einzelne Satz
 * (Wiederholungen am Stück, Haltezeit bzw. Strecke) – in allen Blöcken, also auch im
 * Skill-Block im Warm-up. Aufwärmsätze zählen nicht. „manual" wird nie automatisch erkannt.
 */

export interface CriterionProgress {
  criterion: Criterion
  /** Bester Wert seit Beginn der Stufe; `undefined` = noch nicht trainiert bzw. von Hand */
  best: number | undefined
  /** Ziel (Wiederholungen, Sekunden, Meter); `undefined` bei „manual" */
  target: number | undefined
  met: boolean
  /** Training, in dem der beste Wert erreicht wurde */
  sessionId: string | undefined
}

export interface StageProgress {
  skill: SkillDefinition
  stageNumber: number
  stage: SkillStage
  /** Ab wann gezählt wird (ISO): Aktivierung bzw. letzte geschaffte Stufe */
  since: string | undefined
  criteria: CriterionProgress[]
  /** Nur von Hand bestätigbar (z. B. Back Flip, Spagat-Höhe) */
  manualOnly: boolean
  /** Alle messbaren Kriterien erfüllt und keines „manual" */
  met: boolean
  /** Trainings, die zur Erfüllung beigetragen haben */
  sessionIds: string[]
}

const targetOf = (criterion: Criterion): number | undefined => {
  switch (criterion.kind) {
    case 'reps':
      return criterion.reps
    case 'hold':
      return criterion.seconds
    case 'distance':
      return criterion.meters
    case 'manual':
      return undefined
  }
}

/** Beginn der aktuellen Stufe: späteres von Aktivierung und letzter geschaffter Stufe. */
export function stageStart(goal: SkillGoal, log: readonly StageLogEntry[]): string | undefined {
  const dates = [
    goal.activatedAt,
    ...log.filter((e) => e.skillSlug === goal.skillSlug).map((e) => e.achievedAt),
  ].filter((d): d is string => d !== null && d !== undefined)
  if (dates.length === 0) return undefined
  return dates.reduce((latest, d) => (Date.parse(d) > Date.parse(latest) ? d : latest))
}

function bestFor(
  criterion: Criterion,
  sessions: readonly HistorySession[],
): { best: number | undefined; sessionId: string | undefined } {
  if (criterion.kind === 'manual') return { best: undefined, sessionId: undefined }
  let best: number | undefined
  let sessionId: string | undefined
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (exercise.exerciseSlug !== criterion.exercise) continue
      for (const set of exercise.sets) {
        if (!set.completed || set.setType === 'warmup') continue
        const value =
          criterion.kind === 'reps'
            ? set.reps
            : criterion.kind === 'hold'
              ? set.durationSec
              : set.distanceM
        if (value !== undefined && (best === undefined || value > best)) {
          best = value
          sessionId = session.id
        }
      }
    }
  }
  return { best, sessionId }
}

/** Stand der aktuellen Stufe eines aktiven Ziels; `undefined`, wenn alle Stufen geschafft. */
export function stageProgress(
  goal: SkillGoal,
  log: readonly StageLogEntry[],
  history: readonly HistorySession[],
): StageProgress | undefined {
  const skill = getSkill(goal.skillSlug)
  const stageNumber = goal.completedStages + 1
  const stage = skill?.stages[stageNumber - 1]
  if (!skill || !stage) return undefined

  const since = stageStart(goal, log)
  const sinceMs = since ? Date.parse(since) : -Infinity
  const sessions = history.filter((s) => Date.parse(s.startedAt) >= sinceMs)

  const criteria = stage.criteria.map((criterion): CriterionProgress => {
    const target = targetOf(criterion)
    const { best, sessionId } = bestFor(criterion, sessions)
    const met = target !== undefined && best !== undefined && best >= target
    return { criterion, best, target, met, sessionId }
  })
  const manualOnly = criteria.some((c) => c.criterion.kind === 'manual')
  const met = !manualOnly && criteria.every((c) => c.met)
  const sessionIds = met ? [...new Set(criteria.flatMap((c) => c.sessionId ?? []))] : []
  return { skill, stageNumber, stage, since, criteria, manualOnly, met, sessionIds }
}

/** Aktive Ziele, deren aktuelle Stufe laut Training geschafft ist. */
export function detectCompletedStages(
  goals: readonly SkillGoal[],
  log: readonly StageLogEntry[],
  history: readonly HistorySession[],
): StageProgress[] {
  return goals
    .filter((g) => g.status === 'active')
    .flatMap((goal) => {
      const progress = stageProgress(goal, log, history)
      return progress?.met ? [progress] : []
    })
}
