import type { MilestoneArea, MilestoneMetric } from '@/data/skills'
import { parseArea, parseMetric, type UserMilestone } from '@/domain/skills/milestones'
import type { AppSupabaseClient } from '@/lib/supabase'
import type { Json } from '@/types/database'

/** Eigene Meilensteine und Änderungen an Standard-Meilensteinen. */
export async function fetchUserMilestones(supabase: AppSupabaseClient): Promise<UserMilestone[]> {
  const { data, error } = await supabase
    .from('user_milestones')
    .select('id, builtin_slug, name, area, metric, hidden, counted_from, manual_value, manual_at')
    .order('created_at')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    builtinSlug: row.builtin_slug,
    name: row.name,
    area: parseArea(row.area),
    metric: parseMetric(row.metric),
    hidden: row.hidden,
    countedFrom: row.counted_from,
    manual:
      row.manual_value !== null && row.manual_at !== null
        ? { value: Number(row.manual_value), at: row.manual_at }
        : null,
  }))
}

/** Änderbare Felder; nur übergebene Felder werden geändert. */
export interface MilestonePatch {
  name?: string | null
  metric?: MilestoneMetric | null
  hidden?: boolean
  countedFrom?: string | null
  manual?: { value: number; at: string } | null
}

function toColumns(patch: MilestonePatch) {
  return {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.metric !== undefined && { metric: patch.metric as Json }),
    ...(patch.hidden !== undefined && { hidden: patch.hidden }),
    ...(patch.countedFrom !== undefined && { counted_from: patch.countedFrom }),
    ...(patch.manual !== undefined && {
      manual_value: patch.manual?.value ?? null,
      manual_at: patch.manual?.at ?? null,
    }),
  }
}

/** Ändert einen Standard-Meilenstein (legt die Zeile beim ersten Mal an). */
export async function saveBuiltinMilestone(
  supabase: AppSupabaseClient,
  builtinSlug: string,
  patch: MilestonePatch,
): Promise<void> {
  const { error } = await supabase
    .from('user_milestones')
    .upsert(
      { builtin_slug: builtinSlug, ...toColumns(patch) },
      { onConflict: 'user_id,builtin_slug' },
    )
  if (error) throw error
}

export interface CustomMilestoneInput {
  /** ID vom Client – erneutes Speichern legt nichts doppelt an */
  id: string
  name: string
  area: MilestoneArea
  metric: MilestoneMetric
}

/** Legt einen eigenen Meilenstein an bzw. ändert Name, Bereich und Messung. */
export async function saveCustomMilestone(
  supabase: AppSupabaseClient,
  input: CustomMilestoneInput,
): Promise<void> {
  const { error } = await supabase.from('user_milestones').upsert({
    id: input.id,
    name: input.name,
    area: input.area,
    metric: input.metric as Json,
  })
  if (error) throw error
}

/** Ändert Ausblenden, „neu zählen" oder Hand-Eintrag eines eigenen Meilensteins. */
export async function updateCustomMilestone(
  supabase: AppSupabaseClient,
  id: string,
  patch: MilestonePatch,
): Promise<void> {
  const { error } = await supabase.from('user_milestones').update(toColumns(patch)).eq('id', id)
  if (error) throw error
}

/** Löscht einen eigenen Meilenstein. */
export async function deleteCustomMilestone(supabase: AppSupabaseClient, id: string) {
  const { error } = await supabase
    .from('user_milestones')
    .delete()
    .eq('id', id)
    .is('builtin_slug', null)
  if (error) throw error
}
