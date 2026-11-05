import { useMemo } from 'react'
import type { MilestoneData } from '@/domain/skills/milestones'
import { useProfileDetails } from '@/features/profile/useProfile'
import { useTrainingHistory } from '@/features/training/useTrainingHistory'

/** Alles, was die Meilensteine brauchen: Bestleistungen, Verlauf, Gewicht, HYROX-Zeit. */
export function useMilestoneData() {
  const details = useProfileDetails()
  const history = useTrainingHistory()

  const data = useMemo<MilestoneData | undefined>(() => {
    if (!details.data || !history.data) return undefined
    return {
      records: details.data.records,
      history: history.data,
      bodyWeightKg: details.data.latestWeight?.value ?? null,
      hyroxBestTimeSec: details.data.profile?.hyrox_best_time_sec ?? null,
    }
  }, [details.data, history.data])

  return {
    data,
    isPending: details.isPending || history.isPending,
    isError: details.isError || history.isError,
    refetch: () => {
      void details.refetch()
      void history.refetch()
    },
  }
}
