import { createRandom } from '@/domain/random'
import type { Weekday } from '@/domain/profile/vocabulary'
import { generateWorkout } from './generateWorkout'
import { skillsInWorkout } from './skillBlock'
import type {
  Focus,
  GeneratedWorkout,
  GeneratorExercise,
  GeneratorProfile,
  GoalWeights,
  HistorySession,
  Intensity,
  RaceSessionRequest,
  RaceSessionType,
  SkillRequest,
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
  /** Aktive Skill-Ziele – werden über die Woche abwechselnd eingeplant */
  skills?: SkillRequest | undefined
  exercises: readonly GeneratorExercise[]
  history: readonly HistorySession[]
  /** Absolvierte Trainings dieser Woche (lokale Daten) – zählen zum Wochenziel */
  done: readonly DoneTraining[]
  /** Bestehen bleibende Einheiten (ausgefallen/vergangen) – nur ihr Tag ist belegt */
  kept: readonly KeptPlanned[]
  seed: number
  /** Wettkampfmodus: ersetzt die Grundverteilung (docs/RACE_PREP.md §4) */
  race?: RaceWeekInput | undefined
}

/** Eine Einheit des Wettkampfplans (siehe `domain/race/sessions.ts`). */
export interface RaceSessionPlanInput {
  type: RaceSessionType
  focus: Focus
  intensity: Intensity
  durationMin: number
  /** Anfrage an den Generator … */
  raceSession?: RaceSessionRequest | undefined
  /** … oder ein fertiges Workout (Simulation) */
  workout?: GeneratedWorkout | undefined
}

export interface RaceWeekInput {
  /** Einheiten der Woche, wichtigste zuerst */
  sessions: readonly RaceSessionPlanInput[]
  /** Mögliche Wochentage (1 = Mo … 7 = So); leer = alle */
  weekdays: readonly number[]
  /** Spätester Tag, an dem geplant wird (Wettkampfwoche: zwei Tage vor dem Rennen) */
  latestDate?: string | undefined
  /** Erklärung der Woche (Phase, Ziel, Schlüsseleinheit) */
  explanation: readonly string[]
}

export interface PlannedDay {
  date: string
  focus: Focus
  intensity: Intensity
  durationMin: number
  workout: GeneratedWorkout
  /** Einheit des Wettkampfplans */
  raceSessionType?: RaceSessionType | undefined
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
  if (input.race) return generateRaceWeekPlan(input, input.race)
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

