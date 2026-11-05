/**
 * Skill-Ziele und Meilensteine – zentrale Datenquelle im Code (docs/SKILLS.md).
 * Pflege: Skills in skills.ts, Meilensteine in milestones.ts, danach `npm run test`.
 * Neue Übungen für Stufen gehören in die Übungsbibliothek (src/data/exercises/skills.ts).
 */
import { MILESTONES } from './milestones'
import {
  milestoneSchema,
  skillSchema,
  type MilestoneDefinition,
  type SkillDefinition,
  type SkillStage,
} from './schema'
import { SKILLS } from './skills'

/** Höchstens so viele Skill-Ziele gleichzeitig aktiv (docs/SKILLS.md §2.6). */
export const MAX_ACTIVE_SKILLS = 3

export const SKILL_LIBRARY: readonly SkillDefinition[] = SKILLS.map((skill) =>
  skillSchema.parse(skill),
)

export const MILESTONE_LIBRARY: readonly MilestoneDefinition[] = MILESTONES.map((milestone) =>
  milestoneSchema.parse(milestone),
)

const SKILL_BY_SLUG = new Map(SKILL_LIBRARY.map((skill) => [skill.slug, skill]))
const MILESTONE_BY_SLUG = new Map(MILESTONE_LIBRARY.map((m) => [m.slug, m]))

export function getSkill(slug: string): SkillDefinition | undefined {
  return SKILL_BY_SLUG.get(slug)
}

export function getMilestone(slug: string): MilestoneDefinition | undefined {
  return MILESTONE_BY_SLUG.get(slug)
}

/** Stufe nach Nummer (1-basiert, wie in der App angezeigt). */
export function getStage(skill: SkillDefinition, stage: number): SkillStage | undefined {
  return Number.isInteger(stage) && stage >= 1 ? skill.stages[stage - 1] : undefined
}

/** Alle Übungen, die ein Skill über alle Stufen nutzt (für Geräte- und Ermüdungsprüfung). */
export function skillExerciseSlugs(skill: SkillDefinition): string[] {
  return [...new Set(skill.stages.flatMap((stage) => stage.exercises))]
}

export * from './schema'
