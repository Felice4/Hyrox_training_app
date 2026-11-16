import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cancelRace, completeRace, createRace, fetchCurrentRace, updateRace } from '@/api/races'
import { useSupabase } from '@/app/supabaseContext'
import type { RaceInput } from '@/domain/race/race'
import { useAuth } from '@/features/auth/authContext'
import { profileDetailsQueryKey } from '@/features/profile/useProfile'
import { toLocalIsoDate } from '@/lib/date'

export const activeRaceQueryKey = (userId: string | undefined) => ['active-race', userId] as const

function useUserId() {
  const auth = useAuth()
  return auth.status === 'signedIn' ? auth.session.user.id : undefined
}

/**
 * Der aktuelle Wettkampf oder `null` (docs/RACE_PREP.md): der aktive, sonst ein
 * abgeschlossener bis zum Ende seiner Erholungswoche.
 */
export function useActiveRace() {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: activeRaceQueryKey(userId),
    queryFn: () => fetchCurrentRace(supabase, toLocalIsoDate()),
    enabled: userId !== undefined,
  })
}

function useInvalidateRace() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return () => queryClient.invalidateQueries({ queryKey: activeRaceQueryKey(userId) })
}

export function useCreateRace() {
  const supabase = useSupabase()
  const invalidate = useInvalidateRace()
  return useMutation({
    mutationFn: ({ input, planStart }: { input: RaceInput; planStart: string }) =>
      createRace(supabase, input, planStart),
    onSuccess: invalidate,
  })
}

export function useUpdateRace() {
  const supabase = useSupabase()
  const invalidate = useInvalidateRace()
  return useMutation({
    mutationFn: ({ id, input, planStart }: { id: string; input: RaceInput; planStart: string }) =>
      updateRace(supabase, id, input, planStart),
    onSuccess: invalidate,
  })
}

/** Ergebnis eintragen; lädt danach Wettkampf und Profil (Bestzeit) neu. */
export function useCompleteRace() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: (input: Parameters<typeof completeRace>[1]) => completeRace(supabase, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: activeRaceQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: profileDetailsQueryKey(userId) }),
      ]),
  })
}

export function useCancelRace() {
  const supabase = useSupabase()
  const invalidate = useInvalidateRace()
  return useMutation({
    mutationFn: (id: string) => cancelRace(supabase, id),
    onSuccess: invalidate,
  })
}

/** Datum des aktiven Wettkampfs (für die Markierung im Kalender). */
export function useRaceDate(): string | undefined {
  return useActiveRace().data?.raceDate
}
