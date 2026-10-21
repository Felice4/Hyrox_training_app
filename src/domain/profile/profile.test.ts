import { describe, expect, it } from 'vitest'
import { getLibraryExercise } from '@/data/exercises'
import { contextKey, MANUAL_RECORD_PRESETS } from '@/domain/records/presets'
import { DEFAULT_PROFILE_VALUES } from './defaults'
import { toSaveProfilePayload } from './payload'
import { ageOn, createProfileSchema, type ProfileFormInput } from './schema'

const TODAY = '2026-10-21'
const schema = createProfileSchema(TODAY)

const valid: ProfileFormInput = {
  ...DEFAULT_PROFILE_VALUES,
  displayName: ' Felix ',
  birthDate: '1996-05-10',
  heightCm: 182,
  weightKg: 84.5,
  trainingLevel: 'intermediate',
  hyroxExperience: 'competed',
  strengthExperience: '1_3y',
  enduranceExperience: 'over_3y',
  fitnessNotes: '   ',
  preferredWeekdays: [4, 1, 6],
  preferredExercises: ['hyrox-sled-push'],
  dislikedExercises: ['burpee'],
  records: { deadlift_1rm: 160, run_5k: 1290 },
}

function issuesFor(input: ProfileFormInput): string[] {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
}

describe('ageOn', () => {
  it('berücksichtigt, ob der Geburtstag schon war', () => {
    expect(ageOn('1996-10-21', TODAY)).toBe(30)
    expect(ageOn('1996-10-22', TODAY)).toBe(29)
  })
})

describe('Profil-Schema', () => {
  it('akzeptiert gültige Angaben und bereinigt Texte', () => {
    const parsed = schema.parse(valid)
    expect(parsed.displayName).toBe('Felix')
    expect(parsed.fitnessNotes).toBeUndefined()
  })

  it('verlangt Pflichtangaben', () => {
    const { trainingLevel: _ignored, ...withoutLevel } = valid
    expect(issuesFor(withoutLevel as ProfileFormInput)).toContain('trainingLevel')
    expect(issuesFor({ ...valid, displayName: '  ' })).toContain('displayName')
  })

  it('prüft das Alter', () => {
    expect(issuesFor({ ...valid, birthDate: '2020-01-01' })).toContain('birthDate')
    expect(issuesFor({ ...valid, birthDate: '1900-01-01' })).toContain('birthDate')
    expect(issuesFor({ ...valid, birthDate: '2027-01-01' })).toContain('birthDate')
    expect(issuesFor({ ...valid, birthDate: '31.12.1990' })).toContain('birthDate')
  })

  it('prüft Wertebereiche', () => {
    expect(issuesFor({ ...valid, heightCm: 90 })).toContain('heightCm')
    expect(issuesFor({ ...valid, weightKg: 300 })).toContain('weightKg')
    expect(issuesFor({ ...valid, defaultDurationMin: 10 })).toContain('defaultDurationMin')
    expect(issuesFor({ ...valid, trainingDaysPerWeek: 0 })).toContain('trainingDaysPerWeek')
  })

  it('verlangt mindestens ein gewichtetes Ziel', () => {
    const goals = { hypertrophy: 0, strength: 0, endurance: 0, hyrox: 0 }
    expect(issuesFor({ ...valid, goals })).toContain('goals')
  })

  it('lehnt doppelte Wochentage ab', () => {
    expect(issuesFor({ ...valid, preferredWeekdays: [1, 1] })).toContain('preferredWeekdays')
  })

  it('lehnt eine Übung ab, die bevorzugt und unbeliebt zugleich ist', () => {
    const input = { ...valid, dislikedExercises: ['hyrox-sled-push'] }
    expect(issuesFor(input)).toContain('dislikedExercises')
  })

  it('lehnt unbekannte Bestleistungen und Werte ≤ 0 ab', () => {
    expect(issuesFor({ ...valid, records: { deadlift_1rm: 0 } })).toContain('records.deadlift_1rm')
    expect(
      issuesFor({ ...valid, records: { erfunden: 5 } as ProfileFormInput['records'] }).length,
    ).toBeGreaterThan(0)
  })
})

describe('Standardwerte', () => {
  it('gewichten alle Ziele gleich und wählen 60 Minuten', () => {
    expect(DEFAULT_PROFILE_VALUES.goals).toEqual({
      hypertrophy: 25,
      strength: 25,
      endurance: 25,
      hyrox: 25,
    })
    expect(DEFAULT_PROFILE_VALUES.defaultDurationMin).toBe(60)
  })
})

describe('toSaveProfilePayload', () => {
  const payload = toSaveProfilePayload(schema.parse(valid), TODAY)

  it('überträgt das Profil in snake_case mit sortierten Listen', () => {
    expect(payload.profile).toMatchObject({
      display_name: 'Felix',
      birth_date: '1996-05-10',
      height_cm: 182,
      sex: null,
      fitness_notes: null,
      preferred_weekdays: [1, 4, 6],
    })
    expect(payload.goals.weight_hyrox).toBe(25)
  })

  it('legt einen Körperwert für heute an – nur wenn ein Wert vorliegt', () => {
    expect(payload.measurement).toEqual({
      measured_on: TODAY,
      weight_kg: 84.5,
      body_fat_pct: null,
    })
    const withoutWeight = toSaveProfilePayload(
      schema.parse({ ...valid, weightKg: undefined }),
      TODAY,
    )
    expect(withoutWeight.measurement).toBeNull()
  })

  it('sendet alle Bestleistungs-Vorlagen, leere als null', () => {
    expect(payload.records).toHaveLength(MANUAL_RECORD_PRESETS.length)
    expect(payload.records.find((r) => r.exercise_slug === 'deadlift')).toMatchObject({
      record_type: 'max_weight',
      context_key: 'reps=1',
      unit: 'kg',
      value: 160,
    })
    expect(payload.records.find((r) => r.exercise_slug === 'bench-press')?.value).toBeNull()
  })

  it('überträgt Präferenzen', () => {
    expect(payload.preferences).toEqual({ preferred: ['hyrox-sled-push'], disliked: ['burpee'] })
  })
})

describe('Bestleistungs-Vorlagen', () => {
  it('verweisen auf existierende Bibliotheksübungen', () => {
    const missing = MANUAL_RECORD_PRESETS.filter((p) => !getLibraryExercise(p.exerciseSlug))
    expect(missing).toEqual([])
  })

  it('haben eindeutige Schlüssel und Bedingungen je Übung', () => {
    const keys = MANUAL_RECORD_PRESETS.map((p) => p.key)
    expect(new Set(keys).size).toBe(keys.length)
    const combos = MANUAL_RECORD_PRESETS.map(
      (p) => `${p.exerciseSlug}|${p.recordType}|${contextKey(p.context)}`,
    )
    expect(new Set(combos).size).toBe(combos.length)
  })

  it('normalisieren Bedingungen unabhängig von der Reihenfolge', () => {
    expect(contextKey({ reps: 5, distance_m: 100 })).toBe('distance_m=100;reps=5')
    expect(contextKey({})).toBe('')
  })
})
