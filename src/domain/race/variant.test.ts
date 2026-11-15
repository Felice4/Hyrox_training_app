import { describe, expect, it } from 'vitest'
import {
  categoriesFor,
  gendersFor,
  isValidVariant,
  normalizeVariant,
  variantLabel,
  weightSets,
} from './variant'

describe('Varianten', () => {
  it('kennt keine Pro-Staffel und kein Mixed bei Singles oder Pro Doubles', () => {
    expect(categoriesFor('relay')).toEqual(['open'])
    expect(gendersFor('single', 'open')).toEqual(['men', 'women'])
    expect(gendersFor('double', 'pro')).toEqual(['men', 'women'])
    expect(gendersFor('double', 'open')).toEqual(['men', 'women', 'mixed'])
    expect(isValidVariant({ format: 'relay', category: 'pro', gender: 'men' })).toBe(false)
    expect(isValidVariant({ format: 'single', category: 'open', gender: 'mixed' })).toBe(false)
    expect(isValidVariant({ format: 'single', category: 'pro', gender: 'women' })).toBe(true)
  })

  it('macht ungültige Kombinationen nach einem Formatwechsel wieder gültig', () => {
    expect(normalizeVariant({ format: 'relay', category: 'pro', gender: 'men' })).toEqual({
      format: 'relay',
      category: 'open',
      gender: 'men',
    })
    expect(normalizeVariant({ format: 'single', category: 'open', gender: 'mixed' })).toEqual({
      format: 'single',
      category: 'open',
      gender: 'men',
    })
    expect(normalizeVariant({ format: 'double', category: 'pro', gender: 'women' })).toEqual({
      format: 'double',
      category: 'pro',
      gender: 'women',
    })
  })

  it('beschriftet die Variante', () => {
    expect(variantLabel({ format: 'single', category: 'open', gender: 'men' })).toBe(
      'Singles · Open · Männer',
    )
  })
})

describe('weightSets', () => {
  it('nimmt die Gewichte von Kategorie und Wertung', () => {
    expect(weightSets({ format: 'single', category: 'open', gender: 'men' })).toEqual([
      { label: null, division: 'open_men' },
    ])
    expect(weightSets({ format: 'double', category: 'pro', gender: 'women' })).toEqual([
      { label: null, division: 'pro_women' },
    ])
  })

  it('nutzt bei Mixed Doubles die Männer-Gewichte, in der Mixed-Staffel beide', () => {
    expect(weightSets({ format: 'double', category: 'open', gender: 'mixed' })).toEqual([
      { label: null, division: 'open_men' },
    ])
    expect(weightSets({ format: 'relay', category: 'open', gender: 'mixed' })).toEqual([
      { label: 'Männer', division: 'open_men' },
      { label: 'Frauen', division: 'open_women' },
    ])
  })
})
