import { EQUIPMENT, type Equipment } from '@/data/exercises/vocabulary'
import type { ProfileFormInput } from './schema'

/**
 * Startwerte für das Onboarding laut Spezifikation:
 * vier Ziele gleich gewichtet, 60 Minuten, Fitnessstudio mit vollständigem HYROX-Equipment
 * (alle Geräte ausgewählt). Fehlende Geräte werden im Onboarding abgewählt.
 */
export const DEFAULT_PROFILE_VALUES = {
  displayName: '',
  birthDate: '',
  goals: { hypertrophy: 25, strength: 25, endurance: 25, hyrox: 25 },
  trainingDaysPerWeek: 4,
  preferredWeekdays: [],
  defaultDurationMin: 60,
  availableEquipment: [...EQUIPMENT] as Equipment[],
  limitationRegions: [],
  preferredExercises: [],
  dislikedExercises: [],
  records: {},
} satisfies Partial<ProfileFormInput>
