import type { LoadParams } from './schema'

/**
 * Wiederkehrende Belastungsparameter, damit nicht jede Übung alles einzeln angeben muss.
 * Bereiche: [Minimum, Maximum]. Pausen in Sekunden.
 */
export const LOAD = {
  /** Warm-up mit Wiederholungen (je Seite, falls einseitig). */
  warmupReps: { sets: [1, 2], reps: [8, 15], restSec: [0, 15] },
  /** Warm-up nach Zeit. */
  warmupTime: { sets: [1, 2], durationSec: [20, 45], restSec: [0, 15] },
  /** Lockeres Einfahren am Gerät oder Einlaufen. */
  warmupCardio: { sets: [1, 1], durationSec: [300, 600], restSec: [0, 0] },
  /** Mobilisation mit Wiederholungen (je Seite, falls einseitig). */
  mobilityReps: { sets: [1, 2], reps: [5, 10], restSec: [0, 15] },
  /** Gehaltene Dehnung oder Position (je Seite, falls einseitig). */
  mobilityHold: { sets: [1, 2], durationSec: [30, 60], restSec: [0, 15] },
  /** Faszienrolle je Muskelgruppe bzw. Seite. */
  foamRolling: { sets: [1, 1], durationSec: [45, 90], restSec: [0, 0] },
  /** Lockeres Ausfahren/Ausgehen im Cool-down. */
  cooldownCardio: { sets: [1, 1], durationSec: [300, 600], restSec: [0, 0] },

  /** Schwere Grundübung, Schwerpunkt Maximalkraft. */
  strength: { sets: [3, 5], reps: [3, 6], restSec: [120, 180] },
  /** Grundübung für Kraft und Muskelaufbau. */
  strengthHypertrophy: { sets: [3, 5], reps: [4, 10], restSec: [90, 180] },
  /** Muskelaufbau, mittlere Wiederholungen. */
  hypertrophy: { sets: [3, 4], reps: [8, 12], restSec: [60, 90] },
  /** Zusatz- und Isolationsübung. */
  accessory: { sets: [2, 4], reps: [10, 15], restSec: [45, 75] },
  /** Einseitige Übung (Wiederholungen je Seite). */
  unilateral: { sets: [3, 4], reps: [6, 12], restSec: [60, 90] },
  /** Olympische und explosive Hantelübungen. */
  power: { sets: [3, 5], reps: [2, 5], restSec: [120, 180] },
  /** Sprünge und Würfe. */
  plyometric: { sets: [3, 5], reps: [3, 8], restSec: [60, 120] },
  /** Schwungübungen mit Kettlebell o. Ä. */
  ballistic: { sets: [3, 5], reps: [8, 15], restSec: [60, 90] },
  /** Rumpfübung mit Wiederholungen. */
  coreReps: { sets: [2, 4], reps: [8, 15], restSec: [30, 60] },
  /** Gehaltene Rumpfübung. */
  coreHold: { sets: [2, 4], durationSec: [20, 60], restSec: [30, 60] },
  /** Kurze, intensive Arbeitsintervalle. */
  conditioningTime: { sets: [3, 6], durationSec: [20, 45], restSec: [20, 60] },
  /** Tragen mit Gewicht über kurze Strecken. */
  carry: { sets: [3, 4], distanceM: [20, 40], restSec: [60, 90] },
} satisfies Record<string, LoadParams>
