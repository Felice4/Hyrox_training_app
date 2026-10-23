import { useQuery } from '@tanstack/react-query'
import { fetchSessionsBetween } from '@/api/history'
import { useSupabase } from '@/app/supabaseContext'
import { useAuth } from '@/features/auth/authContext'
import { trainingHistoryQueryKey } from '@/features/training/useSaveSession'
import { addDays } from './week'

/**
 * Absolvierte Trainings von `from` bis `to` (lokale Daten, inklusive) – unabhängig vom
 * 90-Tage-Verlauf, damit auch ältere Wochen und Monate vollständig sind.
 */
export function useSessionsInRange(from: string, to: string) {
  const supabase = useSupabase()
  const auth = useAuth()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : undefined
  return useQuery({
    // Unter dem Verlaufsschlüssel → nach dem Speichern eines Trainings automatisch neu geladen
    queryKey: [...trainingHistoryQueryKey(userId), 'range', from, to],
    queryFn: () =>
      fetchSessionsBetween(
        supabase,
        new Date(`${from}T00:00:00`).toISOString(),
        new Date(`${addDays(to, 1)}T00:00:00`).toISOString(),
      ),
    enabled: userId !== undefined,
    staleTime: 60_000,
  })
}
