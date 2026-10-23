import { createRandom } from '@/domain/random'
import type { Weekday } from '@/domain/profile/vocabulary'
import { generateWorkout } from './generateWorkout'
import type {
  Focus,
  GeneratedWorkout,
  GeneratorExercise,
  GeneratorProfile,
  GoalWeights,
  HistorySession,
  Intensity,
} from './types'

/** Bereits absolviertes Training dieser Woche (lokales Datum). */
export interface DoneTraining {
  date: string
  focus: Focus
}

/**
 * Einheit, die bei der Neuplanung bestehen bleibt (z. B. ausgefallen oder vergangen).
 * Ihr Tag wird nicht neu belegt; sie zählt nicht als absolviert.
 */
export interface KeptPlanned {
  date: string
  focus: Focus
  status: 'planned' | 'skipped'
}

export interface WeekPlanInput {
  /** Montag der Woche, „JJJJ-MM-TT" */
  weekStart: string
  /** Heutiges lokales Datum, „JJJJ-MM-TT" */
  today: string
  trainingDaysPerWeek: number
  /** ISO-Wochentage 1 = Mo … 7 = So */
  preferredWeekdays: readonly number[]
  durationMin: number
  profile: GeneratorProfile
  goals: GoalWeights
  exercises: readonly GeneratorExercise[]
  history: readonly HistorySession[]
  /** Absolvierte Trainings dieser Woche (lokale Daten) – zählen zum Wochenziel */
  done: readonly DoneTraining[]
  /** Bestehen bleibende Einheiten (ausgefallen/vergangen) – nur ihr Tag ist belegt */
  kept: readonly KeptPlanned[]
  seed: number
}

export interface PlannedDay {
  date: string
  focus: Focus
  intensity: Intensity
  durationMin: number
  workout: GeneratedWorkout
}

export interface GeneratedWeekPlan {
  weekStart: string
  days: PlannedDay[]
  explanation: string[]
}

/** Grundverteilung der Schwerpunkte je Anzahl Trainingstage (docs/GENERATOR.md §5). */
const DISTRIBUTION: Record<number, readonly Focus[]> = {
  1: ['mixed'],
  2: ['full_body', 'hyrox'],
  3: ['strength', 'hyrox', 'mixed'],
  4: ['strength', 'endurance', 'full_body', 'hyrox'],
  5: ['strength', 'endurance', 'full_body', 'hyrox', 'recovery'],
  6: ['strength', 'endurance', 'full_body', 'hyrox', 'recovery', 'mixed'],
  7: ['strength', 'endurance', 'full_body', 'hyrox', 'recovery', 'mixed', 'recovery'],
}

/** Beinlastige, fordernde Schwerpunkte – möglichst nicht an Folgetagen. */
const LEG_HEAVY: readonly Focus[] = ['strength', 'hyrox', 'mixed', 'full_body']

/** Ersatz, wenn ein Ziel mit 0 gewichtet ist. */
function applyGoals(focuses: Focus[], goals: GoalWeights): Focus[] {
  return focuses.map((focus) => {
    if (focus === 'hyrox' && goals.hyrox === 0) return goals.strength > 0 ? 'strength' : 'full_body'
    if (focus === 'endurance' && goals.endurance === 0) return 'full_body'
    if (focus === 'strength' && goals.strength === 0 && goals.hypertrophy === 0) return 'mixed'
    return focus
  })
}

const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const weekdayOf = (date: string): Weekday => {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay()
  return (((day + 6) % 7) + 1) as Weekday
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000)

/**
 * Wählt `count` Tage aus den freien Tagen: zuerst bevorzugte Wochentage, dann so,
 * dass die Abstände zwischen allen Trainingstagen möglichst groß sind.
 */
export function chooseDays(
  free: readonly string[],
  count: number,
  preferredWeekdays: readonly number[],
  occupied: readonly string[],
): string[] {
  const chosen: string[] = []
  for (const day of free) {
    if (chosen.length >= count) break
    if (preferredWeekdays.includes(weekdayOf(day))) chosen.push(day)
  }
  while (chosen.length < count) {
    const candidates = free.filter((d) => !chosen.includes(d))
    if (candidates.length === 0) break
    const taken = [...occupied, ...chosen]
    // Größter Mindestabstand zu allen belegten Tagen; bei Gleichstand der frühere Tag
    const best = candidates
      .map((d) => ({
        d,
        gap: taken.length === 0 ? 7 : Math.min(...taken.map((t) => Math.abs(daysBetween(t, d)))),
      }))
      .sort((a, b) => b.gap - a.gap || a.d.localeCompare(b.d))[0]
    if (!best) break
    chosen.push(best.d)
  }
  return chosen.sort()
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()]
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  )
}

/**
 * Ordnet die Schwerpunkte den Tagen zu: beinlastige Einheiten möglichst nicht an
 * Folgetagen (auch nicht direkt nach bereits absolvierten/feststehenden Einheiten).
 */
