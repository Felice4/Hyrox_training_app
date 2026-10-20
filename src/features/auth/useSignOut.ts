import { useState } from 'react'
import { useSupabase } from '@/app/supabaseContext'

/**
 * Meldet nur auf DIESEM Gerät ab (scope: 'local').
 * Andere Geräte (z. B. der Laptop) bleiben angemeldet.
 */
export function useSignOut() {
  const supabase = useSupabase()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signOut() {
    setSigningOut(true)
    setError(null)
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
    if (signOutError) {
      setError('Abmelden fehlgeschlagen. Bitte erneut versuchen.')
    }
    // Erfolg: AuthProvider erhält SIGNED_OUT, RequireAuth leitet zur Login-Seite
    setSigningOut(false)
  }

  return { signOut, signingOut, error }
}
