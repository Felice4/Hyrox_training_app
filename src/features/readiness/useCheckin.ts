import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLatestCheckin, saveCheckin, type Checkin } from '@/api/readiness'
import { useSupabase } from '@/app/supabaseContext'
import { useAuth } from '@/features/auth/authContext'

const checkinKey = (userId: string | undefined, today: string) =>
  ['readiness-checkin', userId, today] as const

function useUserId() {
  const auth = useAuth()
  return auth.status === 'signedIn' ? auth.session.user.id : undefined
}

/** Check-in von heute (`today` = lokales Datum) oder `null`. */
export function useTodayCheckin(today: string) {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: checkinKey(userId, today),
    queryFn: () => fetchLatestCheckin(supabase, new Date(`${today}T00:00:00`).toISOString()),
    enabled: userId !== undefined,
    staleTime: 5 * 60_000,
  })
}

export function useSaveCheckin(today: string) {
  const supabase = useSupabase()
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (checkin: Checkin) => saveCheckin(supabase, checkin),
    // Sofort anzeigen – der Generator nutzt den neuen Wert ohne Neuladen
    onSuccess: (_, checkin) => queryClient.setQueryData(checkinKey(userId, today), checkin),
  })
}
