import type {
  Focus,
  GeneratedWorkout,
  Intensity,
  RaceSessionRequest,
  RaceSessionType,
} from '@/domain/generator/types'
import type { RaceSessionPlanInput, RaceWeekInput } from '@/domain/generator/weekPlan'
import { addDays } from '@/lib/date'
import { STATIONS, type Division, type SimulationFormat } from '@/domain/simulation/formats'
import { buildSimulationWorkout } from '@/domain/simulation/simulation'
import {
  PHASE_GOALS,
  PHASE_LABELS,
  raceTimeline,
  raceWeekOf,
  type RacePhase,
  type RaceWeek,
} from './phases'
import { targetPlan } from './estimate'
import type { Race } from './race'
import { weightSets, type RaceVariant } from './variant'

/**
 * Wochenplan im Wettkampfmodus (docs/RACE_PREP.md §3–5): welche Einheiten in welcher
 * Phase, wie lang, wie intensiv und mit welchem Anteil des Wettkampfgewichts.
 */

export const RACE_SESSION_LABELS: Record<RaceSessionType, string> = {
  compromised_run: 'Kompromiss-Lauf',
  run_intervals: 'Laufintervalle',
  easy_run: 'Lockerer Dauerlauf',
  station_strength: 'Stationskraft',
  simulation: 'Simulation',
  activation: 'Aktivierung',
}

/** Schwerpunkt für Kalender, Belastung und Statistik. */
export const RACE_SESSION_FOCUS: Record<RaceSessionType, Focus> = {
  compromised_run: 'hyrox',
  run_intervals: 'endurance',
  easy_run: 'endurance',
  station_strength: 'strength',
  simulation: 'hyrox',
  activation: 'recovery',
}

/** Anteil des Wettkampfgewichts je Phase. */
const LOAD_SHARE: Record<RacePhase, number> = {
  base: 0.8,
  build: 1,
  deload: 0.7,
  taper: 0.8,
  race: 0.6,
  recovery: 0.6,
}
/** Pro: schwere Stationskraft bis 110 % des Wettkampfgewichts. */
const PRO_STRENGTH_SHARE = 1.1

/** Reihenfolge der Simulationen in der spezifischen Phase. */
const SIMULATION_ORDER: readonly SimulationFormat[] = ['short', 'half_1', 'half_2', 'full']

/** Woche im Plan mit den Zählern, die Umfang und Simulation bestimmen. */
export interface RaceWeekContext {
  week: RaceWeek
  /** Woche innerhalb der Phase (1-basiert) */
  phaseWeek: number
  /** Belastungswoche (Aufbau/Spezifisch) seit Planbeginn – für die Steigerung des Laufumfangs */
  loadWeek: number
  /** Simulationen in früheren Wochen */
  simulationsBefore: number
}

const isSimulationWeek = (phase: RacePhase, phaseWeek: number) =>
  phase === 'build' && phaseWeek % 2 === 0

/** Erste Woche des Plans – Einstiegstest (nur wenn danach noch Zeit zum Trainieren bleibt). */
const isEntryTestWeek = (ctx: { week: RaceWeek }) =>
  ctx.week.number === 1 && (ctx.week.phase === 'base' || ctx.week.phase === 'build')

export function raceWeekContext(
  timeline: readonly RaceWeek[],
  weekStart: string,
): RaceWeekContext | undefined {
  const week = raceWeekOf(timeline, weekStart)
  if (!week) return undefined
  const before = timeline.filter((w) => w.weekStart < week.weekStart)
  let simulationsBefore = 0
  let buildWeeks = 0
  for (const w of before) {
    if (w.phase !== 'build') continue
    buildWeeks += 1
    if (isSimulationWeek('build', buildWeeks)) simulationsBefore += 1
  }
  return {
    week,
    phaseWeek: before.filter((w) => w.phase === week.phase).length + 1,
    loadWeek:
      before.filter((w) => w.phase === 'base' || w.phase === 'build').length +
      (week.phase === 'base' || week.phase === 'build' ? 1 : 0),
    simulationsBefore,
  }
}

/** Auf 5 Minuten runden, mindestens `min`. */
const minutes = (value: number, min = 25) => Math.max(min, Math.round(value / 5) * 5)

/** Lockerer Dauerlauf: 30 min, je Belastungswoche rund 10 % länger, höchstens 60 min. */
export function easyRunMinutes(loadWeek: number): number {
  return Math.min(60, minutes(30 * 1.1 ** Math.max(0, loadWeek - 1), 30))
}

/** Einheit des Plans, bevor Gewichte und Workout dazukommen. */
export interface RaceSessionPlan {
  type: RaceSessionType
  intensity: Intensity
  durationMin: number
  loadShare: number
  /** Nur bei der Simulation */
  simulationFormat?: SimulationFormat | undefined
}

interface PlanRace extends RaceVariant {
  daysPerWeek: number
}

/**
 * Einheiten einer Woche in der Reihenfolge ihrer Wichtigkeit (passen nicht alle in die
 * Woche, fallen die letzten weg). `baseDurationMin`: übliche Trainingsdauer aus dem Profil.
 */
