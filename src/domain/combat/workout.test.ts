import { describe, expect, it } from 'vitest'
import { getLibraryExercise } from '@/data/exercises'
import { generatedWorkoutSchema } from '@/domain/generator/schema'
import {
  addDrill,
  buildCombatWorkout,
  EMPTY_COMBAT_PLAN,
  moveItem,
  planItemFromDrill,
  planSports,
  removeItem,
  restoreCombatPlan,
  type CombatPlan,
} from './workout'

const drill = (slug: string) => getLibraryExercise(slug)!

const PLAN: CombatPlan = ['boxing-jab-cross', 'bjj-shrimp', 'mma-sprawl'].reduce(
  (plan, slug) => addDrill(plan, drill(slug)),
  EMPTY_COMBAT_PLAN,
)

describe('Kampfsport-Training', () => {
  it('übernimmt die unteren Werte des Drills als Vorgabe', () => {
    expect(planItemFromDrill(drill('boxing-jab-cross'))).toMatchObject({
      sets: 3,
      durationSec: 120,
      restSec: 45,
      sports: ['boxing', 'kickboxing', 'mma'],
    })
    expect(planItemFromDrill(drill('bjj-gi-pull-up'))).toMatchObject({ sets: 3, reps: 3 })
  })

  it('fügt keinen Drill doppelt hinzu, verschiebt und entfernt', () => {
    expect(addDrill(PLAN, drill('mma-sprawl')).items).toHaveLength(3)
    const moved = moveItem(PLAN, 2, -1)
    expect(moved.items.map((i) => i.slug)).toEqual(['boxing-jab-cross', 'mma-sprawl', 'bjj-shrimp'])
    expect(moveItem(PLAN, 0, -1)).toBe(PLAN)
    expect(removeItem(PLAN, 0).items.map((i) => i.slug)).toEqual(['bjj-shrimp', 'mma-sprawl'])
  })

  it('Sportarten nach der jeweils ersten Sportart des Drills, in fester Reihenfolge', () => {
    expect(planSports(PLAN)).toEqual(['bjj', 'boxing', 'mma'])
  })

  it('baut ein gültiges Workout Drill für Drill', () => {
    const workout = buildCombatWorkout(PLAN)!
    expect(generatedWorkoutSchema.safeParse(workout).success).toBe(true)
    expect(workout.title).toBe('Kampfsport: BJJ · Boxen · MMA')
    expect(workout.focus).toBe('mixed')
    const [block] = workout.blocks
    expect(block?.rounds).toBeUndefined()
    expect(block?.items.map((i) => i.sets.length)).toEqual([3, 3, 3])
    expect(block?.items[0]?.sets[0]).toEqual({
      type: 'working',
      reps: undefined,
      durationSec: 120,
      weightKg: undefined,
      restSec: 45,
    })
    expect(block?.items[2]?.sets[0]).toMatchObject({ reps: 8, durationSec: undefined })
  })

  it('übernimmt Gewicht und geänderte Vorgaben', () => {
    const plan: CombatPlan = {
      ...PLAN,
      items: PLAN.items.map((item, i) => (i === 2 ? { ...item, sets: 5, weightKg: 10 } : item)),
    }
    const item = buildCombatWorkout(plan)!.blocks[0]!.items[2]!
    expect(item.sets).toHaveLength(5)
    expect(item.sets[0]?.weightKg).toBe(10)
  })

  it('Zirkel: gleiche Rundenzahl, Pause nur nach dem letzten Drill', () => {
    const workout = buildCombatWorkout({ ...PLAN, mode: 'circuit', rounds: 4 })!
    expect(generatedWorkoutSchema.safeParse(workout).success).toBe(true)
    const [block] = workout.blocks
    expect(block?.rounds).toBe(4)
    expect(block?.items.every((i) => i.sets.length === 4)).toBe(true)
    expect(block?.items.map((i) => i.sets[0]?.restSec)).toEqual([0, 0, 30])
  })

  it('Zirkel mit nur einem Drill läuft als normale Sätze', () => {
    const single = { ...removeItem(removeItem(PLAN, 0), 0), mode: 'circuit' as const }
    expect(buildCombatWorkout(single)?.blocks[0]?.rounds).toBeUndefined()
  })

  it('ohne Drills kein Workout; kurze Trainings mindestens 10 min Ziel', () => {
    expect(buildCombatWorkout(EMPTY_COMBAT_PLAN)).toBeUndefined()
    const short = addDrill(EMPTY_COMBAT_PLAN, drill('bjj-technical-stand-up'))
    expect(buildCombatWorkout(short)?.targetDurationMin).toBe(10)
  })
})

describe('restoreCombatPlan', () => {
  it('übernimmt einen gültigen Plan und verwirft Beschädigtes', () => {
    const stored = JSON.parse(JSON.stringify({ ...PLAN, mode: 'circuit', rounds: 5 }))
    expect(restoreCombatPlan(stored)).toEqual({ ...PLAN, mode: 'circuit', rounds: 5 })
    expect(restoreCombatPlan(null)).toEqual(EMPTY_COMBAT_PLAN)
    expect(
      restoreCombatPlan({ items: [{ slug: 'x', sets: 0 }, PLAN.items[0]], mode: 'egal' }),
    ).toEqual({ items: [PLAN.items[0]], mode: 'sequence', rounds: 3 })
  })
})
