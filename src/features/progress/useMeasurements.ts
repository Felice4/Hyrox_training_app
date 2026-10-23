import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteMeasurement, fetchMeasurements, saveMeasurement } from '@/api/measurements'
import { useSupabase } from '@/app/supabaseContext'
import type { BodyValues } from '@/domain/profile/bodyMetrics'
import { useAuth } from '@/features/auth/authContext'
import { profileDetailsQueryKey } from '@/features/profile/useProfile'

const measurementsKey = (userId: string | undefined) => ['body-measurements', userId] as const

function useUserId() {
  const auth = useAuth()
  return auth.status === 'signedIn' ? auth.session.user.id : undefined
}

export function useMeasurements() {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: measurementsKey(userId),
    queryFn: () => fetchMeasurements(supabase),
    enabled: userId !== undefined,
  })
}

/** Nach jeder Änderung auch das Profil neu laden (zeigt dort den letzten Wert an). */
function useInvalidate() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: measurementsKey(userId) }),
      queryClient.invalidateQueries({ queryKey: profileDetailsQueryKey(userId) }),
    ])
}

export function useSaveMeasurement() {
  const supabase = useSupabase()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { date: string; values: BodyValues; notes: string | undefined }) =>
      saveMeasurement(supabase, input.date, input.values, input.notes),
    onSuccess: invalidate,
  })
}

export function useDeleteMeasurement() {
  const supabase = useSupabase()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => deleteMeasurement(supabase, id),
    onSuccess: invalidate,
  })
}
