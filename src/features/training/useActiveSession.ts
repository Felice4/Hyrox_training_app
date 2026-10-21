import { useCallback, useEffect, useState } from 'react'
import type { ActiveSession } from '@/domain/session/types'
import { useAuth } from '@/features/auth/authContext'
import { clearDraft, loadDraft, saveDraft } from '@/lib/localDraft'
import { restoreActiveSession, storageKeys } from './storage'

/** Aktion auf dem laufenden Training: bekommt aktuelle Zeit und eine ID-Fabrik. */
export type SessionAction = (
  session: ActiveSession,
  now: string,
  newId: () => string,
) => ActiveSession

export function useActiveSessionKey(): string {
  const auth = useAuth()
  return storageKeys.activeSession(auth.status === 'signedIn' ? auth.session.user.id : 'unbekannt')
}

/** Liest nur, ob gerade ein Training läuft (z. B. für einen „Fortsetzen"-Hinweis). */
export function readActiveSession(key: string): ActiveSession | null {
  return loadDraft(key, null, restoreActiveSession)
}

export function writeActiveSession(key: string, session: ActiveSession | null): void {
  if (session) saveDraft(key, session)
  else clearDraft(key)
}

/**
 * Das laufende Training. Jede Änderung wird sofort lokal gesichert – ein Neuladen,
 * App-Wechsel oder Funkloch im Studio verliert nichts.
 */
export function useActiveSession() {
  const key = useActiveSessionKey()
  const [session, setSession] = useState<ActiveSession | null>(() => readActiveSession(key))

  useEffect(() => writeActiveSession(key, session), [key, session])

  const apply = useCallback((action: SessionAction) => {
    setSession((current) =>
      current ? action(current, new Date().toISOString(), () => crypto.randomUUID()) : current,
    )
  }, [])

  const discard = useCallback(() => setSession(null), [])

  return { session, apply, discard }
}
