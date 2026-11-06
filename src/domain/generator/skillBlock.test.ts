import { describe, expect, it } from 'vitest'
import { getSkill } from '@/data/skills'
import { generateWorkout } from './generateWorkout'
import { generatedWorkoutSchema } from './schema'
import { addSkill, removeSkill, skillBudgetSec, skillsInWorkout } from './skillBlock'
import { LIBRARY, makeInput, NOW, workSets } from './testFixtures'
import { FOCUSES, type GeneratedWorkout, type HistorySession, type SkillRequest } from './types'
import { generateWeekPlan } from './weekPlan'

const skills = (
  active: SkillRequest['active'],
  setting: SkillRequest['setting'] = 'normal',
): SkillRequest => ({ setting, active })

const MUSCLE_UP = { skillSlug: 'muscle-up', stage: 3 }
const FRONT_SPLIT = { skillSlug: 'front-split', stage: 1 }
const HANDSTAND = { skillSlug: 'handstand', stage: 1 }
const L_SIT = { skillSlug: 'l-sit', stage: 1 }
const BOX_JUMP = { skillSlug: 'box-jump', stage: 1 }

const skillItems = (workout: GeneratedWorkout) =>
  workout.blocks.flatMap((b) =>
    b.items.filter((i) => i.role === 'skill').map((i) => ({ ...i, block: b.type })),
  )
const skillSeconds = (workout: GeneratedWorkout) =>
  skillItems(workout).reduce((sum, i) => sum + i.estimatedSec, 0)

const hoursAgo = (hours: number) => new Date(Date.parse(NOW) - hours * 3600_000).toISOString()

describe('Zeitbudget des Skill-Blocks', () => {
  it('ist höchstens 15 % der Dauer und nie über 15 Minuten', () => {
    expect(skillBudgetSec(45, 'normal')).toBe(7 * 60)
    expect(skillBudgetSec(60, 'normal')).toBe(9 * 60)
    expect(skillBudgetSec(90, 'normal')).toBe(14 * 60)
    expect(skillBudgetSec(150, 'normal')).toBe(15 * 60)
    expect(skillBudgetSec(60, 'small')).toBe(5 * 60)
    expect(skillBudgetSec(60, 'off')).toBe(0)
  })
})

