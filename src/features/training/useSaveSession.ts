import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveWorkoutSession } from '@/api/sessions'
import { saveSimulation } from '@/api/simulations'
import { useSupabase } from '@/app/supabaseContext'
import type { SaveSessionPayload } from '@/domain/session/payload'
import type { SimulationRecord } from '@/domain/simulation/simulation'
import { useAuth } from '@/features/auth/authContext'
import { plannedWorkoutsKey } from '@/features/calendar/usePlannedWorkouts'
import { profileDetailsQueryKey } from '@/features/profile/useProfile'
import { simulationsQueryKey } from '@/features/simulation/useSimulations'

export const trainingHistoryQueryKey = (userId: string | undefined) =>
  ['training-history', userId] as const

export interface SaveSessionInput {
  payload: SaveSessionPayload
  /** HYROX-Simulation: Format und Zwischenzeiten (nach dem Training gespeichert) */
  simulation?: SimulationRecord | undefined
}

/**
 * Speichert ein Training (bei einer Simulation danach auch Format und Zwischenzeiten);
 * anschließend werden Verlauf, Bestleistungen, Wochenplan und Simulationen neu geladen.
 * Beides ist idempotent – erneutes Speichern nach einem Fehler ist sicher.
 */
export function useSaveSession() {
  const supabase = useSupabase()
  const auth = useAuth()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : undefined
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ payload, simulation }: SaveSessionInput) => {
      const result = await saveWorkoutSession(supabase, payload)
      if (simulation) await saveSimulation(supabase, simulation)
      return result
    },
    // Bei Netzproblemen im Studio automatisch erneut versuchen – Speichern ist idempotent
    retry: 2,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trainingHistoryQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: profileDetailsQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: plannedWorkoutsKey(userId) }),
        queryClient.invalidateQueries({ queryKey: simulationsQueryKey(userId) }),
      ])
    },
  })
}
