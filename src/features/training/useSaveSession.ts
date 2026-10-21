import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveWorkoutSession } from '@/api/sessions'
import { useSupabase } from '@/app/supabaseContext'
import type { SaveSessionPayload } from '@/domain/session/payload'
import { useAuth } from '@/features/auth/authContext'
import { profileDetailsQueryKey } from '@/features/profile/useProfile'

export const trainingHistoryQueryKey = (userId: string | undefined) =>
  ['training-history', userId] as const

/** Speichert ein Training; danach werden Verlauf und Bestleistungen neu geladen. */
export function useSaveSession() {
  const supabase = useSupabase()
  const auth = useAuth()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : undefined
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveSessionPayload) => saveWorkoutSession(supabase, payload),
    // Bei Netzproblemen im Studio automatisch erneut versuchen – Speichern ist idempotent
    retry: 2,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trainingHistoryQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: profileDetailsQueryKey(userId) }),
      ])
    },
  })
}
