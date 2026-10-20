import { describe, expect, it } from 'vitest'
import { isSecretKey, parseEnv } from './env'

/** Baut ein (unsigniertes) JWT mit der angegebenen Rolle – reicht zum Testen der Erkennung. */
function fakeJwt(role: string): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: 'supabase', role })}.signatur`
}

const VALID_URL = 'https://abcdefghijklmnop.supabase.co'
const PUBLISHABLE_KEY = 'sb_publishable_1234567890abcdefghij'

describe('parseEnv', () => {
  it('akzeptiert URL und publishable Key', () => {
    const result = parseEnv({
      VITE_SUPABASE_URL: VALID_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    })
    expect(result).toEqual({
      ok: true,
      env: { supabaseUrl: VALID_URL, supabasePublishableKey: PUBLISHABLE_KEY },
    })
  })

  it('akzeptiert einen alten anon-JWT', () => {
    const result = parseEnv({
      VITE_SUPABASE_URL: VALID_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: fakeJwt('anon'),
    })
    expect(result.ok).toBe(true)
  })

  it('meldet fehlende Variablen', () => {
    const result = parseEnv({})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors).toHaveLength(2)
  })

  it('lehnt eine ungültige URL ab', () => {
    const result = parseEnv({
      VITE_SUPABASE_URL: 'keine-url',
      VITE_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    })
    expect(result.ok).toBe(false)
  })

  it('lehnt eine URL mit Pfad ab (z. B. /rest/v1/)', () => {
    const result = parseEnv({
      VITE_SUPABASE_URL: `${VALID_URL}/rest/v1/`,
      VITE_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toContain('Basis-Adresse')
  })

  it('entfernt einen abschließenden Schrägstrich', () => {
    const result = parseEnv({
      VITE_SUPABASE_URL: `${VALID_URL}/`,
      VITE_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    })
    expect(result.ok && result.env.supabaseUrl).toBe(VALID_URL)
  })

  it('lehnt geheime Schlüssel ab', () => {
    for (const secret of ['sb_secret_1234567890abcdefghij', fakeJwt('service_role')]) {
      const result = parseEnv({
        VITE_SUPABASE_URL: VALID_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: secret,
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors[0]).toContain('GEHEIMER')
    }
  })
})

describe('isSecretKey', () => {
  it('erkennt publishable und anon Keys als unkritisch', () => {
    expect(isSecretKey(PUBLISHABLE_KEY)).toBe(false)
    expect(isSecretKey(fakeJwt('anon'))).toBe(false)
  })

  it('stürzt bei kaputten JWTs nicht ab', () => {
    expect(isSecretKey('a.%%%.c')).toBe(false)
  })
})
