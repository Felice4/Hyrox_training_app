/** Zufallszahlen-Funktion: liefert Werte in [0, 1). */
export type Random = () => number

/**
 * Deterministischer Zufallsgenerator (mulberry32): gleicher Seed → gleiche Folge.
 * Damit sind generierte Workouts reproduzierbar und testbar.
 */
export function createRandom(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Wählt ein Element gewichtet (Gewichte ≥ 0). Bei Summe 0 gleichverteilt. */
export function weightedPick<T>(
  items: readonly T[],
  weights: readonly number[],
  random: Random,
): T {
  if (items.length === 0) throw new Error('weightedPick: leere Liste')
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0)
  if (total <= 0) return items[Math.floor(random() * items.length)] as T
  let threshold = random() * total
  for (let i = 0; i < items.length; i++) {
    threshold -= Math.max(0, weights[i] ?? 0)
    if (threshold < 0) return items[i] as T
  }
  return items[items.length - 1] as T
}
