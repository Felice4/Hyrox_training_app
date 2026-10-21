import type { Equipment, HyroxStation } from '@/data/exercises/vocabulary'
import type { Focus, GeneratorExercise, GeneratorProfile, HistorySession } from './types'

/** Verfügbare Geräte heute: Profil minus „heute nicht verfügbar". */
export function availableEquipment(
  profile: GeneratorProfile,
  unavailable: readonly Equipment[] = [],
): Set<Equipment> {
  return new Set(profile.availableEquipment.filter((e) => !unavailable.includes(e)))
}

/** Darf diese Übung grundsätzlich vorkommen? (Schritt 3 in docs/GENERATOR.md) */
export function isUsable(
  exercise: GeneratorExercise,
  equipment: ReadonlySet<Equipment>,
  profile: GeneratorProfile,
): boolean {
  if (exercise.preference === 'hidden') return false
  if (!exercise.equipment.every((e) => equipment.has(e))) return false
  if (exercise.stressRegions.some((r) => profile.limitationRegions.includes(r))) return false
  return true
}

export function filterPool(
  exercises: readonly GeneratorExercise[],
  profile: GeneratorProfile,
  unavailable: readonly Equipment[] = [],
): GeneratorExercise[] {
  const equipment = availableEquipment(profile, unavailable)
  return exercises.filter((e) => isUsable(e, equipment, profile))
}

// -----------------------------------------------------------------------------
// Auswertung des Verlaufs für die Auswahl (Abwechslung, Kontinuität, Stationen)
// -----------------------------------------------------------------------------

export interface HistoryIndex {
  /** Tage seit der letzten Nutzung je Übung */
  daysSinceUsed: Map<string, number>
  /** In den letzten zwei Trainings mit gleichem Schwerpunkt genutzt */
  recentSameFocus: Set<string>
  /** Anzahl Nutzungen in den letzten 28 Tagen */
  usageCount: Map<string, number>
  /** Tage seit dem letzten Training je HYROX-Station */
  daysSinceStation: Map<HyroxStation, number>
}

const DAY_MS = 24 * 60 * 60 * 1000

export function buildHistoryIndex(
  history: readonly HistorySession[],
  exercises: readonly GeneratorExercise[],
  focus: Focus,
  now: string,
): HistoryIndex {
  const nowMs = Date.parse(now)
  const stationOf = new Map(exercises.map((e) => [e.slug, e.hyroxStation]))
  const sessions = history
    .map((s) => ({ ...s, days: (nowMs - Date.parse(s.startedAt)) / DAY_MS }))
    .filter((s) => s.days >= 0 && s.days < 28)
    .sort((a, b) => a.days - b.days)

  const index: HistoryIndex = {
    daysSinceUsed: new Map(),
    recentSameFocus: new Set(),
    usageCount: new Map(),
    daysSinceStation: new Map(),
  }

  for (const session of sessions) {
    for (const performed of session.exercises) {
      const slug = performed.exerciseSlug
      if (!index.daysSinceUsed.has(slug)) index.daysSinceUsed.set(slug, session.days)
      index.usageCount.set(slug, (index.usageCount.get(slug) ?? 0) + 1)
      const station = stationOf.get(slug)
      if (station && !index.daysSinceStation.has(station)) {
        index.daysSinceStation.set(station, session.days)
      }
    }
  }
  for (const session of sessions.filter((s) => s.focus === focus).slice(0, 2)) {
    session.exercises.forEach((e) => index.recentSameFocus.add(e.exerciseSlug))
  }
  return index
}
