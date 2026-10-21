import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProfile, fetchProfileDetails, saveProfile } from '@/api/profile'
import { useSupabase } from '@/app/supabaseContext'
import type { SaveProfilePayload } from '@/domain/profile/payload'
import { useAuth } from '@/features/auth/authContext'

export const profileQueryKey = (userId: string | undefined) => ['profile', userId] as const

function useUserId(): string | undefined {
  const auth = useAuth()
  return auth.status === 'signedIn' ? auth.session.user.id : undefined
}

/** Profil des angemeldeten Nutzers (`null` = noch kein Onboarding begonnen). */
export function useProfile() {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => fetchProfile(supabase),
    enabled: userId !== undefined,
  })
}

export const profileDetailsQueryKey = (userId: string | undefined) =>
  ['profile-details', userId] as const

/**
 * Alle Angaben für die Profilseite. Kein automatisches Neuladen beim Zurückkehren in die App,
 * damit ungespeicherte Eingaben nicht überschrieben werden – nach dem Speichern wird gezielt
 * neu geladen.
 */
export function useProfileDetails() {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: profileDetailsQueryKey(userId),
    queryFn: () => fetchProfileDetails(supabase),
    enabled: userId !== undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

/** Speichert Profilangaben und lädt danach Profil und Übungen (Präferenzen) neu. */
export function useSaveProfile() {
  const supabase = useSupabase()
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveProfilePayload) => saveProfile(supabase, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: ['exercises', userId] }),
        queryClient.invalidateQueries({ queryKey: profileDetailsQueryKey(userId) }),
      ])
    },
  })
}
