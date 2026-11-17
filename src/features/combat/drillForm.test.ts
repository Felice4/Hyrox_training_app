import { describe, expect, it } from 'vitest'
import type { CatalogExercise } from '@/api/exercises'
import { getLibraryExercise } from '@/data/exercises'
import { draftFromDrill, drillDraftToExercise, emptyDrillDraft } from './drillForm'

const SLUG = 'custom-test'

describe('Formular für eigene Kampfsport-Drills', () => {
  it('legt einen Drill auf Zeit an', () => {
    const result = drillDraftToExercise(
      { ...emptyDrillDraft('boxing'), name: 'Schattenboxen 1-2-Slip', duration: '3:00' },
      SLUG,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.exercise).toMatchObject({
      category: 'combat',
      combatSports: ['boxing'],
      measurement: 'time',
      difficulty: 1,
      loadParams: { sets: [3, 3], durationSec: [180, 180], restSec: [60, 60] },
      primaryMuscles: ['front_delts', 'obliques'],
    })
    expect(result.exercise.giMode).toBeUndefined()
  })

  it('legt einen Drill mit Gewicht und Wiederholungen an (Komma als Dezimaltrenner)', () => {
    const result = drillDraftToExercise(
      {
        ...emptyDrillDraft('bjj'),
        name: 'Kettlebell-Griffhalten',
        sports: ['bjj', 'judo'],
        giMode: 'gi',
        measurement: 'weight_reps',
        sets: '4',
        reps: '8',
        weightKg: '12,5',
        instructions: 'Erster Schritt\n\n Zweiter Schritt ',
      },
      SLUG,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.exercise.loadParams).toEqual({
      sets: [4, 4],
      reps: [8, 8],
      weightKg: [12.5, 12.5],
      restSec: [60, 60],
    })
    expect(result.exercise.giMode).toBe('gi')
    expect(result.exercise.trainingTypes).toEqual(['skill', 'strength'])
    expect(result.exercise.instructions).toEqual(['Erster Schritt', 'Zweiter Schritt'])
  })

  it('meldet fehlende und ungültige Angaben', () => {
    const result = drillDraftToExercise(
      {
        ...emptyDrillDraft('mma'),
        name: 'X',
        sports: [],
        measurement: 'weight_time',
        duration: 'abc',
        weightKg: '',
        sets: '0',
      },
      SLUG,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.errors).sort()).toEqual(
      ['duration', 'name', 'sets', 'sports', 'weightKg'].sort(),
    )
  })

  it('Gi/NoGi nur, wenn BJJ dabei ist', () => {
    const result = drillDraftToExercise(
      { ...emptyDrillDraft('judo'), name: 'Uchikomi-Serie', giMode: 'gi' },
      SLUG,
    )
    expect(result.ok).toBe(true)
    expect(result.ok && result.exercise.giMode).toBeUndefined()
  })

  it('übernimmt einen Bibliotheks-Drill als Kopie', () => {
    const library = getLibraryExercise('boxing-slip-roll-step-out')!
    const exercise: CatalogExercise = {
      ...library,
      id: 'id',
      source: 'library',
      preference: 'neutral',
      isArchived: false,
    }
    const draft = draftFromDrill(exercise, true)
    expect(draft).toMatchObject({
      name: 'Slip – Roll – Step-out (eigener)',
      sports: ['boxing', 'kickboxing', 'mma'],
      level: 2,
      measurement: 'time',
      sets: '3',
      duration: '0:45',
    })
    const result = drillDraftToExercise(draft, SLUG)
    expect(result.ok && result.exercise.primaryMuscles).toEqual(library.primaryMuscles)
  })
})