export function assignFocuses(
  days: readonly string[],
  focuses: readonly Focus[],
  fixedDays: readonly DoneTraining[],
  seed: number,
): Focus[] {
  const random = createRandom(seed)
  const fixed = new Map(fixedDays.map((k) => [k.date, k.focus]))
  const penalty = (order: readonly Focus[]) => {
    const byDate = new Map(fixed)
    days.forEach((d, i) => byDate.set(d, order[i] as Focus))
    let score = 0
    for (const [date, focus] of byDate) {
      const next = byDate.get(addDays(date, 1))
      if (next && LEG_HEAVY.includes(focus) && LEG_HEAVY.includes(next)) score += 3
      if (next && focus === next) score += 1
    }
    return score
  }
  const unique = [...new Map(permutations(focuses).map((p) => [p.join(','), p])).values()]
  const best = Math.min(...unique.map(penalty))
  const optimal = unique.filter((p) => penalty(p) === best)
  return optimal[Math.floor(random() * optimal.length)] ?? [...focuses]
}

/** Intensität je Schwerpunkt; harte Einheiten wechseln mit mittleren. */
function intensityFor(focus: Focus, index: number): Intensity {
  if (focus === 'recovery') return 'easy'
  if (focus === 'endurance') return index % 2 === 0 ? 'moderate' : 'hard'
  return index % 2 === 0 ? 'hard' : 'moderate'
}

/**
 * Erstellt (bzw. ergänzt) den Wochenplan ab heute (docs/GENERATOR.md §5):
 * zählt bereits Erledigtes mit, plant nur freie Tage ab heute und erzeugt je Tag ein Workout.
 */
export function generateWeekPlan(input: WeekPlanInput): GeneratedWeekPlan {
  const explanation: string[] = []
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(input.weekStart, i))
  const startFrom = input.today > input.weekStart ? input.today : input.weekStart

  const target = Math.min(7, Math.max(1, input.trainingDaysPerWeek))
  const doneCount = input.done.length
  const remaining = Math.max(0, target - doneCount)
  if (doneCount > 0) {
    explanation.push(
      `${doneCount} von ${target} Einheiten dieser Woche hast du bereits absolviert.`,
    )
  }
  const occupied = new Set([...input.done.map((d) => d.date), ...input.kept.map((k) => k.date)])

  // Schwerpunkte: Grundverteilung der Woche, bereits Absolviertes abziehen
  const pool = applyGoals([...(DISTRIBUTION[target] ?? DISTRIBUTION[4]!)], input.goals)
  for (const done of input.done) {
    const index = pool.indexOf(done.focus)
    if (index >= 0) pool.splice(index, 1)
  }
  const focuses = pool.slice(0, remaining)
  while (focuses.length < remaining) focuses.push('mixed')

  const free = weekDays.filter((d) => d >= startFrom && !occupied.has(d))
  const days = chooseDays(free, remaining, input.preferredWeekdays, [...occupied])
  if (days.length < remaining) {
    explanation.push(
      `Für ${remaining} Einheiten sind in dieser Woche nur noch ${days.length} freie Tage übrig.`,
    )
  }
  const fixedDays = [
    ...input.done,
    ...input.kept.filter((k) => k.status === 'planned').map(({ date, focus }) => ({ date, focus })),
  ]
  const order = assignFocuses(days, focuses.slice(0, days.length), fixedDays, input.seed)

  const planned: PlannedDay[] = days.map((date, index) => {
    const focus = order[index] as Focus
    const intensity = intensityFor(focus, index)
    const workout = generateWorkout({
      request: { durationMin: input.durationMin, focus, intensity },
      profile: input.profile,
      goals: input.goals,
      exercises: input.exercises,
      history: input.history,
      now: `${date}T12:00:00.000Z`,
      seed: input.seed + index * 7919,
    })
    return { date, focus, intensity, durationMin: input.durationMin, workout }
  })

  if (planned.length > 0) {
    const preferredHits = planned.filter((p) => input.preferredWeekdays.includes(weekdayOf(p.date)))
    if (input.preferredWeekdays.length > 0) {
      explanation.push(
        `${preferredHits.length} von ${planned.length} Einheiten liegen auf deinen bevorzugten Tagen.`,
      )
    }
    explanation.push(
      'Beinlastige Einheiten (Kraft, HYROX, Mixed, Ganzkörper) liegen möglichst nicht an aufeinanderfolgenden Tagen.',
    )
    const hyroxCovered = [...planned, ...input.done].some(
      (p) => p.focus === 'hyrox' || p.focus === 'mixed',
    )
    if (input.goals.hyrox > 0 && !hyroxCovered) {
      explanation.push('Hinweis: In dieser Woche ist keine HYROX-spezifische Einheit mehr möglich.')
    }
  }

  return { weekStart: input.weekStart, days: planned, explanation }
}
