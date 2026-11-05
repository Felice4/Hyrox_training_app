import { describe, expect, it } from 'vitest'
import { getMilestone, MILESTONE_LIBRARY } from '@/data/skills'
import type { HistorySession } from '@/domain/generator/types'
import {
  metricTarget,
  milestoneProgress,
  resolvedProgress,
  resolveMilestones,
  withTarget,
  type MilestoneData,
  type UserMilestone,
} from './milestones'

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

const row = (overrides: Partial<UserMilestone>): UserMilestone => ({
  id: '00000000-0000-4000-8000-000000000001',
  builtinSlug: null,
  name: null,
  area: null,
  metric: null,
  hidden: false,
  countedFrom: null,
  manual: null,
  ...overrides,
})

describe('Neu zählen und Hand-Eintrag', () => {
  const wallBalls = getMilestone('wall-balls-100')!
  const data = { ...empty, history: [session('hyrox-wall-balls', 23)] }

  it('ignoriert nach dem Zurücksetzen ältere Trainings und Bestleistungen', () => {
    expect(milestoneProgress(wallBalls, data).current).toBe(23)
    const reset = milestoneProgress(wallBalls, data, { countedFrom: '2026-11-05T08:00:00.000Z' })
    expect(reset).toMatchObject({ current: null, ratio: 0 })
    const withRecord = milestoneProgress(
      getMilestone('pull-ups-10')!,
      { ...empty, records: [record('pull-up', 'max_reps', '', 12)] },
      { countedFrom: '2026-11-05T08:00:00+00:00' },
    )
    expect(withRecord.current).toBeNull()
  })

  it('zählt Trainings nach dem Zurücksetzen', () => {
    const later = { ...session('hyrox-wall-balls', 40), startedAt: '2026-11-06T10:00:00+00:00' }
    const progress = milestoneProgress(
      wallBalls,
      { ...empty, history: [session('hyrox-wall-balls', 23), later] },
      { countedFrom: '2026-11-05T08:00:00.000Z' },
    )
    expect(progress.current).toBe(40)
  })

  it('Hand-Eintrag zählt, wenn er besser ist und nach dem Zurücksetzen liegt', () => {
    expect(
      milestoneProgress(wallBalls, data, { manual: { value: 50, at: '2026-11-05T09:00:00.000Z' } })
        .current,
    ).toBe(50)
    expect(
      milestoneProgress(wallBalls, data, { manual: { value: 10, at: '2026-11-05T09:00:00.000Z' } })
        .current,
    ).toBe(23)
    expect(
      milestoneProgress(wallBalls, data, {
        countedFrom: '2026-11-05T10:00:00.000Z',
        manual: { value: 50, at: '2026-11-05T09:00:00.000Z' },
      }).current,
    ).toBeNull()
  })

  it('Zeiten per Hand: niedriger ist besser', () => {
    const progress = milestoneProgress(
      getMilestone('row-1k-sub-3-45')!,
      { ...empty, records: [record('hyrox-row', 'best_time', 'distance_m=1000', 230)] },
      { manual: { value: 220, at: '2026-11-05T09:00:00.000Z' } },
    )
    expect(progress).toMatchObject({ current: 220, achieved: true })
  })

  it('HYROX-Zeit aus dem Profil zählt nach dem Zurücksetzen nicht mehr', () => {
    expect(
      milestoneProgress(
        getMilestone('hyrox-sub-90')!,
        { ...empty, hyroxBestTimeSec: 5000 },
        {
          countedFrom: '2026-11-05T08:00:00.000Z',
        },
      ).current,
    ).toBeNull()
  })

  it('Kraft aus dem Verlauf: 1RM-Schätzung je Satz', () => {
    const progress = milestoneProgress(
      {
        slug: 'x',
        name: 'Kreuzheben 200 kg',
        area: 'strength',
        series: 'x',
        metric: { kind: 'max_weight', exercise: 'deadlift', kg: 200 },
      },
      {
        ...empty,
        history: [
          {
            startedAt: '2026-11-02T10:00:00.000Z',
            focus: 'strength',
            durationMin: 60,
            exercises: [
              {
                exerciseSlug: 'deadlift',
                sets: [{ setType: 'working', completed: true, reps: 5, weightKg: 150 }],
              },
            ],
          },
        ],
      },
    )
    expect(progress).toMatchObject({ current: 175, target: 200, unit: 'kg', achieved: false })
  })
})

describe('resolveMilestones', () => {
  it('übernimmt Name und Ziel einer Änderung, Standard bleibt abrufbar', () => {
    const resolved = resolveMilestones(MILESTONE_LIBRARY, [
      row({
        builtinSlug: 'wall-balls-100',
        name: '50 Wall Balls am Stück',
        metric: { kind: 'max_reps', exercises: ['hyrox-wall-balls'], reps: 50 },
      }),
    ])
    const wallBalls = resolved.find((m) => m.key === 'wall-balls-100')!
    expect(wallBalls).toMatchObject({ builtin: true, customized: true, hidden: false })
    expect(wallBalls.definition.name).toBe('50 Wall Balls am Stück')
    expect(wallBalls.original?.name).toBe('100 Wall Balls am Stück')
    expect(resolved).toHaveLength(MILESTONE_LIBRARY.length)
  })

  it('hängt eigene Meilensteine an und überspringt unvollständige Zeilen', () => {
    const resolved = resolveMilestones(MILESTONE_LIBRARY, [
      row({
        name: '30 Burpees am Stück',
        area: 'other',
        metric: { kind: 'max_reps', exercises: ['burpee'], reps: 30 },
      }),
      row({ id: '00000000-0000-4000-8000-000000000002', name: 'kaputt' }),
    ])
    const own = resolved.filter((m) => !m.builtin)
    expect(own).toHaveLength(1)
    expect(own[0]).toMatchObject({ key: row({}).id, rowId: row({}).id })
    expect(own[0]!.definition.area).toBe('other')
  })

  it('Ausblenden, Zurücksetzen und Hand-Eintrag wirken auf den Stand', () => {
    const [pullUps] = resolveMilestones(MILESTONE_LIBRARY, [
      row({
        builtinSlug: 'pull-ups-10',
        hidden: true,
        countedFrom: '2026-11-05T08:00:00.000Z',
        manual: { value: 9, at: '2026-11-05T09:00:00.000Z' },
      }),
    ])
    expect(pullUps).toMatchObject({ key: 'pull-ups-10', hidden: true, customized: false })
    const progress = resolvedProgress(pullUps!, {
      ...empty,
      records: [record('pull-up', 'max_reps', '', 12)],
    })
    expect(progress.current).toBe(9)
  })
})

describe('Zielwert', () => {
  it('liest und setzt den Zielwert je Art', () => {
    const reps = getMilestone('pull-ups-10')!.metric
    expect(metricTarget(reps)).toBe(10)
    expect(withTarget(reps, 12)).toMatchObject({ kind: 'max_reps', reps: 12 })
    const time = getMilestone('run-5k-sub-20')!.metric
    expect(metricTarget(withTarget(time, 1150))).toBe(1150)
    const factor = getMilestone('bench-press-1x-bodyweight')!.metric
    expect(withTarget(factor, 1.1)).toMatchObject({ kind: 'relative_strength', factor: 1.1 })
  })
})
