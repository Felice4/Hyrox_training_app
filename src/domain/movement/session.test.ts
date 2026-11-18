import { describe, expect, it } from 'vitest'
import { generatedWorkoutSchema } from '@/domain/generator/schema'
import {
  addExercise,
  buildMovementWorkout,
  EMPTY_MOVEMENT_PLAN,
  moveItem,
  planGroups,
  planItemFromExercise,
  removeItem,
  restoreMovementPlan,
  type MovementPlan,
} from './session'
import { BREATHING, HIP_SWITCH, SHRIMP, SKIP } from './testFixtures'

const PLAN: MovementPlan = [SKIP, HIP_SWITCH, SHRIMP].reduce(addExercise, EMPTY_MOVEMENT_PLAN)

describe('Mobility-Einheit', () => {
  it('übernimmt die unteren Werte der Übung als Vorgabe', () => {
    expect(planItemFromExercise(SHRIMP)).toMatchObject({
      sets: 1,
      durationSec: 30,
      restSec: 0,
      groups: ['ground', 'core'],
    })
    expect(planItemFromExercise(HIP_SWITCH)).toMatchObject({ sets: 1, reps: 6 })
  })

  it('fügt keine Übung doppelt hinzu, verschiebt und entfernt', () => {
    expect(addExercise(PLAN, SHRIMP).items).toHaveLength(3)
    const moved = moveItem(PLAN, 2, -1)
    expect(moved.items.map((i) => i.slug)).toEqual([
      'movement-boxer-skip',
      'movement-shrimp',
      'movement-hip-switch',
    ])
    expect(moveItem(PLAN, 0, -1)).toBe(PLAN)
    expect(removeItem(PLAN, 0).items.map((i) => i.slug)).toEqual([
      'movement-hip-switch',
      'movement-shrimp',
    ])
  })

  it('Gruppen nach der jeweils ersten Gruppe der Übung, in fester Reihenfolge', () => {
    expect(planGroups(PLAN)).toEqual(['mobility', 'footwork', 'ground'])
  })

  it('baut ein gültiges Workout Übung für Übung', () => {
    const workout = buildMovementWorkout(PLAN)!
    expect(generatedWorkoutSchema.safeParse(workout).success).toBe(true)
    expect(workout.title).toBe(
      'Mobility-Einheit: Mobilität · Beinarbeit & Koordination · Bodenbewegungen',
    )
    expect(workout.focus).toBe('recovery')
    expect(workout.intensity).toBe('easy')
    const [block] = workout.blocks
    expect(block?.rounds).toBeUndefined()
    expect(block?.items.every((i) => i.role === 'movement')).toBe(true)
    expect(block?.items[0]?.sets[0]).toEqual({
      type: 'working',
      reps: undefined,
      durationSec: 30,
      weightKg: undefined,
      restSec: 0,
    })
    expect(block?.items[1]?.sets[0]).toMatchObject({ reps: 6, durationSec: undefined })
  })

  it('übernimmt geänderte Vorgaben', () => {
    const plan: MovementPlan = {
      ...PLAN,
      items: PLAN.items.map((item, i) => (i === 2 ? { ...item, sets: 3, restSec: 30 } : item)),
    }
    const item = buildMovementWorkout(plan)!.blocks[0]!.items[2]!
    expect(item.sets).toHaveLength(3)
    expect(item.sets[0]?.restSec).toBe(30)
  })

  it('Zirkel: gleiche Rundenzahl, Pause nur nach der letzten Übung', () => {
    const plan = { ...PLAN, mode: 'circuit' as const, rounds: 4 }
    const last = { ...plan.items[2]!, restSec: 45 }
    const workout = buildMovementWorkout({ ...plan, items: [...plan.items.slice(0, 2), last] })!
    expect(generatedWorkoutSchema.safeParse(workout).success).toBe(true)
    const [block] = workout.blocks
    expect(block?.rounds).toBe(4)
    expect(block?.items.every((i) => i.sets.length === 4)).toBe(true)
    expect(block?.items.map((i) => i.sets[0]?.restSec)).toEqual([0, 0, 45])
  })

  it('Zirkel mit nur einer Übung läuft als normale Sätze', () => {
    const single = { ...removeItem(removeItem(PLAN, 0), 0), mode: 'circuit' as const }
    expect(buildMovementWorkout(single)?.blocks[0]?.rounds).toBeUndefined()
  })

  it('ohne Übungen kein Workout; kurze Einheiten mindestens 10 min Ziel', () => {
    expect(buildMovementWorkout(EMPTY_MOVEMENT_PLAN)).toBeUndefined()
    const short = addExercise(EMPTY_MOVEMENT_PLAN, BREATHING)
    expect(buildMovementWorkout(short)?.targetDurationMin).toBe(10)
  })
})

describe('restoreMovementPlan', () => {
  it('übernimmt einen gültigen Plan und verwirft Beschädigtes', () => {
    const stored = JSON.parse(JSON.stringify({ ...PLAN, mode: 'circuit', rounds: 5 }))
    expect(restoreMovementPlan(stored)).toEqual({ ...PLAN, mode: 'circuit', rounds: 5 })
    expect(restoreMovementPlan(null)).toEqual(EMPTY_MOVEMENT_PLAN)
    expect(
      restoreMovementPlan({ items: [{ slug: 'x', sets: 0 }, PLAN.items[0]], mode: 'egal' }),
    ).toEqual({ items: [PLAN.items[0]], mode: 'sequence', rounds: 3 })
  })
})
