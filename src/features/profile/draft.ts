import type { Equipment, StressRegion } from '@/data/exercises/vocabulary'
import { DEFAULT_PROFILE_VALUES } from '@/domain/profile/defaults'
import {
  createProfileSchema,
  type ProfileFormInput,
  type ProfileFormValues,
} from '@/domain/profile/schema'
import type {
  ExperienceDuration,
  HyroxExperience,
  Sex,
  TrainingLevel,
  Weekday,
} from '@/domain/profile/vocabulary'
import { MANUAL_RECORD_PRESETS, type ManualRecordKey } from '@/domain/records/presets'
import { parseDuration } from '@/lib/time'

/**
 * Entwurf des Profilformulars, so wie er in den Eingabefeldern steht.
 * Zahlen und Zeiten bleiben Text, bis geprüft wird (z. B. „84,5" oder „4:05").
 */
export interface ProfileDraft {
  displayName: string
  birthDate: string
  heightCm: string
  weightKg: string
  bodyFatPct: string
  sex: Sex | ''
  trainingLevel: TrainingLevel | ''
  hyroxExperience: HyroxExperience | ''
  strengthExperience: ExperienceDuration | ''
  enduranceExperience: ExperienceDuration | ''
  fitnessNotes: string
  hyroxBestTime: string
  records: Partial<Record<ManualRecordKey, string>>
  goals: { hypertrophy: number; strength: number; endurance: number; hyrox: number }
  trainingDaysPerWeek: number
  preferredWeekdays: Weekday[]
  defaultDurationMin: number
  availableEquipment: Equipment[]
  limitationRegions: StressRegion[]
  limitationNotes: string
  preferredExercises: string[]
  dislikedExercises: string[]
}

export function createEmptyDraft(): ProfileDraft {
  return {
    displayName: '',
    birthDate: '',
    heightCm: '',
    weightKg: '',
    bodyFatPct: '',
    sex: '',
    trainingLevel: '',
    hyroxExperience: '',
    strengthExperience: '',
    enduranceExperience: '',
    fitnessNotes: '',
    hyroxBestTime: '',
    records: {},
    goals: { ...DEFAULT_PROFILE_VALUES.goals },
    trainingDaysPerWeek: DEFAULT_PROFILE_VALUES.trainingDaysPerWeek,
    preferredWeekdays: [],
    defaultDurationMin: DEFAULT_PROFILE_VALUES.defaultDurationMin,
    availableEquipment: [...DEFAULT_PROFILE_VALUES.availableEquipment],
    limitationRegions: [],
    limitationNotes: '',
    preferredExercises: [],
    dislikedExercises: [],
  }
}

/**
 * Übernimmt einen gespeicherten Entwurf (z. B. aus localStorage) nur feldweise, wenn der Typ
 * passt. So kann ein veralteter oder beschädigter Entwurf die App nicht durcheinanderbringen.
 */
export function restoreDraft(stored: unknown): ProfileDraft {
  const draft = createEmptyDraft()
  if (typeof stored !== 'object' || stored === null) return draft
  const source = stored as Record<string, unknown>
  for (const key of Object.keys(draft) as (keyof ProfileDraft)[]) {
    const value = source[key]
    const expected = draft[key]
    let sameShape = Array.isArray(expected)
      ? Array.isArray(value)
      : typeof value === typeof expected && value !== null && !Array.isArray(value)
    if (sameShape && key === 'goals') {
      const goals = value as Record<string, unknown>
      sameShape = Object.keys(draft.goals).every((goal) => typeof goals[goal] === 'number')
    }
    if (sameShape) (draft as unknown as Record<string, unknown>)[key] = value
  }
  return draft
}

/** Fehlermeldungen je Feld; Schlüssel wie im Entwurf (z. B. „records.run_5k"). */
export type DraftErrors = Record<string, string>

/** „84,5" → 84.5; leer → undefined; ungültig → NaN. */
export function parseDecimal(text: string): number | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return undefined
  if (!/^\d+([.,]\d+)?$/.test(trimmed)) return Number.NaN
  return Number(trimmed.replace(',', '.'))
}

const INVALID_NUMBER = 'Bitte eine Zahl eingeben (z. B. 84,5).'
const INVALID_TIME = 'Bitte als Zeit eingeben, z. B. 4:05 oder 1:12:30.'

