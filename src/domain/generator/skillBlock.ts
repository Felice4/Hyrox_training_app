import { MUSCLE_GROUP_LABELS } from '@/data/exercises/vocabulary'
import { getSkill, type SkillDefinition, type SkillStage } from '@/data/skills'
import { fatigueLevel, type MuscleFatigue } from '@/domain/load/muscleFatigue'
import type { TrainingLevel } from '@/domain/profile/vocabulary'
import { doseExercise } from './dosing'
import { estimateWorkoutItem } from './generateWorkout'
import type {
  BlockType,
  Focus,
  GeneratedWorkout,
  GeneratorExercise,
  HistorySession,
  Intensity,
  SkillBlockSetting,
  SkillPractice,
  SkillRequest,
  WorkoutBlock,
  WorkoutItem,
} from './types'

/**
 * Skill-Block (docs/SKILLS.md §2): kurzer Block für die aktiven Skill-Ziele.
 * Kraft-, Balance- und Sprung-Skills am Ende des Warm-ups, Beweglichkeit im Cool-down.
 * Das Haupttraining hat Vorrang – der Block ist Teil der Trainingsdauer und begrenzt.
 */

/** Anteil an der Trainingsdauer je Einstellung. */
export const SKILL_BLOCK_SHARE: Record<SkillBlockSetting, number> = {
  off: 0,
  small: 0.08,
  normal: 0.15,
}
/** Nie mehr als 15 Minuten. */
export const SKILL_BLOCK_MAX_SEC = 15 * 60
/** Unter 3 Minuten lohnt sich kein Skill-Block. */
const MIN_BUDGET_SEC = 3 * 60
const DAY_MS = 24 * 60 * 60 * 1000

/** Zeitbudget in Sekunden (auf volle Minuten gerundet). */
export function skillBudgetSec(durationMin: number, setting: SkillBlockSetting): number {
  const minutes = Math.round(durationMin * SKILL_BLOCK_SHARE[setting])
  return Math.min(SKILL_BLOCK_MAX_SEC, minutes * 60)
}

/** Kraft, Balance und Sprung nach dem Warm-up, Beweglichkeit im Cool-down. */
export const skillPlacement = (skill: Pick<SkillDefinition, 'kind'>): BlockType =>
  skill.kind === 'mobility' ? 'cooldown' : 'warmup'

/** Schwerpunkte mit schwerer Beinarbeit – davor keine Sprünge (Kraft hat immer Kniebeuge/Hüftbeuge). */
const HEAVY_LEG_FOCUSES: readonly Focus[] = ['hyrox', 'strength', 'full_body', 'mixed']

export interface SkillChoiceContext {
  focus: Focus
  /** Tagesform eher niedrig → nur Technik (Balance) und Beweglichkeit */
  lowReadiness: boolean
  fatigue: MuscleFatigue
  history: readonly HistorySession[]
  now: string
}

export interface ResolvedPractice {
  skill: SkillDefinition
  stage: SkillStage
  stageNumber: number
}

/** Aktive Ziele → Skill und Stufe; Unbekanntes oder bereits Geschafftes fällt weg. */
export function resolvePractice(practice: SkillPractice): ResolvedPractice | undefined {
  const skill = getSkill(practice.skillSlug)
  const stage = skill?.stages[practice.stage - 1]
  if (!skill || !stage) return undefined
  return { skill, stage, stageNumber: practice.stage }
}

/**
 * Wann wurde der Skill zuletzt geübt? Zählt nur Übungen der aktuellen Stufe im Warm-up
 * bzw. Cool-down – dort steht der Skill-Block; Klimmzüge im Hauptteil zählen nicht.
 */
export function lastPracticedMs(
  practice: ResolvedPractice,
  history: readonly HistorySession[],
  extra: Readonly<Record<string, string>> | undefined,
): number | undefined {
  const slugs = new Set(practice.stage.exercises)
  let latest = extra?.[practice.skill.slug] ? Date.parse(extra[practice.skill.slug]!) : undefined
  for (const session of history) {
    const practiced = session.exercises.some(
      (e) =>
        slugs.has(e.exerciseSlug) &&
        (e.block === 'warmup' || e.block === 'cooldown') &&
        e.sets.some((s) => s.completed),
    )
    const at = Date.parse(session.startedAt)
    if (practiced && (latest === undefined || at > latest)) latest = at
  }
  return latest
}

