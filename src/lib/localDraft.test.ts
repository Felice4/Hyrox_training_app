import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearDraft, loadDraft, saveDraft } from './localDraft'

function fakeStorage(fail = false) {
  const data = new Map<string, string>()
  const guard = () => {
    if (fail) throw new Error('Speicher nicht verfügbar')
  }
  return {
    getItem: (key: string) => (guard(), data.get(key) ?? null),
    setItem: (key: string, value: string) => (guard(), void data.set(key, value)),
    removeItem: (key: string) => (guard(), void data.delete(key)),
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('localDraft', () => {
  it('speichert, lädt und löscht Entwürfe', () => {
    vi.stubGlobal('window', { localStorage: fakeStorage() })
    saveDraft('k', { a: 1 })
    expect(loadDraft('k', null, (v) => v)).toEqual({ a: 1 })
    clearDraft('k')
    expect(loadDraft('k', 'leer', (v) => v)).toBe('leer')
  })

  it('fällt bei beschädigten Daten oder fehlendem Speicher still zurück', () => {
    const storage = fakeStorage()
    storage.setItem('k', '{kaputt')
    vi.stubGlobal('window', { localStorage: storage })
    expect(loadDraft('k', 'fallback', (v) => v)).toBe('fallback')

    vi.stubGlobal('window', { localStorage: fakeStorage(true) })
    expect(() => saveDraft('k', 1)).not.toThrow()
    expect(() => clearDraft('k')).not.toThrow()
    expect(loadDraft('k', 'fallback', (v) => v)).toBe('fallback')
  })
})
