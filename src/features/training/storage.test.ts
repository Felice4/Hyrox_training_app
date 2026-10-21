import { describe, expect, it } from 'vitest'
import { generateWorkout } from '@/domain/generator/generateWorkout'
import { LIBRARY, makeInput } from '@/domain/generator/testFixtures'
import { createSession } from '@/domain/session/session'
import { restoreActiveSession, storageKeys } from './storage'

describe('restoreActiveSession', () => {
  const session = createSession(
    generateWorkout(makeInput({ focus: 'hyrox' })),
    '2026-10-21T17:00:00.000Z',
    (() => {
      let n = 0
      return () => `id-${++n}`
    })(),
    (slug) => LIBRARY.find((e) => e.slug === slug)?.measurement ?? 'reps',
  )

  it('stellt ein gesichertes Training wieder her', () => {
    expect(restoreActiveSession(JSON.parse(JSON.stringify(session)))).toEqual(session)
  })

  it('verwirft beschädigte Daten', () => {
    expect(restoreActiveSession(null)).toBeNull()
    expect(restoreActiveSession({ ...session, exercises: 'kaputt' })).toBeNull()
    expect(restoreActiveSession({ ...session, workout: {} })).toBeNull()
  })

  it('trennt die Daten je Nutzer', () => {
    expect(storageKeys.activeSession('a')).not.toBe(storageKeys.activeSession('b'))
  })
})
