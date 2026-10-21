import { describe, expect, it } from 'vitest'
import { createEmptyDraft, validateDraft } from '@/features/profile/draft'
import { ONBOARDING_STEPS } from './steps'

describe('ONBOARDING_STEPS', () => {
  it('deckt jedes Entwurfsfeld genau einmal ab', () => {
    const fields = ONBOARDING_STEPS.flatMap((step) => step.fields)
    expect(new Set(fields).size).toBe(fields.length)
    expect([...fields].sort()).toEqual(Object.keys(createEmptyDraft()).sort())
  })

  it('ordnet jeden möglichen Fehler eines leeren Entwurfs einem Schritt zu', () => {
    const result = validateDraft(createEmptyDraft(), '2026-10-21', { requireWeight: true })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const fields = ONBOARDING_STEPS.flatMap((step) => step.fields)
    const unassigned = Object.keys(result.errors).filter(
      (key) => !fields.some((field) => key === field || key.startsWith(`${field}.`)),
    )
    expect(unassigned).toEqual([])
  })
})
