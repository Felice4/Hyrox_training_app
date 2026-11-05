import { z } from 'zod'
import { MUSCLE_GROUPS } from '@/data/exercises/vocabulary'

/**
 * Schema der Skill-Ziele und Meilensteine (Konzept: docs/SKILLS.md).
 * Inhalte stehen im Code wie die Übungsbibliothek; in der Datenbank liegen später
 * nur Auswahl, Status und erreichte Stufen.
 */

const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
  error: 'Slug nur aus Kleinbuchstaben, Ziffern und Bindestrichen',
})

/** Bereiche für die Gliederung auf der Ziele-Seite. */
export const SKILL_AREAS = ['pull', 'push', 'core', 'legs', 'mobility', 'explosive'] as const
export type SkillArea = (typeof SKILL_AREAS)[number]
export const SKILL_AREA_LABELS: Record<SkillArea, string> = {
  pull: 'Zug und Lever',
  push: 'Stütz und Handstand',
  core: 'Rumpf und Flaggen',
  legs: 'Beine',
  mobility: 'Beweglichkeit',
  explosive: 'Explosiv',
}

/**
 * Art des Skills – bestimmt die Platzierung im Training (docs/SKILLS.md §2):
 * strength/balance direkt nach dem Warm-up, mobility im Cool-down,
 * explosive nach dem Warm-up, aber nie vor schweren Beintagen.
 */
export const SKILL_KINDS = ['strength', 'balance', 'mobility', 'explosive'] as const
export type SkillKind = (typeof SKILL_KINDS)[number]
export const SKILL_KIND_LABELS: Record<SkillKind, string> = {
  strength: 'Kraft',
  balance: 'Balance',
  mobility: 'Beweglichkeit',
  explosive: 'Sprung und Akrobatik',
}

/**
 * Prüfbares Kriterium einer Stufe. Gewertet wird der beste Satz eines Trainings
 * (Wiederholungen am Stück, Haltezeit bzw. Strecke). „manual": nicht aus den Sätzen
 * ablesbar (z. B. Spagat-Höhe, Box-Höhe, Back Flip) – wird von Hand bestätigt.
 */
export const criterionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('reps'),
    exercise: slugSchema,
    reps: z.int().positive(),
  }),
  z.strictObject({
    kind: z.literal('hold'),
    exercise: slugSchema,
    seconds: z.int().positive(),
  }),
  z.strictObject({
    kind: z.literal('distance'),
    exercise: slugSchema,
    meters: z.number().positive(),
  }),
  z.strictObject({ kind: z.literal('manual') }),
])
export type Criterion = z.output<typeof criterionSchema>

export const stageSchema = z.strictObject({
  /** Kriterium in Worten, wie es in der App steht, z. B. „8 strikte Klimmzüge". */
  title: z.string().min(3).max(100),
  /** Alle Kriterien müssen erfüllt sein (z. B. Hollow Hold UND Klimmzüge). */
  criteria: z.array(criterionSchema).min(1),
  /** Werte gelten je Seite (einseitige Übungen). */
  perSide: z.boolean().default(false),
  /** Übungen, die der Skill-Block für diese Stufe einplant (Slugs, erste = Hauptübung). */
  exercises: z.array(slugSchema).min(1).max(4),
  /** Zusätzlicher Hinweis, z. B. zur Ausführung oder Sicherheit. */
  note: z.string().max(200).optional(),
})
export type SkillStage = z.output<typeof stageSchema>

export const skillSchema = z.strictObject({
  slug: slugSchema,
  name: z.string().min(2).max(60),
  description: z.string().min(10).max(300),
  area: z.enum(SKILL_AREAS),
  kind: z.enum(SKILL_KINDS),
  /** Hauptsächlich belastete Muskeln – für die Ermüdungsprüfung im Generator. */
  muscles: z.array(z.enum(MUSCLE_GROUPS)).min(1),
  /** Voraussetzung: ein anderer Skill mit mindestens dieser Stufe (1-basiert). */
  requires: z.strictObject({ skill: slugSchema, stage: z.int().positive() }).optional(),
  /** Fernziel – realistisch erst nach langer Vorarbeit. */
  longTerm: z.boolean().default(false),
  /** Sicherheitshinweis, auf der Ziele-Seite gut sichtbar. */
  safety: z.string().max(300).optional(),
  stages: z.array(stageSchema).min(2).max(8),
})
export type SkillInput = z.input<typeof skillSchema>
export type SkillDefinition = z.output<typeof skillSchema>

// -----------------------------------------------------------------------------
// Meilensteine aus dem normalen Training
// -----------------------------------------------------------------------------

export const MILESTONE_AREAS = ['pull', 'strength', 'run', 'erg', 'hyrox'] as const
export type MilestoneArea = (typeof MILESTONE_AREAS)[number]
export const MILESTONE_AREA_LABELS: Record<MilestoneArea, string> = {
  pull: 'Zug',
  strength: 'Kraft',
  run: 'Laufen',
  erg: 'Ergometer',
  hyrox: 'HYROX',
}

/**
 * Wie ein Meilenstein gemessen wird:
 * - max_reps: Wiederholungen am Stück in einem Satz
 * - relative_strength: geschätztes Maximalgewicht (1RM) ≥ Faktor × Körpergewicht
 * - best_time: Zeit für genau diese Strecke ≤ maxSec
 * - hyrox_time: HYROX-Wettkampfzeit aus dem Profil ≤ maxSec
 */
export const milestoneMetricSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('max_reps'),
    exercises: z.array(slugSchema).min(1),
    reps: z.int().positive(),
  }),
  z.strictObject({
    kind: z.literal('relative_strength'),
    exercise: slugSchema,
    factor: z.number().positive(),
  }),
  z.strictObject({
    kind: z.literal('best_time'),
    exercises: z.array(slugSchema).min(1),
    distanceM: z.int().positive(),
    maxSec: z.int().positive(),
  }),
  z.strictObject({ kind: z.literal('hyrox_time'), maxSec: z.int().positive() }),
])
export type MilestoneMetric = z.output<typeof milestoneMetricSchema>

export const milestoneSchema = z.strictObject({
  slug: slugSchema,
  name: z.string().min(3).max(60),
  area: z.enum(MILESTONE_AREAS),
  /** Meilensteine derselben Reihe (z. B. 10 · 15 · 20 Klimmzüge) – leichtester zuerst. */
  series: slugSchema,
  metric: milestoneMetricSchema,
})
export type MilestoneInput = z.input<typeof milestoneSchema>
export type MilestoneDefinition = z.output<typeof milestoneSchema>
