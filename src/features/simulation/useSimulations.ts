import { useQuery } from '@tanstack/react-query'
import { fetchSimulations } from '@/api/simulations'
import { useSupabase } from '@/app/supabaseContext'
import { useAuth } from '@/features/auth/authContext'

export const simulationsQueryKey = (userId: string | undefined) =>
  ['hyrox-simulations', userId] as const

/** Alle gespeicherten HYROX-Simulationen, neueste zuerst. */
export function useSimulations() {
  const supabase = useSupabase()
  const auth = useAuth()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : undefined
  return useQuery({
    queryKey: simulationsQueryKey(userId),
    queryFn: () => fetchSimulations(supabase),
    enabled: userId !== undefined,
  })
}
