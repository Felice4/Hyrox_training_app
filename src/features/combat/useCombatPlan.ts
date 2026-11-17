import { useCallback, useEffect, useState } from 'react'
import { EMPTY_COMBAT_PLAN, restoreCombatPlan, type CombatPlan } from '@/domain/combat/workout'
import { useAuth } from '@/features/auth/authContext'
import { loadDraft, saveDraft } from '@/lib/localDraft'

function useCombatPlanKey(): string {
  const auth = useAuth()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : 'unbekannt'
  return `hyrox-coach:combat-plan:${userId}`
}

/**
 * Zusammenstellung des Kampfsport-Trainings. Wird lokal gesichert, damit die Auswahl
 * beim Stöbern in der Bibliothek und nach einem Neuladen erhalten bleibt.
 */
export function useCombatPlan() {
  const key = useCombatPlanKey()
  const [plan, setPlan] = useState<CombatPlan>(() =>
    loadDraft(key, EMPTY_COMBAT_PLAN, restoreCombatPlan),
  )
  useEffect(() => saveDraft(key, plan), [key, plan])
  const update = useCallback((change: (plan: CombatPlan) => CombatPlan) => setPlan(change), [])
  return { plan, update }
}
