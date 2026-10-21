import type { ProfileDetails } from '@/api/profile'
import { EQUIPMENT, STRESS_REGIONS } from '@/data/exercises/vocabulary'
import {
  EXPERIENCE_DURATIONS,
  HYROX_EXPERIENCES,
  SEXES,
  TRAINING_LEVELS,
  WEEKDAYS,
} from '@/domain/profile/vocabulary'
import { contextKey, MANUAL_RECORD_PRESETS } from '@/domain/records/presets'
import { formatDurationClock } from '@/lib/time'
import { createEmptyDraft, type ProfileDraft } from './draft'

/** 84.5 → „84,5" (so wie man es am Handy eintippt). */
export function formatDecimalInput(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value).replace('.', ',')
}

function oneOf<T extends string | number>(values: readonly T[], value: unknown): T | '' {
  return (values as readonly unknown[]).includes(value) ? (value as T) : ''
}

/**
 * Baut aus den gespeicherten Daten den Entwurf für die Profilseite.
 * Gewicht und Körperfett bleiben leer: Eine Eingabe dort legt einen NEUEN Messwert an.
 * Unbekannte Werte (z. B. ein entferntes Gerät) werden verworfen.
 */
export function profileDetailsToDraft(details: ProfileDetails): ProfileDraft {
  const draft = createEmptyDraft()
  const { profile, goals } = details

  if (profile) {
    draft.displayName = profile.display_name ?? ''
    draft.birthDate = profile.birth_date ?? ''
    draft.heightCm = formatDecimalInput(profile.height_cm)
    draft.sex = oneOf(SEXES, profile.sex)
    draft.trainingLevel = oneOf(TRAINING_LEVELS, profile.training_level)
    draft.hyroxExperience = oneOf(HYROX_EXPERIENCES, profile.hyrox_experience)
    draft.strengthExperience = oneOf(EXPERIENCE_DURATIONS, profile.strength_experience)
    draft.enduranceExperience = oneOf(EXPERIENCE_DURATIONS, profile.endurance_experience)
    draft.fitnessNotes = profile.fitness_notes ?? ''
    draft.hyroxBestTime =
      profile.hyrox_best_time_sec === null ? '' : formatDurationClock(profile.hyrox_best_time_sec)
    draft.trainingDaysPerWeek = profile.training_days_per_week ?? draft.trainingDaysPerWeek
    draft.preferredWeekdays = WEEKDAYS.filter((day) => profile.preferred_weekdays.includes(day))
    draft.defaultDurationMin = profile.default_duration_min
    draft.availableEquipment = EQUIPMENT.filter((e) => profile.available_equipment.includes(e))
    draft.limitationRegions = STRESS_REGIONS.filter((r) => profile.limitation_regions.includes(r))
    draft.limitationNotes = profile.limitation_notes ?? ''
  }

  if (goals) {
    draft.goals = {
      hypertrophy: goals.weight_hypertrophy,
      strength: goals.weight_strength,
      endurance: goals.weight_endurance,
      hyrox: goals.weight_hyrox,
    }
  }

  for (const preset of MANUAL_RECORD_PRESETS) {
    const stored = details.records.find(
      (r) =>
        r.source === 'manual' &&
        r.exerciseSlug === preset.exerciseSlug &&
        r.recordType === preset.recordType &&
        r.contextKey === contextKey(preset.context),
    )
    if (stored) {
      draft.records[preset.key] =
        preset.unit === 'sec' ? formatDurationClock(stored.value) : formatDecimalInput(stored.value)
    }
  }

  draft.preferredExercises = [...details.preferredExercises].sort()
  draft.dislikedExercises = [...details.dislikedExercises].sort()
  return draft
}
