import {
  SKILL_GOAL_STATUSES,
  STAGE_SOURCES,
  type ProgressUpdate,
  type SkillGoal,
  type StageLogEntry,
  type StageSource,
} from '@/domain/skills/goals'
import type { AppSupabaseClient } from '@/lib/supabase'

export interface SkillGoalsData {
  goals: SkillGoal[]
  log: StageLogEntry[]
}

const oneOf = <T extends string>(values: readonly T[], value: string): value is T =>
  (values as readonly string[]).includes(value)

/** Gewählte Skill-Ziele und der Verlauf der geschafften Stufen. */
export async function fetchSkillGoals(supabase: AppSupabaseClient): Promise<SkillGoalsData> {
  const [goals, log] = await Promise.all([
    supabase
      .from('skill_goals')
      .select('skill_slug, status, completed_stages, activated_at, achieved_at')
      .order('activated_at', { ascending: true, nullsFirst: false }),
    supabase
      .from('skill_stage_log')
      .select('skill_slug, stage, achieved_at, source')
      .order('achieved_at', { ascending: true }),
  ])
  if (goals.error) throw goals.error
  if (log.error) throw log.error

  return {
    goals: (goals.data ?? []).flatMap((row) =>
      oneOf(SKILL_GOAL_STATUSES, row.status)
        ? [
            {
              skillSlug: row.skill_slug,
              status: row.status,
              completedStages: row.completed_stages,
              activatedAt: row.activated_at,
              achievedAt: row.achieved_at,
            },
          ]
        : [],
    ),
    log: (log.data ?? []).flatMap((row) =>
      oneOf(STAGE_SOURCES, row.source)
        ? [
            {
              skillSlug: row.skill_slug,
              stage: row.stage,
              achievedAt: row.achieved_at,
              source: row.source,
            },
          ]
        : [],
    ),
  }
}

/**
 * Setzt Status und geschaffte Stufen (legt das Ziel bei Bedarf an). Atomar in der
 * Datenbank; der Stufenverlauf wird nachgeführt. Wiederholen ist unschädlich.
 */
export async function setSkillProgress(
  supabase: AppSupabaseClient,
  skillSlug: string,
  update: ProgressUpdate,
  source: StageSource,
): Promise<void> {
  const { error } = await supabase.rpc('set_skill_progress', {
    p_skill_slug: skillSlug,
    p_status: update.status,
    p_completed_stages: update.completedStages,
    p_source: source,
  })
  if (error) throw error
}

/** Entfernt ein Ziel samt Stufenverlauf. */
export async function deleteSkillGoal(supabase: AppSupabaseClient, skillSlug: string) {
  const { error } = await supabase.from('skill_goals').delete().eq('skill_slug', skillSlug)
  if (error) throw error
}
