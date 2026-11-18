/**
 * Videos des Movement Lab (docs/MOVEMENT.md §5): Slug der Übung → Datei im privaten
 * Speicher. Videos werden nur vom Entwickler eingetragen, nie in der App hochgeladen.
 */
export const MOVEMENT_VIDEOS: Readonly<Record<string, string>> = {}

export function hasMovementVideo(slug: string): boolean {
  return slug in MOVEMENT_VIDEOS
}
