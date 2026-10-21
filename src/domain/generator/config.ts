import type { MuscleGroup } from '@/data/exercises/vocabulary'
import type { TrainingLevel } from '@/domain/profile/vocabulary'

/**
 * Alle Stellschrauben des Generators an einer Stelle (siehe docs/GENERATOR.md).
 * Werte hier anpassen – die Logik bleibt unverändert.
 */
export const GENERATOR_VERSION = 'rules-1.0.0'

export const READINESS = {
  /** Schnellauswahl → Score (1–5) */
  quickScores: { low: 2, normal: 3.5, high: 4.5 },
  /** Unter diesem Score wird eine regenerative Einheit empfohlen */
  recoveryBelow: 2.0,
  /** Unter diesem Score: Intensität −1 Stufe, Volumen reduziert */
  reduceBelow: 3.0,
  reducedVolumeFactor: 0.8,
}

export const TRAINING_LOAD = {
  acuteDays: 7,
  chronicDays: 28,
  /** Verhältnis akut/chronisch, ab dem die Intensität gesenkt wird */
  elevatedRatio: 1.3,
  /** Mindestens so viele Tage Verlauf, bevor das Verhältnis berücksichtigt wird */
  minHistoryDays: 14,
  /** Angenommene Anstrengung, wenn ein Training ohne RPE gespeichert wurde */
  defaultSessionRpe: 6,
}

/** Große Muskelgruppen erholen sich langsamer. */
const LARGE_MUSCLES: readonly MuscleGroup[] = [
  'quadriceps',
  'hamstrings',
  'glutes',
  'lats',
  'upper_back',
  'chest',
  'lower_back',
]

export const FATIGUE = {
  windowHours: 96,
  recoveryHoursLarge: 72,
  recoveryHoursSmall: 48,
  primaryWeight: 1,
  secondaryWeight: 0.5,
  /** Ab hier gilt eine Muskelgruppe als stark ermüdet (nicht primär trainieren) */
  high: 8,
  /** Ab hier mittel ermüdet (Abwertung, weniger Volumen) */
  medium: 4,
  mediumVolumeFactor: 0.7,
  isLarge: (muscle: MuscleGroup) => LARGE_MUSCLES.includes(muscle),
  /** Gewichtung eines Satzes nach Anstrengung */
  rpeFactor: (rpe: number | undefined) =>
    rpe === undefined ? 1 : rpe <= 6 ? 0.7 : rpe >= 9 ? 1.3 : 1,
}

export const DURATION = {
  /** Sekunden pro Wiederholung */
  secondsPerRep: 3,
  /** Sekunden pro Kalorie (Air Bike, Ruder-Ergometer) */
  secondsPerCalorie: 4,
  /** Wechsel/Aufbau je Übung */
  transitionSec: { warmup: 20, main: 60, accessory: 45, conditioning: 45, cooldown: 20 },
  /** Lauftempo in Sekunden pro km je Niveau (konservativ) */
  runPaceSecPerKm: { beginner: 390, intermediate: 330, advanced: 285 } satisfies Record<
    TrainingLevel,
    number
  >,
  /** Sekunden pro Meter für Geräte und Fortbewegungsarten ohne Laufen */
  secondsPerMeter: {
    rower: 0.25,
    skierg: 0.27,
    sled: 1.6,
    lunge: 3,
    burpeeBroadJump: 4,
    carry: 0.9,
    crawl: 2,
    default: 1,
  },
  /** Erlaubte Abweichung von der Zieldauer */
  tolerance: 0.1,
}
