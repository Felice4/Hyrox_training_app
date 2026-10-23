import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { useProfileDetails } from '@/features/profile/useProfile'
import { useTrainingHistory } from '@/features/training/useTrainingHistory'
import type { PlanningData } from './planning'

type PlanningState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; data: PlanningData; historyFailed: boolean }

/**
 * Lädt Profil, Übungen und Verlauf für die Planung. Fehlt nur der Verlauf, wird ohne ihn
 * geplant (wie beim Generator) – das wird angezeigt.
 */
export function usePlanningData(): PlanningState {
  const details = useProfileDetails()
  const { catalog } = useExerciseCatalog()
  const history = useTrainingHistory()

  if (details.isPending || catalog.isPending || history.isPending) return { status: 'loading' }
  if (details.isError || catalog.isError) {
    return {
      status: 'error',
      retry: () => {
        void details.refetch()
        void catalog.refetch()
      },
    }
  }
  return {
    status: 'ready',
    data: {
      details: details.data,
      exercises: catalog.data.exercises,
      history: history.data ?? [],
    },
    historyFailed: history.isError,
  }
}
