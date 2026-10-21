import { describe, expect, it } from 'vitest'
import { isNavItemActive, NAV_ITEMS } from './navigation'

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

  it('ordnet die Übungsbibliothek dem Bereich „Mehr" zu', () => {
    expect(isNavItemActive(NAV_ITEMS[4]!, '/exercises/back-squat')).toBe(true)
    expect(isNavItemActive(NAV_ITEMS[4]!, '/profile')).toBe(true)
    expect(isNavItemActive(NAV_ITEMS[0]!, '/exercises')).toBe(false)
  })

  it('aktiviert „Start" nur auf der Startseite', () => {
    expect(isNavItemActive(NAV_ITEMS[0]!, '/')).toBe(true)
    expect(isNavItemActive(NAV_ITEMS[0]!, '/stats')).toBe(false)
    expect(isNavItemActive(NAV_ITEMS[3]!, '/stats')).toBe(true)
  })

  it('beginnt mit der Startseite', () => {
    expect(NAV_ITEMS[0]?.to).toBe('/')
    expect(NAV_ITEMS[0]?.end).toBe(true)
  })
})
