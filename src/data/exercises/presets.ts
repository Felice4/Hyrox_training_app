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
} satisfies Record<string, LoadParams>
