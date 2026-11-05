import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteCustomMilestone,
  fetchUserMilestones,
  saveBuiltinMilestone,
  saveCustomMilestone,
  updateCustomMilestone,
  type CustomMilestoneInput,
  type MilestonePatch,
} from '@/api/userMilestones'
import { useSupabase } from '@/app/supabaseContext'
import type { ResolvedMilestone } from '@/domain/skills/milestones'
import { useAuth } from '@/features/auth/authContext'

const userMilestonesKey = (userId: string | undefined) => ['user-milestones', userId] as const

function useUserId() {
  const auth = useAuth()
  return auth.status === 'signedIn' ? auth.session.user.id : undefined
}

export function useUserMilestones() {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: userMilestonesKey(userId),
    queryFn: () => fetchUserMilestones(supabase),
    enabled: userId !== undefined,
  })
}

function useInvalidate() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: userMilestonesKey(userId) })
}

/** Ändert einen Meilenstein – Standard (über den Slug) oder eigener (über die ID). */
export function usePatchMilestone() {
  const supabase = useSupabase()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ milestone, patch }: { milestone: ResolvedMilestone; patch: MilestonePatch }) =>
      milestone.builtin
        ? saveBuiltinMilestone(supabase, milestone.key, patch)
        : updateCustomMilestone(supabase, milestone.key, patch),
    onSettled: invalidate,
  })
}

export function useSaveCustomMilestone() {
  const supabase = useSupabase()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: CustomMilestoneInput) => saveCustomMilestone(supabase, input),
    onSettled: invalidate,
  })
}

export function useDeleteCustomMilestone() {
  const supabase = useSupabase()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => deleteCustomMilestone(supabase, id),
    onSettled: invalidate,
  })
}
