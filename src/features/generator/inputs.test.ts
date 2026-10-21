import { describe, expect, it } from 'vitest'
import type { ProfileDetails } from '@/api/profile'
import { generateWorkout } from '@/domain/generator/generateWorkout'
import { makeInput } from '@/domain/generator/testFixtures'
import { restoreStoredWorkout, toGeneratorProfile, toGoalWeights } from './inputs'

const empty: ProfileDetails = {
  profile: null,
  goals: null,
  latestWeight: null,
  latestBodyFat: null,
  records: [],
  preferredExercises: [],
  dislikedExercises: [],
}

describe('toGeneratorProfile', () => {
  it('übernimmt Niveau, Geräte und Einschränkungen und verwirft Unbekanntes', () => {
    const details: ProfileDetails = {
      ...empty,
      profile: {
        training_level: 'advanced',
        available_equipment: ['sled', 'barbell', 'zauberstab'],
        limitation_regions: ['knee', 'nase'],
      } as ProfileDetails['profile'],
    }
    expect(toGeneratorProfile(details)).toEqual({
      trainingLevel: 'advanced',
      availableEquipment: ['barbell', 'sled'],
      limitationRegions: ['knee'],
    })
  })

  it('nimmt ohne Profil „Fortgeschritten" und alle Geräte an', () => {
    const profile = toGeneratorProfile(empty)
    expect(profile.trainingLevel).toBe('intermediate')
    expect(profile.availableEquipment.length).toBeGreaterThan(30)
  })
})

describe('toGoalWeights', () => {
  it('liefert ohne gespeicherte Ziele die Gleichgewichtung', () => {
    expect(toGoalWeights(empty)).toEqual({
      hypertrophy: 25,
      strength: 25,
      endurance: 25,
      hyrox: 25,
    })
  })
})

describe('restoreStoredWorkout', () => {
  it('stellt ein gültiges Workout wieder her', () => {
    const input = makeInput({ focus: 'hyrox' })
    const stored = { request: input.request, workout: generateWorkout(input) }
    expect(restoreStoredWorkout(JSON.parse(JSON.stringify(stored)))).toEqual(stored)
  })

  it('verwirft beschädigte oder veraltete Daten', () => {
    expect(restoreStoredWorkout(null)).toBeNull()
    expect(restoreStoredWorkout({ request: {}, workout: {} })).toBeNull()
    const input = makeInput()
    expect(
      restoreStoredWorkout({
        request: { ...input.request, focus: 'yoga' },
        workout: generateWorkout(input),
      }),
    ).toBeNull()
  })
})
