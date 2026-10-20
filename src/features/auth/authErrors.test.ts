import { describe, expect, it } from 'vitest'
import { toGermanAuthError } from './authErrors'

describe('toGermanAuthError', () => {
  it('meldet falsche Zugangsdaten', () => {
    expect(toGermanAuthError({ code: 'invalid_credentials', status: 400 })).toBe(
      'E-Mail oder Passwort ist falsch.',
    )
  })

  it('erkennt Netzwerkfehler', () => {
    expect(toGermanAuthError({ name: 'AuthRetryableFetchError', status: 0 })).toContain(
      'Keine Verbindung',
    )
  })

  it('meldet zu viele Versuche', () => {
    expect(toGermanAuthError({ code: 'over_request_rate_limit', status: 429 })).toContain(
      'Zu viele',
    )
  })

  it('liefert für unbekannte Fehler eine allgemeine Meldung', () => {
    expect(toGermanAuthError({ code: 'irgendwas' })).toContain('Anmeldung fehlgeschlagen')
  })
})
