import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteSkillGoal, fetchSkillGoals, setSkillProgress } from '@/api/skillGoals'
import { useSupabase } from '@/app/supabaseContext'
import type { ProgressUpdate, StageSource } from '@/domain/skills/goals'
import { useAuth } from '@/features/auth/authContext'

const skillGoalsKey = (userId: string | undefined) => ['skill-goals', userId] as const

function useUserId() {
  const auth = useAuth()
  return auth.status === 'signedIn' ? auth.session.user.id : undefined
}

export function useSkillGoals() {
  const supabase = useSupabase()
  const userId = useUserId()
  return useQuery({
    queryKey: skillGoalsKey(userId),
    queryFn: () => fetchSkillGoals(supabase),
    enabled: userId !== undefined,
  })
}

export interface SkillProgressInput {
  skillSlug: string
  update: ProgressUpdate
  source: StageSource
  sessionId?: string
}

export function useSetSkillProgress() {
  const supabase = useSupabase()
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ skillSlug, update, source, sessionId }: SkillProgressInput) =>
      setSkillProgress(supabase, skillSlug, update, source, sessionId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: skillGoalsKey(userId) }),
  })
}

export function useDeleteSkillGoal() {
  const supabase = useSupabase()
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (skillSlug: string) => deleteSkillGoal(supabase, skillSlug),
    onSettled: () => queryClient.invalidateQueries({ queryKey: skillGoalsKey(userId) }),
  })
}
