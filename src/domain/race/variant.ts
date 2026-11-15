import type { Division } from '@/domain/simulation/formats'

/**
 * Varianten eines HYROX-Wettkampfs (docs/RACE_PREP.md §1, §5): Format, Kategorie und
 * Wertung. Gewichte nach dem offiziellen Regelwerk 2025/26 (Singles- und Doubles-Rulebook).
 */

export const RACE_FORMATS = ['single', 'double', 'relay'] as const
export type RaceFormat = (typeof RACE_FORMATS)[number]
export const RACE_FORMAT_LABELS: Record<RaceFormat, string> = {
  single: 'Singles',
  double: 'Doubles',
  relay: 'Staffel',
}
export const RACE_FORMAT_HINTS: Record<RaceFormat, string> = {
  single: 'Allein: 8 × (1 km Lauf + Station).',
  double: 'Zu zweit: 8 km gemeinsam laufen, die Arbeit an den Stationen wird geteilt.',
  relay: 'Zu viert: jede Person läuft 2 × 1 km und absolviert 2 Stationen.',
}

export const RACE_CATEGORIES = ['open', 'pro'] as const
export type RaceCategory = (typeof RACE_CATEGORIES)[number]
export const RACE_CATEGORY_LABELS: Record<RaceCategory, string> = {
  open: 'Open',
  pro: 'Pro',
}

export const RACE_GENDERS = ['men', 'women', 'mixed'] as const
export type RaceGender = (typeof RACE_GENDERS)[number]
export const RACE_GENDER_LABELS: Record<RaceGender, string> = {
  men: 'Männer',
  women: 'Frauen',
  mixed: 'Mixed',
}

export interface RaceVariant {
  format: RaceFormat
  category: RaceCategory
  gender: RaceGender
}

/** Kategorien, die es für das Format gibt (keine Pro-Staffel). */
export function categoriesFor(format: RaceFormat): readonly RaceCategory[] {
  return format === 'relay' ? ['open'] : RACE_CATEGORIES
}

/** Wertungen für Format und Kategorie (Mixed nur im Team, Mixed Doubles nur Open). */
export function gendersFor(format: RaceFormat, category: RaceCategory): readonly RaceGender[] {
  if (format === 'single') return ['men', 'women']
  if (format === 'double' && category === 'pro') return ['men', 'women']
  return RACE_GENDERS
}

export function isValidVariant(variant: RaceVariant): boolean {
  return (
    categoriesFor(variant.format).includes(variant.category) &&
    gendersFor(variant.format, variant.category).includes(variant.gender)
  )
}

/**
 * Passt eine Variante nach einer Änderung an: ungültige Kategorie → Open,
 * ungültige Wertung → Männer.
 */
export function normalizeVariant(variant: RaceVariant): RaceVariant {
  const category = categoriesFor(variant.format).includes(variant.category)
    ? variant.category
    : 'open'
  const gender = gendersFor(variant.format, category).includes(variant.gender)
    ? variant.gender
    : 'men'
  return { format: variant.format, category, gender }
}

export function variantLabel(variant: RaceVariant): string {
  return [
    RACE_FORMAT_LABELS[variant.format],
    RACE_CATEGORY_LABELS[variant.category],
    RACE_GENDER_LABELS[variant.gender],
  ].join(' · ')
}

/** Gewichtssatz (Division der Simulation) mit Beschriftung, z. B. „Frauen“ in der Mixed-Staffel. */
export interface WeightSet {
  label: string | null
  division: Division
}

/**
 * Wettkampfgewichte der Variante. Teams nutzen die Gewichte ihrer Wertung;
 * Mixed Doubles laut gängigen Übersichten die der Männer (im Regelwerk nicht eigens
 * aufgeführt); in der Mixed-Staffel startet jede Person mit den Gewichten ihrer Wertung.
 */
export function weightSets(variant: RaceVariant): WeightSet[] {
  const level = variant.category === 'pro' ? 'pro' : 'open'
  if (variant.gender === 'mixed') {
    return variant.format === 'relay'
      ? [
          { label: 'Männer', division: 'open_men' },
          { label: 'Frauen', division: 'open_women' },
        ]
      : [{ label: null, division: 'open_men' }]
  }
  return [{ label: null, division: `${level}_${variant.gender}` }]
}
