import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthState =
  | { status: 'loading'; session: null }
  | { status: 'signedOut'; session: null }
  | { status: 'signedIn'; session: Session }

export const AuthContext = createContext<AuthState | null>(null)

/** Aktueller Anmeldestatus. Nur innerhalb von <AuthProvider> verwendbar. */
export function useAuth(): AuthState {
  const state = useContext(AuthContext)
  if (!state) {
    throw new Error('useAuth() außerhalb von <AuthProvider> aufgerufen')
  }
  return state
}
