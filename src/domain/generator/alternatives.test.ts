import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/data/exercises/vocabulary'
import { suggestAlternatives, swapExercise } from './alternatives'
import { generateWorkout } from './generateWorkout'
import { generatedWorkoutSchema } from './schema'
import { LIBRARY, makeInput } from './testFixtures'
import { FOCUSES } from './types'

const bySlug = new Map(LIBRARY.map((e) => [e.slug, e]))
const profile = makeInput().profile

describe('suggestAlternatives – Pflichttest 4 (SPEC §15)', () => {
  it('liefert Alternativen mit gleichem Muster, gleichen Hauptmuskeln oder gleicher Station', () => {
    const problems: string[] = []
    for (const original of LIBRARY.filter((e) => e.category !== 'cooldown')) {
      for (const suggestion of suggestAlternatives({
        exerciseSlug: original.slug,
        exercises: LIBRARY,
        profile,
      })) {
        const candidate = suggestion.exercise
        const curated = original.alternatives.includes(candidate.slug)
        const samePattern = candidate.movementPattern === original.movementPattern
        const sharedMuscle = candidate.primaryMuscles.some((m) =>
          original.primaryMuscles.includes(m),
        )
        const sameStation =
          original.hyroxStation !== undefined && candidate.hyroxStation === original.hyroxStation
        if (!curated && !(samePattern && sharedMuscle) && !sameStation && !sharedMuscle) {
          problems.push(`${original.slug} → ${candidate.slug}`)
        }
      }
    }
    expect(problems).toEqual([])
  })

  it('beachtet nicht verfügbare Geräte, Einschränkungen und ausgeblendete Übungen', () => {
    const unavailable: Equipment[] = ['barbell', 'trap_bar']
    const exercises = LIBRARY.map((e) =>
      e.slug === 'goblet-squat' ? { ...e, preference: 'hidden' as const } : e,
    )
    const suggestions = suggestAlternatives({
      exerciseSlug: 'back-squat',
      exercises,
      profile: { ...profile, limitationRegions: ['lower_back'] },
      unavailableEquipment: unavailable,
      limit: 20,
    })
    expect(suggestions.length).toBeGreaterThan(0)
    for (const { exercise } of suggestions) {
      expect(
        exercise.equipment.some((e) => unavailable.includes(e)),
        exercise.slug,
      ).toBe(false)
      expect(exercise.stressRegions, exercise.slug).not.toContain('lower_back')
      expect(exercise.slug).not.toBe('goblet-squat')
    }
  })

  it('stellt gepflegte Alternativen an den Anfang', () => {
    const [first] = suggestAlternatives({
      exerciseSlug: 'hyrox-sled-push',
      exercises: LIBRARY,
      profile,
    })
    expect(bySlug.get('hyrox-sled-push')?.alternatives).toContain(first?.exercise.slug)
    expect(first?.reason).toBe('Empfohlene Alternative')
  })

  it('schließt Übungen aus, die schon im Workout sind', () => {
    const slugs = suggestAlternatives({
      exerciseSlug: 'back-squat',
      exercises: LIBRARY,
      profile,
      excludeSlugs: ['front-squat', 'goblet-squat'],
      limit: 20,
    }).map((s) => s.exercise.slug)
    expect(slugs).not.toContain('front-squat')
    expect(slugs).not.toContain('goblet-squat')
    expect(slugs).not.toContain('back-squat')
  })

  it('findet für eine unbekannte Übung nichts', () => {
    expect(
      suggestAlternatives({ exerciseSlug: 'gibt-es-nicht', exercises: LIBRARY, profile }),
    ).toEqual([])
  })
})

describe('swapExercise', () => {
  it('ersetzt die Übung, behält die Rolle und dosiert neu', () => {
    const workout = generateWorkout(makeInput({ focus: 'strength' }))
    const blockIndex = workout.blocks.findIndex((b) => b.type === 'main')
    const original = workout.blocks[blockIndex]?.items[0]
    const replacement = bySlug.get('goblet-squat')
    if (!original || !replacement) throw new Error('Testdaten fehlen')

    const swapped = swapExercise(workout, blockIndex, 0, replacement, {
      level: 'intermediate',
      history: [],
    })
    const item = swapped.blocks[blockIndex]?.items[0]
    expect(item?.exerciseSlug).toBe('goblet-squat')
    expect(item?.role).toBe(original.role)
    expect(item?.estimatedSec).toBeGreaterThan(0)
    expect(generatedWorkoutSchema.safeParse(swapped).success).toBe(true)
  })

  it('behält im Zirkel die Rundenzahl', () => {
    const workout = generateWorkout(makeInput({ focus: 'hyrox' }))
    const blockIndex = workout.blocks.findIndex((b) => b.rounds !== undefined)
    const block = workout.blocks[blockIndex]
    const replacement = bySlug.get('hyrox-wall-balls')
    if (!block || !replacement) throw new Error('Testdaten fehlen')
    const itemIndex = block.items.findIndex((i) => i.exerciseSlug !== 'hyrox-wall-balls')
    const swapped = swapExercise(workout, blockIndex, itemIndex, replacement, {
      level: 'intermediate',
      history: [],
    })
    expect(swapped.blocks[blockIndex]?.items[itemIndex]?.sets).toHaveLength(block.rounds ?? 0)
  })
})

describe('generatedWorkoutSchema', () => {
  it('akzeptiert alle generierten Workouts', () => {
    for (const focus of FOCUSES) {
      for (const durationMin of [30, 60, 90]) {
        const result = generatedWorkoutSchema.safeParse(
          generateWorkout(makeInput({ focus, durationMin }, { seed: 5 })),
        )
        expect(result.success, `${focus} ${durationMin}`).toBe(true)
      }
    }
  })

  it('lehnt unvollständige Workouts ab', () => {
    expect(generatedWorkoutSchema.safeParse({ focus: 'hyrox' }).success).toBe(false)
  })
})
