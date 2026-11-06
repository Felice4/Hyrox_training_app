import { SKILL_LIBRARY, type SkillKind } from '@/data/skills'
import type { SkillPractice } from '@/domain/generator'
import type { SkillGoal } from '@/domain/skills/goals'
import { toSkillPractice } from './inputs'

/** Skill zur Auswahl in der Vorschau („Skill üben"). */
export interface SkillOption {
  practice: SkillPractice
  name: string
  kind: SkillKind
  stageTitle: string
  /** Aktives Skill-Ziel */
  active: boolean
}

/**
 * Alle Skills, die noch Stufen offen haben – aktive Ziele zuerst. Die Stufe kommt aus dem
 * Ziel (auch „später"); ohne Ziel wird mit Stufe 1 begonnen.
 */
export function skillOptions(goals: readonly SkillGoal[]): SkillOption[] {
  const options = SKILL_LIBRARY.flatMap((skill): SkillOption[] => {
    const goal = goals.find((g) => g.skillSlug === skill.slug)
    if (goal?.status === 'achieved') return []
    const practice = toSkillPractice(skill.slug, goal)
    const stage = practice && skill.stages[practice.stage - 1]
    if (!practice || !stage) return []
    return [
      {
        practice,
        name: skill.name,
        kind: skill.kind,
        stageTitle: stage.title,
        active: goal?.status === 'active',
      },
    ]
  })
  return [...options.filter((o) => o.active), ...options.filter((o) => !o.active)]
}
