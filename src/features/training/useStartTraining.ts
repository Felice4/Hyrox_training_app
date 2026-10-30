import { useNavigate } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import type { GeneratedWorkout } from '@/domain/generator/types'
import { createSession } from '@/domain/session/session'
import { useTodayCheckin } from '@/features/readiness/useCheckin'
import { toLocalIsoDate } from '@/lib/date'
import { readActiveSession, useActiveSessionKey, writeActiveSession } from './useActiveSession'

/**
 * Startet ein Training aus einem erzeugten Workout und öffnet den Trainingsmodus.
 * Läuft bereits ein Training, wird vorher nachgefragt.
 */
export function useStartTraining(exercises: readonly CatalogExercise[]) {
  const navigate = useNavigate()
  const activeKey = useActiveSessionKey()
  // Check-in von heute wird mit dem Training verknüpft (falls vorhanden)
  const checkin = useTodayCheckin(toLocalIsoDate())

  /** `plannedWorkoutId`: geplante Einheit, die mit dem Speichern als erledigt gilt */
  return (workout: GeneratedWorkout, plannedWorkoutId?: string) => {
    if (
      readActiveSession(activeKey) &&
      !window.confirm('Es läuft bereits ein Training. Dieses verwerfen und neu starten?')
    ) {
      return
    }
    const measurementOf = (slug: string) =>
      exercises.find((e) => e.slug === slug)?.measurement ?? 'reps'
    const session = createSession(
      workout,
      new Date().toISOString(),
      () => crypto.randomUUID(),
      measurementOf,
    )
    writeActiveSession(activeKey, {
      ...session,
      plannedWorkoutId,
      readinessCheckinId: checkin.data?.id,
    })
    void navigate('/training/active')
  }
}
