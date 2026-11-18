import { useCallback, useEffect, useState } from 'react'
import {
  EMPTY_MOVEMENT_PLAN,
  restoreMovementPlan,
  type MovementPlan,
} from '@/domain/movement/session'
import { useAuth } from '@/features/auth/authContext'
import { loadDraft, saveDraft } from '@/lib/localDraft'

function useMovementPlanKey(): string {
  const auth = useAuth()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : 'unbekannt'
  return `hyrox-coach:movement-plan:${userId}`
}

/**
 * Zusammenstellung der Mobility-Einheit. Wird lokal gesichert, damit die Auswahl beim
 * Stöbern im Movement Lab und nach einem Neuladen erhalten bleibt.
 */
export function useMovementPlan() {
  const key = useMovementPlanKey()
  const [plan, setPlan] = useState<MovementPlan>(() =>
    loadDraft(key, EMPTY_MOVEMENT_PLAN, restoreMovementPlan),
  )
  useEffect(() => saveDraft(key, plan), [key, plan])
  const update = useCallback((change: (plan: MovementPlan) => MovementPlan) => setPlan(change), [])
  return { plan, update }
}
