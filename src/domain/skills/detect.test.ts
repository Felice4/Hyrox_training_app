import { describe, expect, it } from 'vitest'
import { SKILL_LIBRARY } from '@/data/skills'
import type { HistorySession, HistorySet } from '@/domain/generator/types'
import { detectCompletedStages, stageProgress, stageStart } from './detect'
import type { SkillGoal, StageLogEntry } from './goals'

const goal = (skillSlug: string, completedStages: number, activatedAt = '2026-11-01T10:00:00Z') =>
  ({
    skillSlug,
    status: 'active',
    completedStages,
    activatedAt,
    achievedAt: null,
  }) satisfies SkillGoal

const set = (values: Partial<HistorySet>): HistorySet => ({
  setType: 'working',
  completed: true,
  ...values,
})

const session = (
  id: string,
  startedAt: string,
  exercises: HistorySession['exercises'],
): HistorySession => ({ id, startedAt, focus: 'strength', durationMin: 60, exercises })

describe('Automatische Stufenprüfung', () => {
  it('erkennt Wiederholungen am Stück – auch im Skill-Block im Warm-up', () => {
    const history = [
      session('a', '2026-11-03T17:00:00Z', [
        { exerciseSlug: 'pull-up', block: 'warmup', sets: [set({ reps: 6 }), set({ reps: 8 })] },
      ]),
    ]
    const [detected] = detectCompletedStages([goal('muscle-up', 0)], [], history)
    expect(detected).toMatchObject({ stageNumber: 1, met: true, sessionIds: ['a'] })
    expect(detected?.criteria[0]).toMatchObject({ best: 8, target: 8, met: true })
  })

  it('zählt keine Aufwärmsätze, keine offenen Sätze und nichts vor Beginn der Stufe', () => {
    const history = [
      session('alt', '2026-10-20T17:00:00Z', [
        { exerciseSlug: 'pull-up', block: 'main', sets: [set({ reps: 12 })] },
      ]),
      session('neu', '2026-11-03T17:00:00Z', [
        {
          exerciseSlug: 'pull-up',
          block: 'main',
          sets: [
            set({ reps: 10, setType: 'warmup' }),
            set({ reps: 9, completed: false }),
            set({ reps: 7 }),
          ],
        },
      ]),
    ]
    const progress = stageProgress(goal('muscle-up', 0), [], history)
    expect(progress?.criteria[0]?.best).toBe(7)
    expect(progress?.met).toBe(false)
    expect(detectCompletedStages([goal('muscle-up', 0)], [], history)).toEqual([])
  })

  it('braucht alle Kriterien – auch aus verschiedenen Trainings', () => {
    const pullUps = session('a', '2026-11-02T17:00:00Z', [
      { exerciseSlug: 'pull-up', block: 'main', sets: [set({ reps: 10 })] },
    ])
    const hollow = session('b', '2026-11-04T17:00:00Z', [
      { exerciseSlug: 'hollow-hold', block: 'warmup', sets: [set({ durationSec: 30 })] },
    ])
    expect(stageProgress(goal('front-lever', 0), [], [pullUps])?.met).toBe(false)
    const both = stageProgress(goal('front-lever', 0), [], [pullUps, hollow])
    expect(both?.met).toBe(true)
    expect(both?.sessionIds.sort()).toEqual(['a', 'b'])
  })

  it('Stufen mit Bestätigung von Hand werden nie automatisch erkannt', () => {
    const manual = SKILL_LIBRARY.flatMap((skill) =>
      skill.stages.flatMap((stage, index) =>
        stage.criteria.some((c) => c.kind === 'manual') ? [{ skill, index }] : [],
      ),
    )
    expect(manual.length).toBeGreaterThan(0)
    for (const { skill, index } of manual) {
      const progress = stageProgress(goal(skill.slug, index), [], [])
      expect(progress?.manualOnly, skill.slug).toBe(true)
      expect(progress?.met, skill.slug).toBe(false)
    }
  })

  it('beginnt nach der zuletzt geschafften Stufe neu zu zählen', () => {
    const log: StageLogEntry[] = [
      { skillSlug: 'muscle-up', stage: 1, achievedAt: '2026-11-03T18:00:00Z', source: 'session' },
    ]
    expect(stageStart(goal('muscle-up', 1), log)).toBe('2026-11-03T18:00:00Z')
    const history = [
      session('vorher', '2026-11-03T17:00:00Z', [
        { exerciseSlug: 'chest-to-bar-pull-up', block: 'main', sets: [set({ reps: 6 })] },
      ]),
    ]
    expect(stageProgress(goal('muscle-up', 1), log, history)?.met).toBe(false)
  })

  it('ignoriert Ziele, die nicht aktiv oder schon komplett sind', () => {
    const history = [
      session('a', '2026-11-03T17:00:00Z', [
        { exerciseSlug: 'pull-up', block: 'main', sets: [set({ reps: 20 })] },
      ]),
    ]
    expect(
      detectCompletedStages([{ ...goal('muscle-up', 0), status: 'later' }], [], history),
    ).toEqual([])
    expect(stageProgress(goal('muscle-up', 99), [], history)).toBeUndefined()
  })
})
