import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useSupabase } from '@/app/supabaseContext'
import { AuthContext, type AuthState } from './authContext'

/**
 * Hält den Anmeldestatus aktuell. Supabase meldet beim Abonnieren sofort die gespeicherte
 * Sitzung (INITIAL_SESSION) und danach jede Änderung (Anmelden, Abmelden, Token-Erneuerung).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading', session: null })

  useEffect(() => {
    // Hinweis: In diesem Callback keine weiteren Supabase-Aufrufe mit await (Gefahr einer Blockade).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Zwischengespeicherte Daten dürfen nach dem Abmelden nicht sichtbar bleiben
        queryClient.clear()
      }
      setState(session ? { status: 'signedIn', session } : { status: 'signedOut', session: null })
    })
    return () => subscription.unsubscribe()
  }, [supabase, queryClient])

  return <AuthContext value={state}>{children}</AuthContext>
}
