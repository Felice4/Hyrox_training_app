import { useQuery } from '@tanstack/react-query'
import { syncExerciseLibrary } from '@/api/exerciseLibrary'
import { useSupabase } from '@/app/supabaseContext'
import { LIBRARY_VERSION } from '@/data/exercises'
import { useAuth } from '@/features/auth/authContext'

/** Query-Schlüssel des Abgleichs – andere Abfragen auf Übungen können darauf warten. */
export const librarySyncQueryKey = (userId: string | undefined) =>
  ['exercise-library-sync', userId, LIBRARY_VERSION] as const

/**
 * Gleicht die Übungsbibliothek nach dem Login einmal pro Sitzung ab.
 * Läuft im Hintergrund; nur bei einem Fehler zeigt die App einen Hinweis.
 */
export function useLibrarySync() {
  const supabase = useSupabase()
  const auth = useAuth()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : undefined

  return useQuery({
    queryKey: librarySyncQueryKey(userId),
    queryFn: () => syncExerciseLibrary(supabase),
    enabled: userId !== undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 2,
  })
}
