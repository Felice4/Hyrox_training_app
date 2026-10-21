import { describe, expect, it } from 'vitest'
import {
  createEmptyDraft,
  draftToInput,
  errorsForFields,
  parseDecimal,
  restoreDraft,
  validateDraft,
  type ProfileDraft,
} from './draft'

const TODAY = '2026-10-21'

const filled: ProfileDraft = {
  ...createEmptyDraft(),
  displayName: 'Felix',
  birthDate: '1996-05-10',
  heightCm: '182',
  weightKg: '84,5',
  trainingLevel: 'intermediate',
  hyroxExperience: 'competed',
  strengthExperience: '1_3y',
  enduranceExperience: 'over_3y',
  hyroxBestTime: '1:29:40',
  records: { deadlift_1rm: '160', run_5k: '21:30' },
}

describe('parseDecimal', () => {
  it('akzeptiert Komma und Punkt', () => {
    expect(parseDecimal('84,5')).toBe(84.5)
    expect(parseDecimal('84.5')).toBe(84.5)
    expect(parseDecimal(' 182 ')).toBe(182)
  })

  it('liefert undefined für leer und NaN für ungültig', () => {
    expect(parseDecimal('  ')).toBeUndefined()
    expect(parseDecimal('abc')).toBeNaN()
    expect(parseDecimal('1,2,3')).toBeNaN()
    expect(parseDecimal('-5')).toBeNaN()
  })
})

describe('draftToInput', () => {
  it('wandelt Zahlen und Zeiten um', () => {
    const { input, errors } = draftToInput(filled)
    expect(errors).toEqual({})
    expect(input.weightKg).toBe(84.5)
    expect(input.hyroxBestTimeSec).toBe(5380)
    expect(input.records).toEqual({ deadlift_1rm: 160, run_5k: 1290 })
  })

  it('meldet Formatfehler am richtigen Feld', () => {
    const { errors } = draftToInput({
      ...filled,
      weightKg: 'viel',
      hyroxBestTime: '90 min',
      records: { run_5k: '21,5' },
    })
    expect(Object.keys(errors).sort()).toEqual(['hyroxBestTime', 'records.run_5k', 'weightKg'])
  })
})

describe('validateDraft', () => {
  it('akzeptiert einen vollständigen Entwurf', () => {
    const result = validateDraft(filled, TODAY, { requireWeight: true })
    expect(result.ok).toBe(true)
  })

  it('meldet fehlende Pflichtangaben', () => {
    const result = validateDraft(createEmptyDraft(), TODAY, { requireWeight: true })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors)).toEqual(
        expect.arrayContaining([
          'displayName',
          'birthDate',
          'heightCm',
          'weightKg',
          'trainingLevel',
          'hyroxExperience',
        ]),
      )
    }
  })

  it('verlangt das Gewicht nur, wenn gewünscht', () => {
    const withoutWeight = { ...filled, weightKg: '' }
    expect(validateDraft(withoutWeight, TODAY, { requireWeight: true }).ok).toBe(false)
    expect(validateDraft(withoutWeight, TODAY, { requireWeight: false }).ok).toBe(true)
  })

  it('ordnet Schemafehler den Entwurfsfeldern zu', () => {
    const result = validateDraft({ ...filled, hyroxBestTime: '0:20:00' }, TODAY, {
      requireWeight: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.hyroxBestTime).toBe('Mindestens 30 Minuten.')
  })

  it('bevorzugt Formatfehler vor allgemeinen Meldungen', () => {
    const result = validateDraft({ ...filled, heightCm: 'groß' }, TODAY, { requireWeight: true })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.heightCm).toContain('Zahl')
  })
})

describe('restoreDraft', () => {
  it('übernimmt passende Felder eines gespeicherten Entwurfs', () => {
    const restored = restoreDraft(JSON.parse(JSON.stringify(filled)))
    expect(restored).toEqual(filled)
  })

  it('ignoriert falsche Typen und unbekannte Felder', () => {
    const restored = restoreDraft({ displayName: 42, weightKg: '80', fremd: true, goals: null })
    expect(restored.displayName).toBe('')
    expect(restored.weightKg).toBe('80')
    expect(restored.goals).toEqual(createEmptyDraft().goals)
    expect('fremd' in restored).toBe(false)
  })

  it('liefert für Unsinn einen leeren Entwurf', () => {
    expect(restoreDraft('kaputt')).toEqual(createEmptyDraft())
    expect(restoreDraft(null)).toEqual(createEmptyDraft())
  })
})

describe('errorsForFields', () => {
  it('filtert auch verschachtelte Felder', () => {
    const errors = { weightKg: 'a', 'records.run_5k': 'b', goals: 'c' }
    expect(errorsForFields(errors, ['records', 'weightKg'])).toEqual({
      weightKg: 'a',
      'records.run_5k': 'b',
    })
  })
})
