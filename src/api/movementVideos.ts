import type { AppSupabaseClient } from '@/lib/supabase'

/** Privater Speicher-Bucket der Movement-Videos (Migration 0016, docs/MOVEMENT.md §6). */
export const MOVEMENT_VIDEO_BUCKET = 'movement-videos'

/** Lädt ein Video als Datei – nur für angemeldete Nutzer (Policy auf storage.objects). */
export async function downloadMovementVideo(
  supabase: AppSupabaseClient,
  file: string,
): Promise<Blob> {
  const { data, error } = await supabase.storage.from(MOVEMENT_VIDEO_BUCKET).download(file)
  if (error) throw error
  return data
}
