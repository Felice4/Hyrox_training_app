import { describe, expect, it } from 'vitest'
import type { HistorySession } from '@/domain/generator/types'
import { sessionLoad, summarizeTrainingLoad } from './trainingLoad'

const NOW = '2026-10-21T18:00:00.000Z'

function session(daysAgo: number, durationMin = 60, sessionRpe?: number): HistorySession {
  const startedAt = new Date(Date.parse(NOW) - daysAgo * 24 * 60 * 60 * 1000).toISOString()
  return { startedAt, focus: 'strength', durationMin, sessionRpe, exercises: [] }
}

describe('sessionLoad', () => {
  it('multipliziert Anstrengung und Minuten', () => {
    expect(sessionLoad({ durationMin: 60, sessionRpe: 7 })).toBe(420)
  })

  it('nimmt ohne RPE eine mittlere Anstrengung an', () => {
    expect(sessionLoad({ durationMin: 50, sessionRpe: undefined })).toBe(300)
  })
})

describe('summarizeTrainingLoad', () => {
  it('liefert ohne Verlauf keine Bewertung', () => {
    expect(summarizeTrainingLoad([], NOW)).toEqual({
      acute: 0,
      chronicWeekly: 0,
      ratio: null,
      elevated: false,
    })
  })

  it('bewertet erst ab 14 Tagen Verlauf', () => {
    const shortHistory = [session(1, 60, 9), session(3, 60, 9), session(10, 60, 5)]
    expect(summarizeTrainingLoad(shortHistory, NOW).ratio).toBeNull()
  })

  it('berechnet das Verhältnis akut zu chronisch', () => {
    // 4 Wochen je 2 Einheiten à 60 min, RPE 6 → 720 pro Woche
    const steady = [1, 4, 8, 11, 15, 18, 22, 25].map((d) => session(d, 60, 6))
    const summary = summarizeTrainingLoad(steady, NOW)
    expect(summary.acute).toBe(720)
    expect(summary.chronicWeekly).toBe(720)
    expect(summary.ratio).toBe(1)
    expect(summary.elevated).toBe(false)
  })

  it('erkennt eine deutlich erhöhte Belastung', () => {
    const history = [
      ...[0.5, 1, 2, 3, 5].map((d) => session(d, 75, 8)),
      ...[15, 22, 25].map((d) => session(d, 45, 5)),
    ]
    const summary = summarizeTrainingLoad(history, NOW)
    expect(summary.ratio).toBeGreaterThan(1.3)
    expect(summary.elevated).toBe(true)
  })

  it('ignoriert Trainings älter als 28 Tage und in der Zukunft', () => {
    const summary = summarizeTrainingLoad([session(40), session(-1)], NOW)
    expect(summary.acute).toBe(0)
    expect(summary.chronicWeekly).toBe(0)
  })
})
