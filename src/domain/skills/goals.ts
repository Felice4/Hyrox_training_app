import { getStage, MAX_ACTIVE_SKILLS, type SkillDefinition, type SkillStage } from '@/data/skills'

/**
 * Skill-Ziele: Fortschritt, Aktivieren und Vorschläge (docs/SKILLS.md §2 und §5).
 * Reine Funktionen – die Datenbank speichert nur Status und Zahl der geschafften Stufen.
 */

export const SKILL_GOAL_STATUSES = ['active', 'later', 'achieved'] as const
export type SkillGoalStatus = (typeof SKILL_GOAL_STATUSES)[number]

export const STAGE_SOURCES = ['assessment', 'manual', 'session'] as const
export type StageSource = (typeof STAGE_SOURCES)[number]

export interface SkillGoal {
  skillSlug: string
  status: SkillGoalStatus
  /** Anzahl geschaffter Stufen; trainiert wird Stufe completedStages + 1. */
  completedStages: number
  activatedAt: string | null
  achievedAt: string | null
}

export interface StageLogEntry {
  skillSlug: string
  stage: number
  achievedAt: string
  source: StageSource
}

/** Zustand eines Skills aus Sicht der App; `none` = noch nicht gewählt. */
export interface SkillState {
  status: SkillGoalStatus | 'none'
  completed: number
  total: number
  /** Nummer der Stufe, an der gearbeitet wird (1-basiert); `undefined`, wenn alle geschafft. */
  currentNumber: number | undefined
  current: SkillStage | undefined
}

export function skillState(skill: SkillDefinition, goal: SkillGoal | undefined): SkillState {
  const total = skill.stages.length
  const completed = Math.min(Math.max(goal?.completedStages ?? 0, 0), total)
  const currentNumber = completed < total ? completed + 1 : undefined
  return {
    status: goal?.status ?? 'none',
    completed,
    total,
    currentNumber,
    current: currentNumber === undefined ? undefined : getStage(skill, currentNumber),
  }
}

/** Ist die Voraussetzung (anderer Skill bis zu einer Stufe) erfüllt? */
export function requirementMet(skill: SkillDefinition, goals: readonly SkillGoal[]): boolean {
  if (!skill.requires) return true
  const { skill: slug, stage } = skill.requires
  const required = goals.find((g) => g.skillSlug === slug)
  return (required?.completedStages ?? 0) >= stage
}

export const activeGoals = (goals: readonly SkillGoal[]) =>
  goals.filter((g) => g.status === 'active')

export type ActivationCheck =
  { ok: true } | { ok: false; reason: 'limit' | 'requirement' | 'achieved' | 'active' }

/** Darf der Skill jetzt aktiviert werden? (höchstens drei aktive Ziele, Voraussetzung erfüllt) */
export function canActivate(skill: SkillDefinition, goals: readonly SkillGoal[]): ActivationCheck {
  const goal = goals.find((g) => g.skillSlug === skill.slug)
  if (goal?.status === 'active') return { ok: false, reason: 'active' }
  if (goal?.status === 'achieved') return { ok: false, reason: 'achieved' }
  if (!requirementMet(skill, goals)) return { ok: false, reason: 'requirement' }
  if (activeGoals(goals).length >= MAX_ACTIVE_SKILLS) return { ok: false, reason: 'limit' }
  return { ok: true }
}

export interface ProgressUpdate {
  status: SkillGoalStatus
  completedStages: number
}

/**
 * Aktivieren mit Einstufung: `startStage` = Stufe, an der gearbeitet werden soll
 * (1 = von vorn bzw. „weiß ich nicht").
 */
export function activateAt(skill: SkillDefinition, startStage: number): ProgressUpdate {
  const total = skill.stages.length
  const start = Math.min(Math.max(Math.trunc(startStage), 1), total)
  return { status: 'active', completedStages: start - 1 }
}

/** Aktuelle Stufe geschafft: eine Stufe weiter, nach der letzten ist das Ziel erreicht. */
export function completeCurrentStage(skill: SkillDefinition, goal: SkillGoal): ProgressUpdate {
  const total = skill.stages.length
  const completedStages = Math.min(goal.completedStages + 1, total)
  return { status: completedStages >= total ? 'achieved' : goal.status, completedStages }
}

/**
 * Vorschläge für neue Ziele: noch nicht gewählt, Voraussetzung erfüllt, keine Fernziele.
 * Bevorzugt Arten, die unter den aktiven Zielen fehlen – so entsteht die empfohlene
 * Mischung aus Kraft/Balance und Beweglichkeit. Bei stabiler Sortierung bleibt sonst
 * die Reihenfolge der Bibliothek erhalten.
 */
export function suggestSkills(
  skills: readonly SkillDefinition[],
  goals: readonly SkillGoal[],
  limit = 3,
): SkillDefinition[] {
  const slots = MAX_ACTIVE_SKILLS - activeGoals(goals).length
  if (slots <= 0) return []
  const chosen = new Set(goals.map((g) => g.skillSlug))
  const bySlug = new Map(skills.map((s) => [s.slug, s]))
  // Abgedeckte Arten: aktive Ziele plus bereits ausgewählte Vorschläge
  const covered: SkillDefinition['kind'][] = activeGoals(goals).flatMap((g) => {
    const kind = bySlug.get(g.skillSlug)?.kind
    return kind ? [kind] : []
  })

  const rank = (skill: SkillDefinition) => {
    const hasMobility = covered.includes('mobility')
    const hasStrength = covered.includes('strength') || covered.includes('balance')
    if (!hasMobility && skill.kind === 'mobility') return 0
    if (!hasStrength && (skill.kind === 'strength' || skill.kind === 'balance')) return 0
    return covered.includes(skill.kind) ? 2 : 1
  }

  const candidates = skills.filter(
    (s) => !chosen.has(s.slug) && !s.longTerm && requirementMet(s, goals),
  )
  const result: SkillDefinition[] = []
  while (result.length < limit && candidates.length > 0) {
    // Bester Rang gewinnt, bei Gleichstand die Reihenfolge der Bibliothek
    let bestIndex = 0
    candidates.forEach((skill, index) => {
      if (rank(skill) < rank(candidates[bestIndex]!)) bestIndex = index
    })
    const [next] = candidates.splice(bestIndex, 1)
    result.push(next!)
    covered.push(next!.kind)
  }
  return result
}

/** Datum, an dem eine Stufe geschafft wurde (aus dem Verlauf). */
export function stageAchievedAt(
  log: readonly StageLogEntry[],
  skillSlug: string,
  stage: number,
): StageLogEntry | undefined {
  return log.find((e) => e.skillSlug === skillSlug && e.stage === stage)
}
