import { describe, expect, it } from 'vitest'
import type { ProfileDetails } from '@/api/profile'
import { toSaveProfilePayload } from '@/domain/profile/payload'
import { createEmptyDraft, validateDraft } from './draft'
import { formatDecimalInput, profileDetailsToDraft, sessionRecordHints } from './fromDetails'

const TODAY = '2026-10-21'

const details: ProfileDetails = {
  profile: {
    user_id: 'u1',
    display_name: 'Felix',
    birth_date: '1996-05-10',
    height_cm: 182.5,
    sex: null,
    training_level: 'intermediate',
    hyrox_experience: 'competed',
    strength_experience: '1_3y',
    endurance_experience: 'over_3y',
    fitness_notes: null,
    hyrox_best_time_sec: 5380,
    training_days_per_week: 5,
    preferred_weekdays: [6, 1, 3],
    default_duration_min: 75,
    available_equipment: ['sled', 'barbell', 'nicht_mehr_vorhanden'],
    limitation_regions: ['knee'],
    limitation_notes: 'Knie links',
    onboarding_completed_at: '2026-10-21T10:00:00Z',
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  },
  goals: {
    user_id: 'u1',
    weight_hypertrophy: 20,
    weight_strength: 30,
    weight_endurance: 20,
    weight_hyrox: 30,
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  },
  latestWeight: { value: 84.5, measuredOn: '2026-10-21' },
  latestBodyFat: null,
  records: [
    {
      exerciseSlug: 'deadlift',
      recordType: 'max_weight',
      contextKey: 'reps=1',
      value: 160,
      source: 'manual',
      achievedAt: '2026-10-21T10:00:00Z',
    },
    {
      exerciseSlug: 'run-5k-time-trial',
      recordType: 'best_time',
      contextKey: 'distance_m=5000',
      value: 1290,
      source: 'manual',
      achievedAt: '2026-10-21T10:00:00Z',
    },
    {
      exerciseSlug: 'bench-press',
      recordType: 'max_weight',
      contextKey: 'reps=1',
      value: 110,
      source: 'session',
      achievedAt: '2026-10-17T18:00:00Z',
    },
  ],
  preferredExercises: ['hyrox-sled-push'],
  dislikedExercises: ['burpee'],
}

describe('formatDecimalInput', () => {
  it('verwendet ein Komma und lässt leere Werte leer', () => {
    expect(formatDecimalInput(84.5)).toBe('84,5')
    expect(formatDecimalInput(182)).toBe('182')
    expect(formatDecimalInput(null)).toBe('')
  })
})

describe('profileDetailsToDraft', () => {
  const draft = profileDetailsToDraft(details)

  it('übernimmt Profil und Ziele', () => {
    expect(draft).toMatchObject({
      displayName: 'Felix',
      heightCm: '182,5',
      sex: '',
      trainingDaysPerWeek: 5,
      defaultDurationMin: 75,
      hyroxBestTime: '1:29:40',
      limitationNotes: 'Knie links',
      goals: { hypertrophy: 20, strength: 30, endurance: 20, hyrox: 30 },
    })
  })

  it('sortiert Wochentage und verwirft unbekannte Geräte', () => {
    expect(draft.preferredWeekdays).toEqual([1, 3, 6])
    expect(draft.availableEquipment).toEqual(['barbell', 'sled'])
  })

  it('lässt Gewicht und Körperfett leer (Eingabe = neuer Messwert)', () => {
    expect(draft.weightKg).toBe('')
    expect(draft.bodyFatPct).toBe('')
  })

  it('übernimmt nur manuell eingetragene Bestleistungen', () => {
    expect(draft.records).toEqual({ deadlift_1rm: '160', run_5k: '21:30' })
  })

  it('übernimmt Präferenzen', () => {
    expect(draft.preferredExercises).toEqual(['hyrox-sled-push'])
    expect(draft.dislikedExercises).toEqual(['burpee'])
  })

  it('ergibt ohne Änderungen wieder dieselben gespeicherten Werte', () => {
    const result = validateDraft(draft, TODAY, { requireWeight: false })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const payload = toSaveProfilePayload(result.values, TODAY)
    expect(payload.measurement).toBeNull()
    expect(payload.profile.height_cm).toBe(182.5)
    expect(payload.profile.hyrox_best_time_sec).toBe(5380)
    expect(payload.records.find((r) => r.exercise_slug === 'run-5k-time-trial')?.value).toBe(1290)
  })

  it('liefert ohne gespeichertes Profil einen leeren Entwurf', () => {
    const empty = profileDetailsToDraft({
      ...details,
      profile: null,
      goals: null,
      records: [],
      preferredExercises: [],
      dislikedExercises: [],
    })
    expect(empty).toEqual(createEmptyDraft())
  })
})

describe('sessionRecordHints', () => {
  it('zeigt Bestleistungen aus Trainings mit Datum, manuelle nicht', () => {
    const hints = sessionRecordHints(details)
    expect(Object.keys(hints)).toEqual(['bench_press_1rm'])
    expect(hints.bench_press_1rm?.value).toBe('110 kg')
    expect(hints.bench_press_1rm?.text).toContain('17.10.2026')
  })
})
