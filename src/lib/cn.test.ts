import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('verbindet Klassen mit Leerzeichen', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('lässt false, null, undefined und leere Strings weg', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
  })

  it('liefert einen leeren String ohne Klassen', () => {
    expect(cn()).toBe('')
  })
})
