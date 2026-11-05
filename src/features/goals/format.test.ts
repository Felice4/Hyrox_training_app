import { describe, expect, it } from 'vitest'
import { getMilestone } from '@/data/skills'
import type { MilestoneProgress } from '@/domain/skills/milestones'
import { describeMilestoneProgress, formatMilestoneValue } from './format'

const progress = (overrides: Partial<MilestoneProgress>): MilestoneProgress => ({
  milestone: getMilestone('pull-ups-15')!,
  unit: 'reps',
  current: 12,
  target: 15,
  achieved: false,
  ratio: 0.8,
  missingBodyWeight: false,
  ...overrides,
})

describe('Meilenstein-Texte', () => {
  it('formatiert Werte je Einheit', () => {
    expect(formatMilestoneValue(12, 'reps')).toBe('12 Wdh.')
    expect(formatMilestoneValue(167.5, 'kg')).toBe('167,5 kg')
    expect(formatMilestoneValue(1380, 'sec')).toBe('23:00')
    expect(formatMilestoneValue(5380, 'sec')).toBe('1:29:40')
  })

  it('beschreibt den Stand', () => {
    expect(describeMilestoneProgress(progress({}))).toBe('12 von 15 Wdh.')
    expect(describeMilestoneProgress(progress({ unit: 'kg', current: 150, target: 168 }))).toBe(
      '150 von 168 kg',
    )
    expect(describeMilestoneProgress(progress({ unit: 'sec', current: 1380, target: 1320 }))).toBe(
      'Bestzeit 23:00 · Ziel 22:00',
    )
    expect(describeMilestoneProgress(progress({ current: null }))).toBe('Noch kein Wert')
    expect(
      describeMilestoneProgress(progress({ unit: 'kg', target: null, missingBodyWeight: true })),
    ).toMatch(/Körpergewicht/)
  })
})