export function raceWeekSessions(
  ctx: RaceWeekContext,
  race: PlanRace,
  baseDurationMin: number,
): RaceSessionPlan[] {
  const { phase } = ctx.week
  const base = Math.min(90, Math.max(40, baseDurationMin))
  const share = LOAD_SHARE[phase]
  const days = Math.min(5, Math.max(3, race.daysPerWeek))
  const pro = race.category === 'pro'
  const session = (
    type: RaceSessionType,
    intensity: Intensity,
    durationMin: number,
    loadShare = share,
  ): RaceSessionPlan => ({ type, intensity, durationMin, loadShare })

  const compromisedMin = race.format === 'relay' ? Math.min(base, 50) : base
  const intervalMin = Math.min(70, minutes(base * 0.85, 35))

  switch (phase) {
    case 'base':
    case 'build': {
      const hard = phase === 'build'
      // Doubles und Staffel laufen schneller → Intervalle schon im Aufbau hart
      const intervalIntensity: Intensity = hard || race.format !== 'single' ? 'hard' : 'moderate'
      // Woche 1: Einstiegstest mit der Simulation „Kurz“ (docs/RACE_PREP.md §6)
      const entryTest = isEntryTestWeek(ctx)
      const simulation = entryTest || isSimulationWeek(phase, ctx.phaseWeek)
      const simulationFormat =
        race.format === 'relay' || entryTest
          ? 'short'
          : (SIMULATION_ORDER[Math.min(ctx.simulationsBefore, SIMULATION_ORDER.length - 1)] ??
            'short')
      const key: RaceSessionPlan = simulation
        ? { ...session('simulation', 'hard', base), simulationFormat }
        : session('compromised_run', hard ? 'hard' : 'moderate', compromisedMin)
      const strength = session(
        'station_strength',
        hard ? 'hard' : 'moderate',
        base,
        pro && hard ? PRO_STRENGTH_SHARE : share,
      )
      const intervals = session('run_intervals', intervalIntensity, intervalMin)
      const easy = session('easy_run', 'easy', easyRunMinutes(ctx.loadWeek))
      // Wichtigste Einheit zuerst: Pro → Kraft, Staffel → Tempo, sonst Laufen unter Vorbelastung
      const core = pro
        ? [strength, key, intervals]
        : race.format === 'relay'
          ? [intervals, key, strength]
          : [key, strength, intervals]
      const fifth = pro
        ? session('station_strength', 'moderate', base, share)
        : race.format === 'relay'
          ? session('run_intervals', 'moderate', intervalMin)
          : session('easy_run', 'easy', minutes(easyRunMinutes(ctx.loadWeek) * 0.75, 30))
      return [...core, easy, fifth].slice(0, days)
    }

    case 'deload':
      // Dieselben Typen, rund 30–40 % kürzer, höchstens mittel; kein zusätzlicher Lauf
      return [
        session('compromised_run', 'moderate', minutes(compromisedMin * 0.7)),
        session('station_strength', 'moderate', minutes(base * 0.7)),
        session('run_intervals', 'moderate', minutes(intervalMin * 0.7)),
      ]

    case 'taper':
      return [
        session('compromised_run', 'hard', minutes(compromisedMin * 0.6)),
        session('run_intervals', 'hard', minutes(intervalMin * 0.6)),
        session('station_strength', 'easy', minutes(base * 0.6)),
      ]

    case 'race':
      return [session('activation', 'easy', 25), session('activation', 'easy', 25)].slice(
        0,
        Math.min(2, days),
      )

    case 'recovery':
      return [session('easy_run', 'easy', 30), session('easy_run', 'easy', 30)]
  }
}

/**
 * Division, mit deren Gewichten trainiert wird. In der Mixed-Staffel hat jede Person
 * die Gewichte ihrer Wertung – hier nach dem Geschlecht im Profil.
 */
export function trainingDivision(variant: RaceVariant, sex?: string | null): Division {
  const sets = weightSets(variant)
  const women = sets.find((s) => s.division.endsWith('_women'))
  if (sets.length > 1 && sex === 'female' && women) return women.division
  return sets[0]?.division ?? 'open_men'
}

/** Wettkampfgewichte je Station für eine Division. */
export function stationWeights(division: Division): RaceSessionRequest['stationWeights'] {
  return Object.fromEntries(
    STATIONS.flatMap((s) => (s.weightKg ? [[s.station, s.weightKg[division]]] : [])),
  )
}

/** Renntempo je km aus der Zielzeit – `undefined` ohne Zielzeit. */
export function racePace(race: Pick<Race, 'targetTimeSec' | 'format'>): number | undefined {
  return race.targetTimeSec === null
    ? undefined
    : targetPlan(race.targetTimeSec, race.format).paceSecPerKm
}

/** Anfrage an den Generator für eine Einheit (nicht für die Simulation). */
export function raceSessionRequest(
  plan: RaceSessionPlan,
  variant: RaceVariant,
  division: Division,
  racePaceSecPerKm?: number,
): RaceSessionRequest | undefined {
  if (plan.type === 'simulation') return undefined
  return {
    type: plan.type,
    team: variant.format,
    stationWeights: stationWeights(division),
    loadShare: plan.loadShare,
    racePaceSecPerKm,
  }
}

