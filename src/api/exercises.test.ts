import { describe, expect, it } from 'vitest'
import { getLibraryExercise } from '@/data/exercises'
import { toLibraryRow } from './exerciseLibrary'
import { fromExerciseRow, type ExerciseRow } from './exercises'

function rowFor(slug: string, overrides: Partial<ExerciseRow> = {}): ExerciseRow {
  const exercise = getLibraryExercise(slug)
  if (!exercise) throw new Error(`Testübung ${slug} fehlt`)
  return {
    ...toLibraryRow(exercise),
    id: '00000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000002',
    source: 'library',
    preference: 'neutral',
    is_archived: false,
    library_version: 2,
    created_at: '2026-10-20T00:00:00Z',
    updated_at: '2026-10-20T00:00:00Z',
    ...overrides,
  }
}

describe('fromExerciseRow', () => {
  it('liest eine Datenbankzeile verlustfrei zurück', () => {
    const original = getLibraryExercise('hyrox-sled-push')
    const result = fromExerciseRow(rowFor('hyrox-sled-push', { preference: 'preferred' }))
    expect(result).toMatchObject({ ...original, source: 'library', preference: 'preferred' })
  })

  it('wandelt hyrox_station = null in „keine Station" um', () => {
    expect(fromExerciseRow(rowFor('back-squat'))?.hyroxStation).toBeUndefined()
  })

  it('verwirft Zeilen mit unbekannten Werten', () => {
    expect(fromExerciseRow(rowFor('back-squat', { category: 'unbekannt' }))).toBeNull()
    expect(fromExerciseRow(rowFor('back-squat', { source: 'fremd' }))).toBeNull()
  })

  it('setzt eine unbekannte Präferenz auf „neutral"', () => {
    expect(fromExerciseRow(rowFor('back-squat', { preference: 'egal' }))?.preference).toBe(
      'neutral',
    )
  })
})
