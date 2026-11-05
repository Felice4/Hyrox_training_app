import { useMemo } from 'react'
import { MILESTONE_LIBRARY } from '@/data/skills'
import {
  resolveMilestones,
  type MilestoneData,
  type ResolvedMilestone,
} from '@/domain/skills/milestones'
import { useProfileDetails } from '@/features/profile/useProfile'
import { useTrainingHistory } from '@/features/training/useTrainingHistory'
import { useUserMilestones } from './useUserMilestones'

/**
 * Alles, was die Meilensteine brauchen: Bestleistungen, Verlauf, Gewicht, HYROX-Zeit
 * sowie eigene Meilensteine und Änderungen.
 */
export function useMilestoneData() {
  const details = useProfileDetails()
  const history = useTrainingHistory()
  const userMilestones = useUserMilestones()

  const data = useMemo<MilestoneData | undefined>(() => {
    if (!details.data || !history.data) return undefined
    return {
      records: details.data.records,
      history: history.data,
      bodyWeightKg: details.data.latestWeight?.value ?? null,
      hyroxBestTimeSec: details.data.profile?.hyrox_best_time_sec ?? null,
    }
  }, [details.data, history.data])

  const milestones = useMemo<ResolvedMilestone[] | undefined>(
    () =>
      userMilestones.data ? resolveMilestones(MILESTONE_LIBRARY, userMilestones.data) : undefined,
    [userMilestones.data],
  )

  return {
    data,
    milestones,
    isPending: details.isPending || history.isPending || userMilestones.isPending,
    isError: details.isError || history.isError || userMilestones.isError,
    refetch: () => {
      void details.refetch()
      void history.refetch()
      void userMilestones.refetch()
    },
  }
}
