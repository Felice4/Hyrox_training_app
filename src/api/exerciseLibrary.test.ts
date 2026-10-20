import { describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY, getLibraryExercise } from '@/data/exercises'
import { toLibraryRow } from './exerciseLibrary'

describe('toLibraryRow', () => {
  it('überträgt alle Felder in snake_case', () => {
    const sledPush = getLibraryExercise('hyrox-sled-push')
    if (!sledPush) throw new Error('Testübung fehlt')
    const row = toLibraryRow(sledPush)

    expect(row).toMatchObject({
      slug: 'hyrox-sled-push',
      name: 'Sled Push',
      category: 'hyrox',
      movement_pattern: 'full_body',
      measurement: 'weight_distance',
      hyrox_station: 'sled_push',
      equipment: ['sled'],
    })
    expect(row.training_types).toEqual(sledPush.trainingTypes)
    expect(row.alternative_slugs).toEqual(sledPush.alternatives)
  })

  it('setzt hyrox_station auf null, wenn keine Station zugeordnet ist', () => {
    const squat = getLibraryExercise('back-squat')
    if (!squat) throw new Error('Testübung fehlt')
    expect(toLibraryRow(squat).hyrox_station).toBeNull()
  })

  it('übernimmt nur gesetzte Belastungsfelder', () => {
    const squat = getLibraryExercise('back-squat')
    if (!squat) throw new Error('Testübung fehlt')
    const { load_params } = toLibraryRow(squat)
    expect(Object.keys(load_params).sort()).toEqual(['reps', 'restSec', 'sets'])
  })

  it('erzeugt JSON-taugliche Zeilen für die ganze Bibliothek', () => {
    const rows = EXERCISE_LIBRARY.map(toLibraryRow)
    const roundTrip = JSON.parse(JSON.stringify(rows)) as unknown
    expect(roundTrip).toEqual(rows)
  })

  it('verändert die Bibliothek nicht (Kopien statt Referenzen)', () => {
    const squat = getLibraryExercise('back-squat')
    if (!squat) throw new Error('Testübung fehlt')
    const row = toLibraryRow(squat)
    row.equipment.push('dumbbell')
    expect(squat.equipment).not.toContain('dumbbell')
  })
})
