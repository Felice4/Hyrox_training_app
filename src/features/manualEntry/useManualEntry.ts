import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteManualSession, saveManualEntry } from '@/api/manualSessions'
import { useSupabase } from '@/app/supabaseContext'
import type { Measurement } from '@/data/exercises/vocabulary'
import type { ManualEntry } from '@/domain/manualEntry/entry'
import { useAuth } from '@/features/auth/authContext'
import { plannedWorkoutsKey } from '@/features/calendar/usePlannedWorkouts'
import { profileDetailsQueryKey } from '@/features/profile/useProfile'
import { trainingHistoryQueryKey } from '@/features/training/useSaveSession'

/** Nach Speichern/Löschen: Verlauf (inkl. Kalender und Historie), Bestleistungen und Plan neu laden. */
function useRefreshAfterChange() {
  const auth = useAuth()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : undefined
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trainingHistoryQueryKey(userId) }),
      queryClient.invalidateQueries({ queryKey: profileDetailsQueryKey(userId) }),
      queryClient.invalidateQueries({ queryKey: plannedWorkoutsKey(userId) }),
    ])
}

export function useSaveManualEntry(measurementOf: (slug: string) => Measurement | undefined) {
  const supabase = useSupabase()
  const refresh = useRefreshAfterChange()
  return useMutation({
    mutationFn: ({ entry, editing }: { entry: ManualEntry; editing: boolean }) =>
      saveManualEntry(supabase, entry, { editing, measurementOf }),
    onSuccess: refresh,
  })
}

export function useDeleteManualSession(measurementOf: (slug: string) => Measurement | undefined) {
  const supabase = useSupabase()
  const refresh = useRefreshAfterChange()
  return useMutation({
    mutationFn: (sessionId: string) => deleteManualSession(supabase, sessionId, measurementOf),
    onSuccess: refresh,
  })
}