describe('Skill-Block im Generator', () => {
  it('Kraft-Skill am Ende des Warm-ups, Beweglichkeit im Cool-down', () => {
    const workout = generateWorkout(
      makeInput({ focus: 'strength' }, { skills: skills([MUSCLE_UP, FRONT_SPLIT]) }),
    )
    const items = skillItems(workout)
    const warmup = workout.blocks.find((b) => b.type === 'warmup')!
    const cooldown = workout.blocks.find((b) => b.type === 'cooldown')!
    expect(warmup.items.at(-1)?.skillSlug).toBe('muscle-up')
    expect(cooldown.items.some((i) => i.skillSlug === 'front-split')).toBe(true)
    expect(items.every((i) => getSkill(i.skillSlug!)?.stages.length)).toBe(true)
    expect(items[0]?.note).toContain('Stufe 3')
    expect(workout.explanation.some((l) => l.startsWith('Skill-Block nach dem Warm-up'))).toBe(true)
    expect(generatedWorkoutSchema.safeParse(workout).success).toBe(true)
  })

  it('der Hauptteil bleibt erhalten und der Block bleibt im Budget – alle Schwerpunkte', () => {
    for (const focus of FOCUSES) {
      for (const durationMin of [45, 60, 90]) {
        for (const seed of [1, 2, 3]) {
          const label = `${focus} ${durationMin} min Seed ${seed}`
          const plain = generateWorkout(makeInput({ focus, durationMin }, { seed }))
          const withSkills = generateWorkout(
            makeInput({ focus, durationMin }, { seed, skills: skills([L_SIT, FRONT_SPLIT]) }),
          )
          const mainRoles = (w: GeneratedWorkout) =>
            w.blocks
              .filter((b) => b.type === 'main')
              .flatMap((b) => b.items.map((i) => i.role))
              .sort()
          expect(mainRoles(withSkills), label).toEqual(mainRoles(plain))
          expect(skillSeconds(withSkills), label).toBeLessThanOrEqual(
            skillBudgetSec(durationMin, 'normal') + 60,
          )
          // Gesamtdauer bleibt beim Ziel (Toleranz wie ohne Skills)
          expect(
            Math.abs(withSkills.estimatedDurationMin - plain.estimatedDurationMin),
            label,
          ).toBeLessThanOrEqual(6)
        }
      }
    }
  })

  it('ohne Einstellung oder bei „aus" ändert sich nichts', () => {
    const plain = generateWorkout(makeInput({ focus: 'hyrox' }))
    expect(
      generateWorkout(makeInput({ focus: 'hyrox' }, { skills: skills([MUSCLE_UP], 'off') })),
    ).toEqual(plain)
    expect(generateWorkout(makeInput({ focus: 'hyrox' }, { skills: skills([]) }))).toEqual(plain)
  })

  it('Regeneration: nur Beweglichkeit', () => {
    const workout = generateWorkout(
      makeInput({ focus: 'recovery' }, { skills: skills([MUSCLE_UP, FRONT_SPLIT]) }),
    )
    expect(skillsInWorkout(workout)).toEqual(['front-split'])
  })

  it('niedrige Tagesform: keine Kraft-Skills, Balance und Beweglichkeit bleiben', () => {
    const readiness = { kind: 'quick', level: 'low' } as const
    const strength = generateWorkout(
      makeInput({ focus: 'endurance', readiness }, { skills: skills([MUSCLE_UP, FRONT_SPLIT]) }),
    )
    expect(skillsInWorkout(strength)).toEqual(['front-split'])
    expect(strength.explanation.some((l) => l.includes('Muscle-Up heute nicht'))).toBe(true)
    const balance = generateWorkout(
      makeInput({ focus: 'endurance', readiness }, { skills: skills([HANDSTAND]) }),
    )
    expect(skillsInWorkout(balance)).toEqual(['handstand'])
  })

  it('stark ermüdete Muskeln: Skill entfällt mit Begründung', () => {
    const history: HistorySession[] = [
      {
        startedAt: hoursAgo(20),
        focus: 'strength',
        durationMin: 60,
        exercises: [
          { exerciseSlug: 'pull-up', block: 'main', sets: workSets(10, 8, 9) },
          { exerciseSlug: 'barbell-row', block: 'main', sets: workSets(10, 8, 9) },
          { exerciseSlug: 'lat-pulldown', block: 'main', sets: workSets(10, 10, 9) },
        ],
      },
    ]
    const workout = generateWorkout(
      makeInput({ focus: 'endurance' }, { history, skills: skills([MUSCLE_UP, HANDSTAND]) }),
    )
    expect(skillsInWorkout(workout)).toEqual(['handstand'])
    expect(workout.explanation.some((l) => l.startsWith('Muscle-Up heute nicht'))).toBe(true)
  })

  it('Sprünge nie vor schweren Beintagen oder HYROX', () => {
    for (const focus of ['strength', 'hyrox', 'full_body', 'mixed'] as const) {
      const workout = generateWorkout(makeInput({ focus }, { skills: skills([BOX_JUMP]) }))
      expect(skillsInWorkout(workout), focus).toEqual([])
    }
    const endurance = generateWorkout(
      makeInput({ focus: 'endurance' }, { skills: skills([BOX_JUMP]) }),
    )
    expect(skillsInWorkout(endurance)).toEqual(['box-jump'])
  })

  it('höchstens ein Kraft-Skill pro Training – das am längsten nicht geübte zuerst', () => {
    const history: HistorySession[] = [
      {
        startedAt: hoursAgo(30),
        focus: 'endurance',
        durationMin: 45,
        exercises: [{ exerciseSlug: 'tuck-l-sit', block: 'warmup', sets: workSets(3, 1, 6) }],
      },
    ]
    const lSitStage = getSkill('l-sit')!.stages[0]!
    expect(lSitStage.exercises).toContain('tuck-l-sit')
    const workout = generateWorkout(
      makeInput({ focus: 'endurance' }, { history, skills: skills([L_SIT, HANDSTAND]) }),
    )
    expect(skillsInWorkout(workout)).toEqual(['handstand'])
  })

  it('plant keine Übung doppelt, die schon im Training steht', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const workout = generateWorkout(
        makeInput(
          { focus: 'strength' },
          { seed, skills: skills([{ skillSlug: 'muscle-up', stage: 1 }]) },
        ),
      )
      const slugs = workout.blocks.flatMap((b) => b.items.map((i) => i.exerciseSlug))
      expect(new Set(slugs).size, `Seed ${seed}`).toBe(slugs.length)
    }
  })
})