export interface SkillChoice {
  chosen: ResolvedPractice[]
  /** Begründungen für „Warum dieses Training?" */
  notes: string[]
}

/**
 * Wählt höchstens einen Kraft-/Balance-/Sprung-Skill und einen Beweglichkeits-Skill.
 * Abwechslung: das am längsten nicht geübte Ziel zuerst. Ermüdung, Tagesform und
 * Schwerpunkt können einen Skill ausschließen.
 */
export function chooseSkills(request: SkillRequest, ctx: SkillChoiceContext): SkillChoice {
  const notes: string[] = []
  if (request.setting === 'off') return { chosen: [], notes }
  const nowMs = Date.parse(ctx.now)

  const candidates = request.active.flatMap((practice, order) => {
    const resolved = resolvePractice(practice)
    if (!resolved) return []
    const { skill } = resolved
    if (ctx.focus === 'recovery' && skill.kind !== 'mobility') return []
    if (ctx.lowReadiness && (skill.kind === 'strength' || skill.kind === 'explosive')) {
      notes.push(
        `${skill.name} heute nicht – bei niedriger Tagesform nur Technik und Beweglichkeit.`,
      )
      return []
    }
    if (skill.kind === 'explosive' && HEAVY_LEG_FOCUSES.includes(ctx.focus)) return []
    const fatigued = skill.muscles.filter((m) => fatigueLevel(ctx.fatigue[m]) === 'high')
    if (fatigued.length > 0 && skill.kind !== 'mobility') {
      notes.push(
        `${skill.name} heute nicht – ${fatigued.map((m) => MUSCLE_GROUP_LABELS[m]).join(', ')} noch stark beansprucht.`,
      )
      return []
    }
    const last = lastPracticedMs(resolved, ctx.history, request.lastPracticed)
    // Nie geübt zählt als „am längsten her"; Zukunft (Wochenplan) wie heute
    const daysAgo = last === undefined ? Infinity : Math.max(0, (nowMs - last) / DAY_MS)
    return [{ resolved, order, daysAgo }]
  })

  const byRotation = (a: (typeof candidates)[number], b: (typeof candidates)[number]) =>
    b.daysAgo - a.daysAgo || a.order - b.order
  const strength = candidates
    .filter((c) => c.resolved.skill.kind !== 'mobility')
    .sort(byRotation)[0]
  const mobility = candidates
    .filter((c) => c.resolved.skill.kind === 'mobility')
    .sort(byRotation)[0]
  const chosen = [strength, mobility].flatMap((c) => (c ? [c.resolved] : []))
  return { chosen, notes }
}

export interface SkillDosingContext {
  exercises: readonly GeneratorExercise[]
  level: TrainingLevel
  intensity: Intensity
  history: readonly HistorySession[]
  /** Schon im Workout (z. B. Klimmzüge im Hauptteil) – nicht doppelt einplanen */
  excludeSlugs?: ReadonlySet<string> | undefined
}

/**
 * Übungen der aktuellen Stufe passend zum Zeitbudget: Hauptübung zuerst, weitere nur,
 * solange Zeit bleibt; notfalls mit weniger Sätzen. Nicht verfügbare Übungen (Geräte,
 * Einschränkungen, ausgeblendet) fallen weg – `exercises` ist bereits gefiltert.
 */
export function buildSkillItems(
  practice: ResolvedPractice,
  budgetSec: number,
  ctx: SkillDosingContext,
): WorkoutItem[] {
  const block = skillPlacement(practice.skill)
  const bySlug = new Map(ctx.exercises.map((e) => [e.slug, e]))
  const available = practice.stage.exercises.flatMap((slug) => {
    const exercise = bySlug.get(slug)
    return exercise && !ctx.excludeSlugs?.has(slug) ? [exercise] : []
  })

  const items: WorkoutItem[] = []
  let used = 0
  for (const exercise of available) {
    const dosed = doseExercise(exercise, 'skill', {
      intensity: ctx.intensity,
      volumeFactor: 1,
      loadFactor: 1,
      history: ctx.history,
    })
    let sets = dosed.sets
    let seconds = estimateWorkoutItem(sets, exercise, ctx.level, block, false)
    // Zu lang? Sätze bis zum Minimum der Übung streichen
    const minSets = exercise.loadParams.sets[0]
    while (used + seconds > budgetSec && sets.length > minSets) {
      sets = sets.slice(0, -1)
      seconds = estimateWorkoutItem(sets, exercise, ctx.level, block, false)
    }
    // Die Hauptübung kommt immer dran, weitere nur, wenn sie ins Budget passen
    if (items.length > 0 && used + seconds > budgetSec) break
    items.push({
      exerciseSlug: exercise.slug,
      exerciseName: exercise.name,
      role: 'skill',
      sets,
      note: items.length === 0 ? skillNote(practice) : undefined,
      estimatedSec: seconds,
      skillSlug: practice.skill.slug,
    })
    used += seconds
  }
  return items
}