  // Skills wechseln sich ab: Was an einem Tag eingeplant ist, gilt danach als „zuletzt geübt"
  const lastPracticed: Record<string, string> = { ...input.skills?.lastPracticed }
  const planned: PlannedDay[] = days.map((date, index) => {
    const focus = order[index] as Focus
    const intensity = intensityFor(focus, index)
    const now = `${date}T12:00:00.000Z`
    const workout = generateWorkout({
      request: { durationMin: input.durationMin, focus, intensity },
      skills: input.skills && { ...input.skills, lastPracticed: { ...lastPracticed } },
      profile: input.profile,
      goals: input.goals,
      exercises: input.exercises,
      history: input.history,
      now,
      seed: input.seed + index * 7919,
    })
    for (const slug of skillsInWorkout(workout)) lastPracticed[slug] = now
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

// -----------------------------------------------------------------------------
// Wettkampfmodus (docs/RACE_PREP.md §4)
// -----------------------------------------------------------------------------

/**
 * Ordnet die Wettkampf-Einheiten den Tagen zu: keine zwei beinlastigen oder zwei harten
 * Einheiten an Folgetagen (auch nicht neben bereits feststehenden).
 */
export function assignRaceSessions(
  days: readonly string[],
  sessions: readonly RaceSessionPlanInput[],
  fixedDays: readonly DoneTraining[],
  seed: number,
): RaceSessionPlanInput[] {
  const random = createRandom(seed)
  const penalty = (order: readonly RaceSessionPlanInput[]) => {
    const byDate = new Map<string, { focus: Focus; hard: boolean; type?: RaceSessionType }>(
      fixedDays.map((d) => [d.date, { focus: d.focus, hard: false }]),
    )
    days.forEach((d, i) => {
      const s = order[i] as RaceSessionPlanInput
      byDate.set(d, { focus: s.focus, hard: s.intensity === 'hard', type: s.type })
    })
    let score = 0
    for (const [date, a] of byDate) {
      const b = byDate.get(addDays(date, 1))
      if (!b) continue
      if (LEG_HEAVY.includes(a.focus) && LEG_HEAVY.includes(b.focus)) score += 3
      if (a.hard && b.hard) score += 2
      if (a.type !== undefined && a.type === b.type) score += 1
    }
    return score
  }
  const orders = permutations(sessions)
  const best = Math.min(...orders.map(penalty))
  const optimal = orders.filter((o) => penalty(o) === best)
  return optimal[Math.floor(random() * optimal.length)] ?? [...sessions]
}

function generateRaceWeekPlan(input: WeekPlanInput, race: RaceWeekInput): GeneratedWeekPlan {
  const explanation = [...race.explanation]
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(input.weekStart, i))
  const startFrom = input.today > input.weekStart ? input.today : input.weekStart

  // Erledigtes und feststehende Einheiten ab heute (z. B. Trainer-Termine) ersetzen
  // die Einheit mit demselben Schwerpunkt – ein HYROX-Termin also den Kompromiss-Lauf.
  const fixedAhead = input.kept.filter((k) => k.status === 'planned' && k.date >= startFrom)
  const remaining = [...race.sessions]
  let covered = 0
  for (const entry of [...input.done, ...fixedAhead]) {
    const index = remaining.findIndex((s) => s.focus === entry.focus)
    if (index < 0) continue
    remaining.splice(index, 1)
    covered += 1
  }
  if (covered > 0) {
    explanation.push(
      `${covered} Einheit(en) dieser Woche sind schon absolviert oder eingetragen und ersetzen eine Einheit des Plans.`,
    )
  }

  const occupied = new Set([...input.done.map((d) => d.date), ...input.kept.map((k) => k.date)])
  const free = weekDays.filter(
    (d) =>
      d >= startFrom &&
      !occupied.has(d) &&
      (race.latestDate === undefined || d <= race.latestDate) &&
      (race.weekdays.length === 0 || race.weekdays.includes(weekdayOf(d))),
  )
  const days = chooseDays(free, remaining.length, race.weekdays, [...occupied])
  const chosen = remaining.slice(0, days.length)
  if (chosen.length < remaining.length) {
    explanation.push(
      `Nicht genug freie Trainingstage – ${remaining.length - chosen.length} Einheit(en) mit geringerer Priorität entfallen diese Woche.`,
    )
  }
  const fixedDays = [
    ...input.done,
    ...input.kept.filter((k) => k.status === 'planned').map(({ date, focus }) => ({ date, focus })),
  ]
  const order = assignRaceSessions(days, chosen, fixedDays, input.seed)

  const lastPracticed: Record<string, string> = { ...input.skills?.lastPracticed }
  const planned: PlannedDay[] = days.map((date, index) => {
    const session = order[index] as RaceSessionPlanInput
    const now = `${date}T12:00:00.000Z`
    const workout =
      session.workout ??
      generateWorkout({
        request: {
          durationMin: session.durationMin,
          focus: session.focus,
          intensity: session.intensity,
          raceSession: session.raceSession,
        },
        skills: input.skills && { ...input.skills, lastPracticed: { ...lastPracticed } },
        profile: input.profile,
        goals: input.goals,
        exercises: input.exercises,
        history: input.history,
        now,
        seed: input.seed + index * 7919,
      })
    for (const slug of skillsInWorkout(workout)) lastPracticed[slug] = now
    return {
      date,
      focus: session.focus,
      intensity: session.intensity,
      durationMin: session.durationMin,
      workout,
      raceSessionType: session.type,
    }
  })

  if (planned.length > 0) {
    explanation.push(
      'Beinlastige oder harte Einheiten liegen möglichst nicht an aufeinanderfolgenden Tagen.',
    )
  }
  return { weekStart: input.weekStart, days: planned, explanation }
}
