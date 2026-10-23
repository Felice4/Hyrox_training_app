import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  SESSION_PAGE_SIZE,
  fetchSessionDetail,
  fetchSessionList,
  updateSessionNotes,
} from '@/api/sessionHistory'
import { useSupabase } from '@/app/supabaseContext'
import { useAuth } from '@/features/auth/authContext'
import { trainingHistoryQueryKey } from '@/features/training/useSaveSession'

function useUserId() {
  const auth = useAuth()
  return auth.status === 'signedIn' ? auth.session.user.id : undefined
}

// Unter dem Verlaufsschlüssel → nach dem Speichern eines Trainings automatisch neu geladen
const listKey = (userId: string | undefined) =>
  [...trainingHistoryQueryKey(userId), 'list'] as const
const detailKey = (userId: string | undefined, id: string) =>
  [...trainingHistoryQueryKey(userId), 'detail', id] as const

/** Alle Trainings seitenweise, neueste zuerst („Mehr laden"). */
export function useSessionList() {
  const supabase = useSupabase()
  const userId = useUserId()
  return useInfiniteQuery({
    queryKey: listKey(userId),
    queryFn: ({ pageParam }) => fetchSessionList(supabase, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length === SESSION_PAGE_SIZE ? lastPage.at(-1)?.startedAt : undefined,
    enabled: userId !== undefined,
  })
}

export function useSessionDetail(id: string) {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: detailKey(userId, id),
    queryFn: () => fetchSessionDetail(supabase, id),
    enabled: userId !== undefined,
  })
}

export function useUpdateSessionNotes(id: string) {
  const supabase = useSupabase()
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notes: string) => updateSessionNotes(supabase, id, notes),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey(userId, id) }),
        queryClient.invalidateQueries({ queryKey: listKey(userId) }),
      ]),
  })
}
