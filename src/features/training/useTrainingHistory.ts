import { useQuery } from '@tanstack/react-query'
import { fetchTrainingHistory } from '@/api/history'
import { useSupabase } from '@/app/supabaseContext'
import { useAuth } from '@/features/auth/authContext'
import { trainingHistoryQueryKey } from './useSaveSession'

/**
 * Gespeicherte Trainings der letzten 90 Tage – Grundlage für Gewichtsvorschläge,
 * Ermüdung, Abwechslung, Trainingsbelastung und „Letztes Mal".
 */
export function useTrainingHistory() {
  const supabase = useSupabase()
  const auth = useAuth()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : undefined
  return useQuery({
    queryKey: trainingHistoryQueryKey(userId),
    queryFn: () => fetchTrainingHistory(supabase),
    enabled: userId !== undefined,
    staleTime: 60_000,
  })
}
