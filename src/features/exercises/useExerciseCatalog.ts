import { useQuery } from '@tanstack/react-query'
import { fetchExerciseCatalog } from '@/api/exercises'
import { useSupabase } from '@/app/supabaseContext'
import { useAuth } from '@/features/auth/authContext'
import { useLibrarySync } from './useLibrarySync'

export const exerciseCatalogQueryKey = (userId: string | undefined) =>
  ['exercises', userId] as const

/**
 * Alle aktiven Übungen aus der Datenbank. Wartet auf den Bibliotheksabgleich,
 * damit nach einem Update nicht kurz der alte Stand erscheint. Schlägt der Abgleich
 * fehl, wird trotzdem geladen (dann mit dem bisherigen Stand).
 */
export function useExerciseCatalog() {
  const supabase = useSupabase()
  const auth = useAuth()
  const sync = useLibrarySync()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : undefined

  const catalog = useQuery({
    queryKey: exerciseCatalogQueryKey(userId),
    queryFn: () => fetchExerciseCatalog(supabase),
    enabled: userId !== undefined && !sync.isPending,
    staleTime: 5 * 60_000,
  })

  return { catalog, isSyncing: sync.isPending }
}
