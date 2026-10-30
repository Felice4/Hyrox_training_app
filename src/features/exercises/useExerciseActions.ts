import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCustomExercise,
  fetchArchivedCustomExercises,
  setCustomExerciseArchived,
  setExercisePreference,
  updateCustomExercise,
} from '@/api/exercises'
import { useSupabase } from '@/app/supabaseContext'
import type { ExerciseDefinition } from '@/data/exercises/schema'
import type { Preference } from '@/data/exercises/vocabulary'
import { useAuth } from '@/features/auth/authContext'
import { profileDetailsQueryKey } from '@/features/profile/useProfile'
import { exerciseCatalogQueryKey } from './useExerciseCatalog'

function useUserId() {
  const auth = useAuth()
  return auth.status === 'signedIn' ? auth.session.user.id : undefined
}

const archivedKey = (userId: string | undefined) =>
  [...exerciseCatalogQueryKey(userId), 'archived'] as const

/** Nach jeder Änderung: Katalog (inkl. Archiv) und Profil (Präferenzen) neu laden. */
function useInvalidate() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: exerciseCatalogQueryKey(userId) }),
      queryClient.invalidateQueries({ queryKey: profileDetailsQueryKey(userId) }),
    ])
}

export function useArchivedCustomExercises() {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: archivedKey(userId),
    queryFn: () => fetchArchivedCustomExercises(supabase),
    enabled: userId !== undefined,
  })
}

export function useCreateCustomExercise() {
  const supabase = useSupabase()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (exercise: ExerciseDefinition) => createCustomExercise(supabase, exercise),
    onSuccess: invalidate,
  })
}

export function useUpdateCustomExercise() {
  const supabase = useSupabase()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, exercise }: { id: string; exercise: ExerciseDefinition }) =>
      updateCustomExercise(supabase, id, exercise),
    onSuccess: invalidate,
  })
}

export function useSetArchived() {
  const supabase = useSupabase()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      setCustomExerciseArchived(supabase, id, archived),
    onSuccess: invalidate,
  })
}

export function useSetPreference() {
  const supabase = useSupabase()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, preference }: { id: string; preference: Preference }) =>
      setExercisePreference(supabase, id, preference),
    onSuccess: invalidate,
  })
}
