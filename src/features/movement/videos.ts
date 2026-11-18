/**
 * Videos des Movement Lab (docs/MOVEMENT.md §6): Slug der Übung → Datei im privaten
 * Bucket „movement-videos". Videos trägt nur der Entwickler ein, nie die App.
 *
 * Neues Video: komprimieren (§6), mit der Supabase-CLI hochladen und hier eintragen.
 * Dateiname = Slug + Version, z. B. 'movement-hip-switch-1.mp4'. Für ein neues Video
 * derselben Übung die Version erhöhen – so lädt das Handy die neue Fassung statt der
 * gespeicherten.
 */
export const MOVEMENT_VIDEOS: Readonly<Record<string, string>> = {}

export function movementVideoFile(slug: string): string | undefined {
  return Object.hasOwn(MOVEMENT_VIDEOS, slug) ? MOVEMENT_VIDEOS[slug] : undefined
}

export function hasMovementVideo(slug: string): boolean {
  return movementVideoFile(slug) !== undefined
}
