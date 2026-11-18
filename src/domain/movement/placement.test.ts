import { describe, expect, it } from 'vitest'
import { getLibraryExercise } from '@/data/exercises'
import { generatedWorkoutSchema } from '@/domain/generator/schema'
import type { GeneratedWorkout, WorkoutItem } from '@/domain/generator/types'
import { addMovement, movementInWorkout, movementItem, removeMovement } from './placement'
import { BREATHING, HIP_SWITCH, SHRIMP } from './testFixtures'

const item = (slug: string, extra: Partial<WorkoutItem> = {}): WorkoutItem => ({
  exerciseSlug: slug,
  exerciseName: slug,
  role: 'warmup_drill',
  sets: [{ type: 'working', reps: 10, restSec: 0 }],
  estimatedSec: 60,
  ...extra,
})

const WORKOUT: GeneratedWorkout = {
  generatorVersion: 'test',
  seed: 1,
  focus: 'hyrox',
  intensity: 'moderate',
  targetDurationMin: 60,
  estimatedDurationMin: 3,
  blocks: [
    {
      type: 'warmup',
      items: [item('a'), item('skill-x', { role: 'skill', skillSlug: 'handstand' })],
    },
    { type: 'main', items: [item('b', { role: 'strength_main' })] },
  ],
  explanation: ['Test'],
  recoverySuggested: false,
}

const slugs = (workout: GeneratedWorkout, type: string) =>
  workout.blocks.find((b) => b.type === type)?.items.map((i) => i.exerciseSlug)

describe('Movement im Warm-up/Cool-down', () => {
  it('Eintrag mit der unteren Dosierung und Rolle „movement“', () => {
    expect(movementItem(HIP_SWITCH)).toMatchObject({
      role: 'movement',
      sets: [{ type: 'working', reps: 6, durationSec: undefined, restSec: 0 }],
      estimatedSec: 6 * 5 + 15,
    })
    expect(movementItem(SHRIMP).sets[0]).toMatchObject({ durationSec: 30, reps: undefined })
  })

  it('ins Warm-up vor die Skill-Übungen, Dauer wird neu berechnet', () => {
    const workout = addMovement(WORKOUT, HIP_SWITCH, 'warmup')
    expect(slugs(workout, 'warmup')).toEqual(['a', 'movement-hip-switch', 'skill-x'])
    expect(workout.estimatedDurationMin).toBe(Math.round((180 + 45) / 60))
    expect(generatedWorkoutSchema.safeParse(workout).success).toBe(true)
  })

  it('legt ein fehlendes Cool-down am Ende an', () => {
    const workout = addMovement(WORKOUT, BREATHING, 'cooldown')
    expect(workout.blocks.map((b) => b.type)).toEqual(['warmup', 'main', 'cooldown'])
    expect(slugs(workout, 'cooldown')).toEqual(['movement-box-breathing'])
  })

  it('legt ein fehlendes Warm-up am Anfang an', () => {
    const noWarmup = { ...WORKOUT, blocks: WORKOUT.blocks.slice(1) }
    expect(addMovement(noWarmup, SHRIMP, 'warmup').blocks.map((b) => b.type)).toEqual([
      'warmup',
      'main',
    ])
  })

  it('keine Doppelten und keine Übungen außerhalb des Movement Lab', () => {
    const once = addMovement(WORKOUT, HIP_SWITCH, 'warmup')
    expect(addMovement(once, HIP_SWITCH, 'cooldown')).toBe(once)
    expect(addMovement(WORKOUT, getLibraryExercise('couch-stretch')!, 'cooldown')).toBe(WORKOUT)
  })

  it('listet eingebaute Übungen mit Stelle und entfernt sie wieder', () => {
    const workout = addMovement(addMovement(WORKOUT, HIP_SWITCH, 'warmup'), BREATHING, 'cooldown')
    expect(movementInWorkout(workout).map((m) => [m.placement, m.item.exerciseSlug])).toEqual([
      ['warmup', 'movement-hip-switch'],
      ['cooldown', 'movement-box-breathing'],
    ])
    const removed = removeMovement(workout, 'movement-box-breathing')
    expect(removed.blocks.map((b) => b.type)).toEqual(['warmup', 'main'])
    expect(slugs(removeMovement(removed, 'movement-hip-switch'), 'warmup')).toEqual([
      'a',
      'skill-x',
    ])
  })

  it('entfernt nur Movement-Einträge, keine gleichnamigen anderen', () => {
    expect(removeMovement(WORKOUT, 'a')).toEqual({ ...WORKOUT, estimatedDurationMin: 3 })
  })
})
