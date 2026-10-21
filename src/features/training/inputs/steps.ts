/** Schrittweite der ±-Tasten für Strecken: grob bei Läufen, fein bei Sled & Co. */
export function distanceIncrement(target: number | undefined): number {
  if (target === undefined) return 10
  if (target >= 1000) return 100
  if (target >= 100) return 10
  return 2.5
}
