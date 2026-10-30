import { READINESS } from '@/domain/generator/config'
import type { Intensity, ReadinessInput } from '@/domain/generator/types'

/** Tagesform als Score 1–5 (höher = besser); ohne Angabe „normal". */
export function readinessScore(input: ReadinessInput | undefined): number {
  if (!input) return READINESS.quickScores.normal
  if (input.kind === 'quick') return READINESS.quickScores[input.level]
  const values = [input.energy, input.soreness, input.sleepQuality, input.recovery]
  const clamped = values.map((v) => Math.min(5, Math.max(1, v)))
  return Math.round((clamped.reduce((a, b) => a + b, 0) / clamped.length) * 100) / 100
}

export interface ReadinessEffect {
  score: number
  /** 0 = unverändert, −1 = eine Stufe leichter */
  intensityShift: 0 | -1
  /** Faktor für das Trainingsvolumen (Sätze bzw. Umfang) */
  volumeFactor: number
  recoverySuggested: boolean
  /** Bei sehr niedriger Tagesform: Gewichte um 10 % reduzieren */
  loadFactor: number
}

/**
 * Wirkung der Tagesform (docs/GENERATOR.md, Schritt 2). Die Intensität wird nie automatisch
 * erhöht – nur auf ausdrücklichen Wunsch im Formular.
 */
export function readinessEffect(input: ReadinessInput | undefined): ReadinessEffect {
  const score = readinessScore(input)
  if (score < READINESS.recoveryBelow) {
    return {
      score,
      intensityShift: -1,
      volumeFactor: READINESS.reducedVolumeFactor,
      recoverySuggested: true,
      loadFactor: 0.9,
    }
  }
  if (score < READINESS.reduceBelow) {
    return {
      score,
      intensityShift: -1,
      volumeFactor: READINESS.reducedVolumeFactor,
      recoverySuggested: false,
      loadFactor: 1,
    }
  }
  return { score, intensityShift: 0, volumeFactor: 1, recoverySuggested: false, loadFactor: 1 }
}

const ORDER: readonly Intensity[] = ['easy', 'moderate', 'hard']

/** Verschiebt die Intensität um Stufen, begrenzt auf easy…hard. */
export function shiftIntensity(intensity: Intensity, shift: number): Intensity {
  const index = Math.min(ORDER.length - 1, Math.max(0, ORDER.indexOf(intensity) + shift))
  return ORDER[index] as Intensity
}

/** Einordnung der Tagesform für die Anzeige (keine medizinische Aussage). */
export interface ReadinessStatus {
  level: 'recovery' | 'reduced' | 'normal' | 'good'
  label: string
  /** Was der Generator daraus macht */
  advice: string
}

export function readinessStatus(score: number): ReadinessStatus {
  if (score < READINESS.recoveryBelow) {
    return {
      level: 'recovery',
      label: 'Erschöpft',
      advice: 'Eine regenerative Einheit wäre heute sinnvoll. Normales Training nur locker.',
    }
  }
  if (score < READINESS.reduceBelow) {
    return {
      level: 'reduced',
      label: 'Eher müde',
      advice: 'Workouts werden eine Stufe leichter und mit etwa 20 % weniger Umfang erstellt.',
    }
  }
  if (score < 4) {
    return { level: 'normal', label: 'Normal', advice: 'Training wie geplant.' }
  }
  return {
    level: 'good',
    label: 'Gut erholt',
    advice: 'Training wie geplant – mehr Intensität nur, wenn du sie selbst wählst.',
  }
}