/** Simulation als fertiges Workout mit Wettkampfgewichten. */
export function raceSimulationWorkout(
  format: SimulationFormat,
  division: Division,
  seed: number,
  racePaceSecPerKm?: number,
): GeneratedWorkout {
  const workout = buildSimulationWorkout(format, division, seed)
  return {
    ...workout,
    explanation: [
      ...workout.explanation,
      'Schlüsseleinheit der Woche: Wie läuft es mit Renntempo und Wettkampfgewichten? Für die Rennuhr mit Zwischenzeiten starte sie unter Training → HYROX-Simulation.',
      ...(racePaceSecPerKm === undefined
        ? []
        : [
            `Renntempo laut Zielzeit: ${clock(racePaceSecPerKm)} min/km (inkl. Roxzone etwas langsamer).`,
          ]),
    ],
  }
}

const clock = (sec: number) => {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Ein Satz zur Woche („Warum diese Woche?“). */
function weekExplanation(ctx: RaceWeekContext, sessions: readonly RaceSessionPlan[]): string[] {
  const { week } = ctx
  const head =
    week.number === null
      ? `Wettkampfmodus · ${PHASE_LABELS[week.phase]} nach dem Wettkampf.`
      : `Wettkampfmodus · ${PHASE_LABELS[week.phase]} · Woche ${week.number} von ${week.total}.`
  const lines = [head, PHASE_GOALS[week.phase]]
  const key = sessions[0]
  if (key && week.phase !== 'race' && week.phase !== 'recovery') {
    lines.push(`Schlüsseleinheit: ${RACE_SESSION_LABELS[key.type]}.`)
  }
  if (isEntryTestWeek(ctx)) {
    lines.push(
      'Einstiegstest: Die Simulation „Kurz“ und an einem anderen Tag ein 1-km-Lauftest (Wettkampf-Seite). Daraus schätzt die App deine Zielzeit.',
    )
  } else if (sessions.some((s) => s.type === 'simulation')) {
    lines.push('Diese Woche ersetzt eine Simulation den Kompromiss-Lauf.')
  }
  const share = sessions.find((s) => s.type === 'station_strength')?.loadShare
  if (share !== undefined) {
    lines.push(`Stationen mit ${Math.round(share * 100)} % des Wettkampfgewichts.`)
  }
  return lines
}

/**
 * Eingabe für den Wochenplan im Wettkampfmodus – `undefined`, wenn die Woche nicht zum
 * Plan gehört (dann wird normal geplant).
 */
export function raceWeekPlanInput(
  race: Race,
  weekStart: string,
  options: { baseDurationMin: number; sex?: string | null; seed: number },
): RaceWeekInput | undefined {
  const ctx = raceWeekContext(raceTimeline(race), weekStart)
  if (!ctx) return undefined
  const division = trainingDivision(race, options.sex)
  const pace = racePace(race)
  const plans = raceWeekSessions(ctx, race, options.baseDurationMin)
  const sessions = plans.map((plan): RaceSessionPlanInput => {
    const workout =
      plan.type === 'simulation'
        ? raceSimulationWorkout(plan.simulationFormat ?? 'short', division, options.seed, pace)
        : undefined
    return {
      type: plan.type,
      focus: RACE_SESSION_FOCUS[plan.type],
      intensity: plan.intensity,
      durationMin: workout?.targetDurationMin ?? plan.durationMin,
      raceSession: raceSessionRequest(plan, race, division, pace),
      workout,
    }
  })
  return {
    sessions,
    weekdays: race.weekdays,
    // Wettkampfwoche: Am Tag vor dem Rennen und danach wird nichts geplant
    latestDate: ctx.week.phase === 'race' ? addDays(race.raceDate, -2) : undefined,
    explanation: weekExplanation(ctx, plans),
  }
}

/**
 * Neu-Erzeugen einer geplanten Wettkampf-Einheit an `date` – mit Phase, Gewichten und
 * Simulationsformat wie im Plan. `undefined` außerhalb des Plans.
 */
export function raceSessionForDate(
  race: Race,
  type: RaceSessionType,
  date: string,
  options: { sex?: string | null; seed: number },
): Pick<RaceSessionPlanInput, 'raceSession' | 'workout'> | undefined {
  const ctx = raceWeekContext(raceTimeline(race), date)
  if (!ctx) return undefined
  const division = trainingDivision(race, options.sex)
  const pace = racePace(race)
  const plan = raceWeekSessions(ctx, race, 60).find((p) => p.type === type)
  if (type === 'simulation') {
    return {
      workout: raceSimulationWorkout(
        plan?.simulationFormat ?? 'short',
        division,
        options.seed,
        pace,
      ),
    }
  }
  const raceSession = raceSessionRequest(
    plan ?? { type, intensity: 'moderate', durationMin: 60, loadShare: LOAD_SHARE[ctx.week.phase] },
    race,
    division,
    pace,
  )
  return { raceSession }
}
