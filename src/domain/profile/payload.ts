import { contextKey, MANUAL_RECORD_PRESETS } from '@/domain/records/presets'
import type { ProfileFormValues } from './schema'

/** Nutzlast für die Datenbankfunktion save_profile (snake_case, siehe Migration 0003). */
export interface SaveProfilePayload {
  profile: {
    display_name: string
    birth_date: string
    height_cm: number
    sex: string | null
    training_level: string
    hyrox_experience: string
    strength_experience: string
    endurance_experience: string
    fitness_notes: string | null
    hyrox_best_time_sec: number | null
    training_days_per_week: number
    preferred_weekdays: number[]
    default_duration_min: number
    available_equipment: string[]
    limitation_regions: string[]
    limitation_notes: string | null
  }
  goals: {
    weight_hypertrophy: number
    weight_strength: number
    weight_endurance: number
    weight_hyrox: number
  }
  measurement: { measured_on: string; weight_kg: number | null; body_fat_pct: number | null } | null
  preferences: { preferred: string[]; disliked: string[] }
  records: {
    exercise_slug: string
    record_type: string
    context: Record<string, number>
    context_key: string
    unit: string
    /** null = manuellen Eintrag entfernen */
    value: number | null
  }[]
}

/**
 * Wandelt geprüfte Formularwerte in die Nutzlast für save_profile um.
 * `today` („JJJJ-MM-TT", lokales Datum) ist der Tag des Körperwert-Eintrags.
 */
export function toSaveProfilePayload(values: ProfileFormValues, today: string): SaveProfilePayload {
  const hasMeasurement = values.weightKg !== undefined || values.bodyFatPct !== undefined

  return {
    profile: {
      display_name: values.displayName,
      birth_date: values.birthDate,
      height_cm: values.heightCm,
      sex: values.sex ?? null,
      training_level: values.trainingLevel,
      hyrox_experience: values.hyroxExperience,
      strength_experience: values.strengthExperience,
      endurance_experience: values.enduranceExperience,
      fitness_notes: values.fitnessNotes ?? null,
      hyrox_best_time_sec: values.hyroxBestTimeSec ?? null,
      training_days_per_week: values.trainingDaysPerWeek,
      preferred_weekdays: [...values.preferredWeekdays].sort((a, b) => a - b),
      default_duration_min: values.defaultDurationMin,
      available_equipment: [...values.availableEquipment].sort(),
      limitation_regions: [...values.limitationRegions].sort(),
      limitation_notes: values.limitationNotes ?? null,
    },
    goals: {
      weight_hypertrophy: values.goals.hypertrophy,
      weight_strength: values.goals.strength,
      weight_endurance: values.goals.endurance,
      weight_hyrox: values.goals.hyrox,
    },
    measurement: hasMeasurement
      ? {
          measured_on: today,
          weight_kg: values.weightKg ?? null,
          body_fat_pct: values.bodyFatPct ?? null,
        }
      : null,
    preferences: {
      preferred: [...new Set(values.preferredExercises)].sort(),
      disliked: [...new Set(values.dislikedExercises)].sort(),
    },
    // Alle Vorlagen mitsenden: leere Felder entfernen einen früheren manuellen Eintrag
    records: MANUAL_RECORD_PRESETS.map((preset) => ({
      exercise_slug: preset.exerciseSlug,
      record_type: preset.recordType,
      context: { ...preset.context },
      context_key: contextKey(preset.context),
      unit: preset.unit,
      value: values.records[preset.key] ?? null,
    })),
  }
}
