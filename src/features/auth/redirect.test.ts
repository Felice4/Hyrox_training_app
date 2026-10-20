import { describe, expect, it } from 'vitest'
import { getRedirectTarget } from './redirect'

describe('getRedirectTarget', () => {
  it('leitet zur ursprünglich aufgerufenen Seite weiter', () => {
    expect(getRedirectTarget({ from: '/stats' })).toBe('/stats')
  })

  it('fällt ohne Angabe auf die Startseite zurück', () => {
    expect(getRedirectTarget(null)).toBe('/')
    expect(getRedirectTarget(undefined)).toBe('/')
    expect(getRedirectTarget({})).toBe('/')
    expect(getRedirectTarget({ from: 42 })).toBe('/')
  })

  it('erlaubt keine externen Adressen', () => {
    expect(getRedirectTarget({ from: 'https://example.com' })).toBe('/')
    expect(getRedirectTarget({ from: '//example.com' })).toBe('/')
  })

  it('leitet nicht zurück zum Login', () => {
    expect(getRedirectTarget({ from: '/login' })).toBe('/')
  })
})
