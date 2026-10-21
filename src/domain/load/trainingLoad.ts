import { TRAINING_LOAD } from '@/domain/generator/config'
import type { HistorySession } from '@/domain/generator/types'

const DAY_MS = 24 * 60 * 60 * 1000

/** Belastung eines Trainings nach der sRPE-Methode: Anstrengung (1–10) × Minuten. */
export function sessionLoad(session: Pick<HistorySession, 'sessionRpe' | 'durationMin'>): number {
  const rpe = session.sessionRpe ?? TRAINING_LOAD.defaultSessionRpe
  return Math.round(rpe * session.durationMin)
}

export interface TrainingLoadSummary {
  /** Summe der letzten 7 Tage */
  acute: number
  /** Durchschnitt pro Woche über die letzten 28 Tage */
  chronicWeekly: number
  /** akut / chronisch – `null`, solange zu wenig Verlauf vorliegt */
  ratio: number | null
  /** Belastung deutlich über dem Gewohnten → Intensität senken */
  elevated: boolean
}

/**
 * Akute vs. gewohnte Trainingsbelastung (docs/GENERATOR.md, Schritt 2).
 * Erst ab 14 Tagen Verlauf aussagekräftig – vorher kein Verhältnis.
 */
export function summarizeTrainingLoad(
  history: readonly HistorySession[],
  now: string,
): TrainingLoadSummary {
  const nowMs = Date.parse(now)
  const ageDays = (session: HistorySession) => (nowMs - Date.parse(session.startedAt)) / DAY_MS
  const relevant = history.filter((s) => ageDays(s) >= 0 && ageDays(s) < TRAINING_LOAD.chronicDays)

  const acute = relevant
    .filter((s) => ageDays(s) < TRAINING_LOAD.acuteDays)
    .reduce((sum, s) => sum + sessionLoad(s), 0)
  const chronicTotal = relevant.reduce((sum, s) => sum + sessionLoad(s), 0)
  const chronicWeekly = Math.round(chronicTotal / (TRAINING_LOAD.chronicDays / 7))

  const oldest = relevant.reduce((max, s) => Math.max(max, ageDays(s)), 0)
  const enoughHistory = oldest >= TRAINING_LOAD.minHistoryDays && chronicWeekly > 0
  const ratio = enoughHistory ? Math.round((acute / chronicWeekly) * 100) / 100 : null

  return {
    acute,
    chronicWeekly,
    ratio,
    elevated: ratio !== null && ratio > TRAINING_LOAD.elevatedRatio,
  }
}
