import { describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY, getLibraryExercise, LIBRARY_VERSION, RAW_EXERCISES } from './index'
import { exerciseDefinitionSchema } from './schema'
import { CATEGORIES, HYROX_STATIONS } from './vocabulary'

describe('Übungsbibliothek', () => {
  it('jede Übung erfüllt das Schema', () => {
    const problems = RAW_EXERCISES.flatMap((exercise) => {
      const result = exerciseDefinitionSchema.safeParse(exercise)
      return result.success
        ? []
        : result.error.issues.map(
            (issue) => `${exercise.slug}: ${issue.path.join('.')} – ${issue.message}`,
          )
    })
    expect(problems).toEqual([])
  })

  it('Slugs sind eindeutig', () => {
    const seen = new Set<string>()
    const duplicates = EXERCISE_LIBRARY.map((e) => e.slug).filter((slug) => {
      const duplicate = seen.has(slug)
      seen.add(slug)
      return duplicate
    })
    expect(duplicates).toEqual([])
  })

  it('Namen sind eindeutig', () => {
    const names = EXERCISE_LIBRARY.map((e) => e.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })

  it('Alternativen verweisen auf existierende Übungen', () => {
    const missing = EXERCISE_LIBRARY.flatMap((exercise) =>
      exercise.alternatives
        .filter((slug) => !getLibraryExercise(slug))
        .map((slug) => `${exercise.slug} → ${slug}`),
    )
    expect(missing).toEqual([])
  })

  it('jede HYROX-Station ist mit mindestens einer Übung vertreten', () => {
    const covered = new Set(EXERCISE_LIBRARY.map((e) => e.hyroxStation).filter(Boolean))
    const uncovered = HYROX_STATIONS.filter((station) => !covered.has(station))
    expect(uncovered).toEqual([])
  })

  it('Bibliotheksversion ist eine positive ganze Zahl', () => {
    expect(Number.isInteger(LIBRARY_VERSION) && LIBRARY_VERSION > 0).toBe(true)
  })

  it('getLibraryExercise findet Übungen über den Slug', () => {
    expect(getLibraryExercise('hyrox-sled-push')?.name).toBe('Sled Push')
    expect(getLibraryExercise('gibt-es-nicht')).toBeUndefined()
  })

  it('enthält mindestens 200 Übungen', () => {
    expect(EXERCISE_LIBRARY.length).toBeGreaterThanOrEqual(200)
  })

  it('jede Kategorie ist vertreten', () => {
    const categories = new Set(EXERCISE_LIBRARY.map((e) => e.category))
    expect([...categories].sort()).toEqual([...CATEGORIES].sort())
  })
})

describe('Schema-Regeln', () => {
  const valid = {
    slug: 'test-exercise',
    name: 'Testübung',
    description: 'Eine Übung nur für Tests.',
    category: 'strength',
    trainingTypes: ['strength'],
    movementPattern: 'squat',
    primaryMuscles: ['quadriceps'],
    difficulty: 1,
    measurement: 'weight_reps',
    loadParams: { sets: [3, 5], reps: [5, 8], restSec: [90, 120] },
    instructions: ['Schritt eins.', 'Schritt zwei.'],
  } as const

  it('akzeptiert eine gültige Übung und ergänzt Standardwerte', () => {
    const parsed = exerciseDefinitionSchema.parse(valid)
    expect(parsed.equipment).toEqual([])
    expect(parsed.alternatives).toEqual([])
  })

  it('verlangt passende Belastungsparameter zur Messart', () => {
    const result = exerciseDefinitionSchema.safeParse({
      ...valid,
      measurement: 'distance_time',
    })
    expect(result.success).toBe(false)
  })

  it('lehnt Muskeln ab, die primär und sekundär zugleich sind', () => {
    const result = exerciseDefinitionSchema.safeParse({
      ...valid,
      secondaryMuscles: ['quadriceps'],
    })
    expect(result.success).toBe(false)
  })

  it('lehnt umgekehrte Bereiche ab', () => {
    const result = exerciseDefinitionSchema.safeParse({
      ...valid,
      loadParams: { sets: [5, 3], reps: [5, 8], restSec: [90, 120] },
    })
    expect(result.success).toBe(false)
  })

  it('lehnt unbekannte Felder (Tippfehler) ab', () => {
    const result = exerciseDefinitionSchema.safeParse({ ...valid, equipmnet: ['barbell'] })
    expect(result.success).toBe(false)
  })

  it('erlaubt hyroxStation nur in der Kategorie HYROX', () => {
    const result = exerciseDefinitionSchema.safeParse({ ...valid, hyroxStation: 'run' })
    expect(result.success).toBe(false)
  })
})