function skillNote({ skill, stage, stageNumber }: ResolvedPractice): string {
  const base = `Skill ${skill.name} · Stufe ${stageNumber}: ${stage.title}`
  return stage.note ? `${base}. ${stage.note}` : base
}

const sumSeconds = (blocks: readonly WorkoutBlock[]) =>
  blocks.reduce((sum, b) => sum + b.items.reduce((s, it) => s + it.estimatedSec, 0), 0)

/** Fügt Skill-Übungen am Ende des Warm-ups bzw. im Cool-down ein (Block wird bei Bedarf angelegt). */
export function insertSkillItems(
  blocks: readonly WorkoutBlock[],
  items: readonly WorkoutItem[],
  placement: BlockType,
): WorkoutBlock[] {
  if (items.length === 0) return [...blocks]
  const index = blocks.findIndex((b) => b.type === placement)
  if (index >= 0) {
    return blocks.map((b, i) => (i === index ? { ...b, items: [...b.items, ...items] } : b))
  }
  const block: WorkoutBlock = { type: placement, items: [...items] }
  return placement === 'warmup' ? [block, ...blocks] : [...blocks, block]
}

function withBlocks(workout: GeneratedWorkout, blocks: WorkoutBlock[]): GeneratedWorkout {
  return { ...workout, blocks, estimatedDurationMin: Math.round(sumSeconds(blocks) / 60) }
}

/** Skill-Ziele, die im Workout eingeplant sind (in Reihenfolge des Workouts). */
export function skillsInWorkout(workout: GeneratedWorkout): string[] {
  const slugs = workout.blocks.flatMap((b) => b.items.flatMap((i) => i.skillSlug ?? []))
  return [...new Set(slugs)]
}

/** Entfernt alle Übungen eines Skills; leere Blöcke fallen weg. */
export function removeSkill(workout: GeneratedWorkout, skillSlug: string): GeneratedWorkout {
  const blocks = workout.blocks
    .map((b) => ({ ...b, items: b.items.filter((i) => i.skillSlug !== skillSlug) }))
    .filter((b) => b.items.length > 0)
  return withBlocks(workout, blocks)
}

/**
 * Skill von Hand einbauen (Vorschau „Skill üben"): ersetzt einen Skill an derselben Stelle
 * (höchstens ein Kraft-/Balance- und ein Beweglichkeits-Skill je Training). Das Budget
 * richtet sich nach der Einstellung (bei „aus" wie „normal"), mindestens 5 Minuten;
 * die Zeit kommt zum Training dazu.
 */
export function addSkill(
  workout: GeneratedWorkout,
  practice: SkillPractice,
  setting: SkillBlockSetting,
  ctx: SkillDosingContext,
): GeneratedWorkout {
  const resolved = resolvePractice(practice)
  if (!resolved) return workout
  const placement = skillPlacement(resolved.skill)
  const samePlace = skillsInWorkout(workout).filter((slug) => {
    const skill = getSkill(slug)
    return slug === resolved.skill.slug || (skill && skillPlacement(skill) === placement)
  })
  const cleared = samePlace.reduce(removeSkill, workout)
  const inWorkout = new Set(cleared.blocks.flatMap((b) => b.items.map((i) => i.exerciseSlug)))

  const budget = Math.max(
    5 * 60,
    skillBudgetSec(workout.targetDurationMin, setting === 'off' ? 'normal' : setting),
  )
  const items = buildSkillItems(resolved, budget, { ...ctx, excludeSlugs: inWorkout })
  return withBlocks(cleared, insertSkillItems(cleared.blocks, items, placement))
}

/** Minimales Budget, ab dem der Generator überhaupt einen Skill-Block plant. */
export const hasSkillBudget = (durationMin: number, setting: SkillBlockSetting) =>
  skillBudgetSec(durationMin, setting) >= MIN_BUDGET_SEC
