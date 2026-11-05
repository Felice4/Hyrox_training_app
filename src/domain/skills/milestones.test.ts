import { describe, expect, it } from 'vitest'
import { getMilestone, MILESTONE_LIBRARY } from '@/data/skills'
import type { HistorySession } from '@/domain/generator/types'
import { milestoneProgress, milestoneSeries, type MilestoneData } from './milestones'

const empty: MilestoneData = {
  records: [],
  history: [],
  bodyWeightKg: null,
  hyroxBestTimeSec: null,
}
const record = (exerciseSlug: string, recordType: string, contextKey: string, value: number) => ({
  exerciseSlug,
  recordType,
  contextKey,
  value,
  achievedAt: '2026-11-01T10:00:00.000Z',
})

const session = (
  exerciseSlug: string,
  reps: number,
  block: 'main' | 'warmup' = 'main',
): HistorySession => ({
  startedAt: '2026-11-02T10:00:00.000Z',
  focus: 'hyrox',
  durationMin: 60,
  exercises: [
    { exerciseSlug, block, sets: [{ setType: 'working', completed: true, reps, weightKg: 9 }] },
  ],
})

describe('milestoneProgress', () => {
  it('Klimmzüge aus der Bestleistung', () => {
    const progress = milestoneProgress(getMilestone('pull-ups-15')!, {
      ...empty,
      records: [record('pull-up', 'max_reps', '', 12)],
    })
    expect(progress).toMatchObject({ current: 12, target: 15, achieved: false, unit: 'reps' })
    expect(progress.ratio).toBeCloseTo(0.8)
  })

  it('Wall Balls (Gewicht × Wdh.) aus dem Verlauf, Warm-up zählt nicht', () => {
    const milestone = getMilestone('wall-balls-100')!
    expect(
      milestoneProgress(milestone, {
        ...empty,
        history: [session('hyrox-wall-balls', 100, 'warmup')],
      }).current,
    ).toBeNull()
    const progress = milestoneProgress(milestone, {
      ...empty,
      history: [session('hyrox-wall-balls', 60), session('hyrox-wall-balls', 100)],
    })
    expect(progress).toMatchObject({ current: 100, achieved: true, ratio: 1 })
  })

  it('Kraft relativ zum Körpergewicht: bester Wert aus 1RM-Schätzung und Maximalgewicht', () => {
    const milestone = getMilestone('deadlift-2x-bodyweight')!
    const data = {
      ...empty,
      bodyWeightKg: 84,
      records: [
        record('deadlift', 'estimated_1rm', '', 150),
        record('deadlift', 'max_weight', 'reps=1', 155),
        record('deadlift', 'max_weight', 'reps=5', 140),
      ],
    }
    expect(milestoneProgress(milestone, data)).toMatchObject({
      current: 155,
      target: 168,
      achieved: false,
      missingBodyWeight: false,
    })
  })

  it('Kraft ohne Körpergewicht: Ziel unbekannt, Hinweis', () => {
    const progress = milestoneProgress(getMilestone('back-squat-1x-bodyweight')!, {
      ...empty,
      records: [record('back-squat', 'estimated_1rm', '', 100)],
    })
    expect(progress).toMatchObject({ target: null, achieved: false, missingBodyWeight: true })
  })

  it('Zeiten: nur genau passende Strecke, niedriger ist besser', () => {
    const milestone = getMilestone('run-5k-sub-22')!
    const progress = milestoneProgress(milestone, {
      ...empty,
      records: [
        record('run-5k-time-trial', 'best_time', 'distance_m=5000', 1380),
        record('hyrox-run', 'best_time', 'distance_m=1000', 200),
      ],
    })
    expect(progress).toMatchObject({ current: 1380, target: 1320, achieved: false, unit: 'sec' })
    expect(progress.ratio).toBeCloseTo(1320 / 1380)
    const oneK = milestoneProgress(getMilestone('run-1k-sub-3-30')!, {
      ...empty,
      records: [record('hyrox-run', 'best_time', 'distance_m=1000', 200)],
    })
    expect(oneK.achieved).toBe(true)
  })

  it('HYROX-Zeit aus dem Profil', () => {
    expect(
      milestoneProgress(getMilestone('hyrox-sub-90')!, { ...empty, hyroxBestTimeSec: 5380 })
        .achieved,
    ).toBe(true)
    expect(
      milestoneProgress(getMilestone('hyrox-sub-80')!, { ...empty, hyroxBestTimeSec: 5380 }),
    ).toMatchObject({ achieved: false, current: 5380, target: 4800 })
  })

  it('ohne Daten: kein Wert, Fortschritt 0', () => {
    expect(milestoneProgress(getMilestone('row-2k-sub-7-30')!, empty)).toMatchObject({
      current: null,
      ratio: 0,
      achieved: false,
    })
  })
})

describe('milestoneSeries', () => {
  it('fasst Reihen zusammen und nennt den nächsten offenen Meilenstein', () => {
    const series = milestoneSeries(MILESTONE_LIBRARY, {
      ...empty,
      records: [record('pull-up', 'max_reps', '', 16)],
    })
    const pullUps = series.find((s) => s.series === 'pull-ups')!
    expect(pullUps.achievedCount).toBe(2)
    expect(pullUps.next?.milestone.slug).toBe('pull-ups-20')
    expect(series.map((s) => s.series)).toContain('hyrox-time')
  })
})