describe('Wochenplan', () => {
  it('verteilt mehrere aktive Ziele über die Woche', () => {
    const plan = generateWeekPlan({
      weekStart: '2026-10-26',
      today: '2026-10-26',
      trainingDaysPerWeek: 5,
      preferredWeekdays: [],
      durationMin: 60,
      profile: makeInput().profile,
      goals: makeInput().goals,
      exercises: LIBRARY,
      history: [],
      done: [],
      kept: [],
      seed: 3,
      skills: skills([L_SIT, HANDSTAND, FRONT_SPLIT]),
    })
    const counts = new Map<string, number>()
    for (const day of plan.days) {
      for (const slug of skillsInWorkout(day.workout)) counts.set(slug, (counts.get(slug) ?? 0) + 1)
    }
    expect(counts.get('l-sit') ?? 0).toBeGreaterThanOrEqual(2)
    expect(counts.get('handstand') ?? 0).toBeGreaterThanOrEqual(2)
    expect(counts.get('front-split') ?? 0).toBeGreaterThanOrEqual(2)
  })
})

describe('Skill von Hand einbauen', () => {
  const ctx = {
    exercises: LIBRARY,
    level: 'intermediate',
    intensity: 'moderate',
    history: [],
  } as const

  it('fügt die Übungen der Stufe ins Warm-up ein und entfernt sie wieder', () => {
    const workout = generateWorkout(makeInput({ focus: 'hyrox' }))
    const added = addSkill(workout, HANDSTAND, 'normal', ctx)
    const warmup = added.blocks.find((b) => b.type === 'warmup')!
    expect(warmup.items.at(-1)?.skillSlug).toBe('handstand')
    expect(added.estimatedDurationMin).toBeGreaterThan(workout.estimatedDurationMin)
    expect(generatedWorkoutSchema.safeParse(added).success).toBe(true)

    const removed = removeSkill(added, 'handstand')
    expect(skillsInWorkout(removed)).toEqual([])
    expect(removed.blocks).toEqual(workout.blocks)
  })

  it('ersetzt einen Skill an derselben Stelle, Beweglichkeit kommt dazu', () => {
    const workout = generateWorkout(makeInput({ focus: 'endurance' }))
    let next = addSkill(workout, HANDSTAND, 'off', ctx)
    next = addSkill(next, L_SIT, 'off', ctx)
    expect(skillsInWorkout(next)).toEqual(['l-sit'])
    next = addSkill(next, FRONT_SPLIT, 'off', ctx)
    expect(skillsInWorkout(next)).toEqual(['l-sit', 'front-split'])
    // Erneut wählen ersetzt statt zu verdoppeln
    expect(skillsInWorkout(addSkill(next, L_SIT, 'off', ctx))).toEqual(['l-sit', 'front-split'])
  })

  it('ignoriert unbekannte Skills und Stufen', () => {
    const workout = generateWorkout(makeInput({ focus: 'endurance' }))
    expect(addSkill(workout, { skillSlug: 'gibt-es-nicht', stage: 1 }, 'normal', ctx)).toBe(workout)
    expect(addSkill(workout, { skillSlug: 'handstand', stage: 99 }, 'normal', ctx)).toBe(workout)
  })
})
