import { describe, expect, it } from 'vitest'
import { NAV_ITEMS } from './navigation'

describe('NAV_ITEMS', () => {
  it('hat höchstens 5 Einträge (Smartphone-Bottom-Navigation)', () => {
    expect(NAV_ITEMS.length).toBeLessThanOrEqual(5)
  })

  it('hat eindeutige Pfade und Beschriftungen', () => {
    const paths = NAV_ITEMS.map((item) => item.to)
    const labels = NAV_ITEMS.map((item) => item.label)
    expect(new Set(paths).size).toBe(paths.length)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('beginnt mit der Startseite', () => {
    expect(NAV_ITEMS[0]?.to).toBe('/')
    expect(NAV_ITEMS[0]?.end).toBe(true)
  })
})
