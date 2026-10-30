import { describe, expect, it } from 'vitest'
import type { CatalogExercise } from '@/api/exercises'
import { EXERCISE_LIBRARY } from '@/data/exercises'
import {
  draftFromExercise,
  draftToExercise,
  emptyDraft,
  newCustomSlug,
  withMeasurement,
} from './customForm'

const SLUG = newCustomSlug('3F2A9C1E-0000-4000-8000-000000000001')

describe('eigene Übung', () => {
  it('erzeugt einen gültigen Slug, der nicht mit der Bibliothek kollidiert', () => {
    expect(SLUG).toBe('custom-3f2a9c1e-0000-4000-8000-000000000001')
    expect(EXERCISE_LIBRARY.some((e) => e.slug.startsWith('custom-'))).toBe(false)
  })

  it('wird mit Mindestangaben gültig – Beschreibung und Ausführung sind freiwillig', () => {
    const result = draftToExercise(
      { ...emptyDraft(), name: 'Landmine Press kniend', primaryMuscles: ['front_delts'] },
      SLUG,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.exercise.loadParams).toEqual({ sets: [3, 4], reps: [8, 12], restSec: [60, 90] })
      expect(result.exercise.instructions).toEqual([])
    }
  })

  it('meldet fehlende Pflichtangaben und ungültige Bereiche auf Deutsch', () => {
    const result = draftToExercise(
      { ...emptyDraft(), name: 'X', trainingTypes: [], sets: ['4', '2'], rest: ['a', '60'] },
      SLUG,
    )
    expect(result).toEqual({
      ok: false,
      errors: {
        name: 'Name: 2 bis 80 Zeichen',
        trainingTypes: 'Mindestens ein Trainingsziel wählen',
        primaryMuscles: 'Mindestens einen Hauptmuskel wählen',
        sets: 'Der erste Wert darf nicht größer als der zweite sein.',
        rest: 'Bitte zwei ganze Zahlen eingeben.',
      },
    })
  })

  it('setzt beim Wechsel der Messart passende Standardwerte', () => {
    const draft = withMeasurement(emptyDraft(), 'distance_time')
    expect(draft.main).toEqual(['200', '1000'])
    const result = draftToExercise(
      { ...draft, name: 'Bergsprint', primaryMuscles: ['quadriceps'] },
      SLUG,
    )
    expect(result.ok && result.exercise.loadParams.distanceM).toEqual([200, 1000])
    // gleiche Pflichtangabe → Eingabe bleibt erhalten
    expect(withMeasurement({ ...emptyDraft(), main: ['5', '6'] }, 'reps').main).toEqual(['5', '6'])
  })

  it('entfernt Hauptmuskeln aus den Hilfsmuskeln und die Station außerhalb von HYROX', () => {
    const result = draftToExercise(
      {
        ...emptyDraft(),
        name: 'Test',
        primaryMuscles: ['quadriceps'],
        secondaryMuscles: ['quadriceps', 'glutes'],
        hyroxStation: 'wall_balls',
      },
      SLUG,
    )
    expect(result.ok && result.exercise.secondaryMuscles).toEqual(['glutes'])
    expect(result.ok && result.exercise.hyroxStation).toBeUndefined()
  })

  it('übernimmt eine Bibliotheksübung als Kopie mit allen Angaben', () => {
    const library = EXERCISE_LIBRARY.find((e) => e.measurement === 'weight_reps')!
    const catalog: CatalogExercise = {
      ...library,
      id: 'x',
      source: 'library',
      preference: 'neutral',
      isArchived: false,
    }
    const draft = draftFromExercise(catalog, true)
    expect(draft.name).toBe(`${library.name} (eigene)`)
    const result = draftToExercise(draft, SLUG)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.exercise.primaryMuscles).toEqual(library.primaryMuscles)
      expect(result.exercise.loadParams.reps).toEqual(library.loadParams.reps)
      expect(result.exercise.instructions).toEqual(library.instructions)
    }
  })
})
