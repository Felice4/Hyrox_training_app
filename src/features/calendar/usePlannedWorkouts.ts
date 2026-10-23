import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addPlannedWorkout,
  deletePlannedWorkout,
  fetchPlannedWorkout,
  fetchPlannedWorkouts,
  fetchWeekPlan,
  replaceWeekPlan,
  updatePlannedWorkout,
  type PlannedWorkoutChange,
  type ReplaceWeekPlanPayload,
} from '@/api/weekPlans'
import { useSupabase } from '@/app/supabaseContext'
import type { GeneratedWorkout } from '@/domain/generator'
import { useAuth } from '@/features/auth/authContext'
import { addDays } from './week'

/** Gemeinsamer Präfix – nach jeder Änderung wird alles Geplante neu geladen. */
export const plannedWorkoutsKey = (userId: string | undefined) =>
  ['planned-workouts', userId] as const

function useUserId(): string | undefined {
  const auth = useAuth()
  return auth.status === 'signedIn' ? auth.session.user.id : undefined
}

/** Wochenplan und geplante Einheiten einer Woche. */
export function usePlannedWeek(weekStart: string) {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: [...plannedWorkoutsKey(userId), 'week', weekStart],
    queryFn: async () => {
      const [plan, planned] = await Promise.all([
        fetchWeekPlan(supabase, weekStart),
        fetchPlannedWorkouts(supabase, weekStart, addDays(weekStart, 6)),
      ])
      return { plan, planned }
    },
    enabled: userId !== undefined,
  })
}

/** Offene und vergangene Einheiten von heute bis in zwei Wochen (Dashboard). */
export function useUpcomingPlanned(today: string) {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: [...plannedWorkoutsKey(userId), 'upcoming', today],
    queryFn: () => fetchPlannedWorkouts(supabase, today, addDays(today, 13)),
    enabled: userId !== undefined,
  })
}

export function usePlannedWorkout(id: string) {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: [...plannedWorkoutsKey(userId), 'single', id],
    queryFn: () => fetchPlannedWorkout(supabase, id),
    enabled: userId !== undefined,
  })
}

function useInvalidatePlanned() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: plannedWorkoutsKey(userId) })
}

export function useReplaceWeekPlan() {
  const supabase = useSupabase()
  const invalidate = useInvalidatePlanned()
  return useMutation({
    mutationFn: (payload: ReplaceWeekPlanPayload) => replaceWeekPlan(supabase, payload),
    onSuccess: invalidate,
  })
}

export function useUpdatePlannedWorkout() {
  const supabase = useSupabase()
  const invalidate = useInvalidatePlanned()
  return useMutation({
    mutationFn: ({ id, change }: { id: string; change: PlannedWorkoutChange }) =>
      updatePlannedWorkout(supabase, id, change),
    onSuccess: invalidate,
  })
}

export function useAddPlannedWorkout() {
  const supabase = useSupabase()
  const invalidate = useInvalidatePlanned()
  return useMutation({
    mutationFn: ({ date, workout }: { date: string; workout: GeneratedWorkout }) =>
      addPlannedWorkout(supabase, date, workout),
    onSuccess: invalidate,
  })
}

export function useDeletePlannedWorkout() {
  const supabase = useSupabase()
  const invalidate = useInvalidatePlanned()
  return useMutation({
    mutationFn: (id: string) => deletePlannedWorkout(supabase, id),
    onSuccess: invalidate,
  })
}

/** Geplante Einheiten in einem Zeitraum (Monatsansicht). */
export function usePlannedRange(from: string, to: string) {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: [...plannedWorkoutsKey(userId), 'range', from, to],
    queryFn: () => fetchPlannedWorkouts(supabase, from, to),
    enabled: userId !== undefined,
  })
}