interface Conversion {
  input: ProfileFormInput
  errors: DraftErrors
}

/** Wandelt den Entwurf in Formularwerte um und sammelt Formatfehler (Zahl/Zeit). */
export function draftToInput(draft: ProfileDraft): Conversion {
  const errors: DraftErrors = {}

  const decimal = (field: string, text: string): number | undefined => {
    const value = parseDecimal(text)
    if (value !== undefined && Number.isNaN(value)) {
      errors[field] = INVALID_NUMBER
      return undefined
    }
    return value
  }

  const time = (field: string, text: string): number | undefined => {
    if (text.trim() === '') return undefined
    const seconds = parseDuration(text)
    if (seconds === null) {
      errors[field] = INVALID_TIME
      return undefined
    }
    return seconds
  }

  const records: ProfileFormInput['records'] = {}
  for (const preset of MANUAL_RECORD_PRESETS) {
    const text = draft.records[preset.key] ?? ''
    const field = `records.${preset.key}`
    const value = preset.unit === 'sec' ? time(field, text) : decimal(field, text)
    if (value !== undefined) records[preset.key] = value
  }

  const input: ProfileFormInput = {
    displayName: draft.displayName,
    birthDate: draft.birthDate,
    heightCm: decimal('heightCm', draft.heightCm) as number,
    weightKg: decimal('weightKg', draft.weightKg),
    bodyFatPct: decimal('bodyFatPct', draft.bodyFatPct),
    sex: draft.sex === '' ? undefined : draft.sex,
    trainingLevel: (draft.trainingLevel || undefined) as TrainingLevel,
    hyroxExperience: (draft.hyroxExperience || undefined) as HyroxExperience,
    strengthExperience: (draft.strengthExperience || undefined) as ExperienceDuration,
    enduranceExperience: (draft.enduranceExperience || undefined) as ExperienceDuration,
    fitnessNotes: draft.fitnessNotes,
    hyroxBestTimeSec: time('hyroxBestTime', draft.hyroxBestTime),
    records,
    goals: { ...draft.goals },
    trainingDaysPerWeek: draft.trainingDaysPerWeek,
    preferredWeekdays: [...draft.preferredWeekdays],
    defaultDurationMin: draft.defaultDurationMin,
    availableEquipment: [...draft.availableEquipment],
    limitationRegions: [...draft.limitationRegions],
    limitationNotes: draft.limitationNotes,
    preferredExercises: [...draft.preferredExercises],
    dislikedExercises: [...draft.dislikedExercises],
  }
  return { input, errors }
}

/** Schema-Pfade, die im Entwurf anders heißen. */
const SCHEMA_TO_DRAFT_FIELD: Record<string, string> = { hyroxBestTimeSec: 'hyroxBestTime' }

export type ValidationResult =
  { ok: true; values: ProfileFormValues } | { ok: false; errors: DraftErrors }

/**
 * Prüft den ganzen Entwurf. `requireWeight`: im Onboarding ist das Körpergewicht Pflicht,
 * auf der Profilseite optional (dort wird nur bei Eingabe ein neuer Messwert gespeichert).
 */
export function validateDraft(
  draft: ProfileDraft,
  today: string,
  options: { requireWeight: boolean },
): ValidationResult {
  const { input, errors } = draftToInput(draft)
  const result = createProfileSchema(today).safeParse(input)

  if (!result.success) {
    for (const issue of result.error.issues) {
      const [first, ...rest] = issue.path.map(String)
      if (first === undefined) continue
      const field = [SCHEMA_TO_DRAFT_FIELD[first] ?? first, ...rest].join('.')
      // Formatfehler (z. B. „abc" statt Zahl) sind aussagekräftiger – nicht überschreiben
      errors[field] ??= issue.message
    }
  }
  if (options.requireWeight && draft.weightKg.trim() === '' && !errors.weightKg) {
    errors.weightKg = 'Bitte das Körpergewicht eingeben.'
  }

  if (Object.keys(errors).length > 0 || !result.success) return { ok: false, errors }
  return { ok: true, values: result.data }
}

/** Nur die Fehler der angegebenen Felder (auch verschachtelte wie „records.run_5k"). */
export function errorsForFields(errors: DraftErrors, fields: readonly string[]): DraftErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) =>
      fields.some((field) => key === field || key.startsWith(`${field}.`)),
    ),
  )
}
