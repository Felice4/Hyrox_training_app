/**
 * Diagrammfarben aus den Design-Tokens (src/styles/index.css). Eine Datenreihe trägt die
 * Akzentfarbe; Vergleichswerte (z. B. „geplant") das zurückhaltende Grau.
 * Geprüft gegen die dunkle Fläche #141416 (Kontrast ≥ 3:1, Farbsehschwäche ΔE ≥ 40).
 */
export const CHART = {
  accent: 'var(--color-accent)',
  muted: '#71717a',
  grid: 'var(--color-line)',
  axis: 'var(--color-fg-muted)',
  surface: 'var(--color-surface)',
  cursor: 'rgba(244, 244, 245, 0.06)',
} as const

export const AXIS_TICK = { fill: CHART.axis, fontSize: 12 }

/** Balken: höchstens 24 px breit, oben 4 px abgerundet, unten eckig. */
export const BAR_PROPS = {
  maxBarSize: 24,
  radius: [4, 4, 0, 0] as [number, number, number, number],
  isAnimationActive: false,
}
