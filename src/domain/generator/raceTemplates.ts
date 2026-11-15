import type { HyroxStation } from '@/data/exercises/vocabulary'
import { roundToStep, weightStep } from '@/domain/progression/progression'
import { exerciseTraits as is, type SlotSpec, type Template } from './templates'
import type {
  GeneratedRaceSessionType,
  GeneratorExercise,
  Intensity,
  PlannedSet,
  RaceSessionRequest,
  RaceTeamFormat,
  SlotRole,
} from './types'

/**
 * Vorlagen der Wettkampfvorbereitung (docs/RACE_PREP.md §3 und §5). Sie nutzen dieselben
 * Slots, Dosierung und Zeitanpassung wie die Vorlagen der Schwerpunkte.
 */

/** Im Rennen ist jeder Lauf 1 km lang – Kompromiss-Läufe trainieren genau das. */
export const RACE_RUN_M = 1000

const slot = (
  role: SlotRole,
  block: SlotSpec['block'],
  label: string,
  match: SlotSpec['match'],
  optional = false,
): SlotSpec => ({ role, block, label, match, optional })

/** Die offizielle Station (nicht schwere oder leichte Varianten) – für Wettkampfgewichte. */
const atStation = (station: HyroxStation) => (e: GeneratorExercise) =>
  is.station(e) && e.hyroxStation === station && e.slug.startsWith('hyrox-')

const running = (e: GeneratorExercise) =>
  e.category === 'endurance' && e.movementPattern === 'locomotion'

/** Laufintervalle (z. B. 6 × 1 km) – Strecke je Wiederholung aus der Übung. */
const runInterval = (minM: number, maxM: number) => (e: GeneratorExercise) => {
  const distance = e.loadParams.distanceM
  return (
    running(e) &&
    e.measurement === 'distance_time' &&
    e.loadParams.sets[1] >= 3 &&
    distance !== undefined &&
    distance[0] >= minM &&
    distance[1] <= maxM
  )
}

/** Lockerer Dauerlauf (draußen oder Laufband). */
const steadyRun = (e: GeneratorExercise) =>
  is.steady(e) && running(e) && e.measurement === 'distance_time' && e.difficulty === 1

const strides = (e: GeneratorExercise) =>
  running(e) && e.measurement === 'distance' && e.loadParams.sets[1] >= 4

const warmup = (durationMin: number): SlotSpec[] => [
  slot('warmup_cardio', 'warmup', 'Einlaufen', is.warmupCardio),
  slot('warmup_drill', 'warmup', 'Aktivierung', is.warmupDrill),
  ...(durationMin >= 45
    ? [slot('warmup_drill', 'warmup', 'Mobilisation', is.warmupDrill, true)]
    : []),
]

const cooldown = (durationMin: number): SlotSpec[] => [
  ...(durationMin >= 45
    ? [slot('cooldown_cardio', 'cooldown', 'Auslaufen', is.cooldownCardio, true)]
    : []),
  slot('stretch', 'cooldown', 'Dehnen', is.stretch),
]

/** Rundenzahl des Kompromiss-Laufs: je Runde etwa 1 km plus Station (≈ 9–10 min). */
function compromisedRounds(durationMin: number, team: RaceTeamFormat): number {
  const rounds = Math.max(2, Math.floor((durationMin - 15) / 10))
  // Staffel: je Person 2 × (1 km + Station) – weniger Runden, dafür schneller
  return team === 'relay' ? Math.min(rounds, 3) : rounds
}

/** Pause nach jeder Runde: Staffel lang (Qualität), Doubles kurz (Partner wechseln sich ab). */
const ROUND_REST_SEC: Record<RaceTeamFormat, number> = { single: 90, double: 60, relay: 180 }

const TEAM_NOTES: Record<RaceTeamFormat, string> = {
  single:
    'Singles: Du läufst alle 8 km und machst jede Station allein – Ausdauer unter Ermüdung ist der Schlüssel.',
  double:
    'Doubles: Ihr lauft gemeinsam, die Stationsarbeit wird geteilt. Lauf etwas schneller als im Singles-Tempo und arbeite an den Stationen in kurzen, harten Abschnitten.',
  relay:
    'Staffel: Du läufst 2 × 1 km mit je einer Station – wenig Umfang, dafür nahe am Maximum und mit langen Pausen.',
}

export function buildRaceTemplate(
  type: GeneratedRaceSessionType,
  durationMin: number,
  intensity: Intensity,
  team: RaceTeamFormat,
): Template {
  switch (type) {
    case 'compromised_run': {
      const rounds = compromisedRounds(durationMin, team)
      return {
        description: `Kompromiss-Lauf: 1 km laufen, direkt danach eine Station – Runde für Runde wie im Rennen. Trainiert das Laufen mit müden Beinen. ${TEAM_NOTES[team]}`,
        slots: [
          ...warmup(durationMin),
          slot('run', 'main', 'Lauf 1 km', is.run),
          slot('station', 'main', 'Station mit Gerät', is.bigStation),
          slot(
            'station',
            'main',
            'Station Kraftausdauer',
            (e) => is.station(e) && !is.bigStation(e),
          ),
          ...cooldown(durationMin),
        ],
        extraSlots: [
          slot('conditioning', 'conditioning', 'Wall Balls', atStation('wall_balls'), true),
        ],
        circuit: {
          block: 'main',
          rounds,
          maxRounds: team === 'relay' ? 3 : 8,
          roundRestSec: ROUND_REST_SEC[team],
        },
      }
    }

    case 'run_intervals': {
      // Staffel: kurze, schnelle Abschnitte; sonst 1 km im Renntempo, in kurzen Einheiten
      // (Aufbau, Entlastung, Tapering) auch 400 m
      const [minM, maxM] =
        team === 'relay'
          ? [200, 400]
          : intensity === 'hard' && durationMin >= 45
            ? [1000, 1000]
            : [400, 1000]
      return {
        description:
          team === 'relay'
            ? 'Laufintervalle: kurze, schnelle Abschnitte mit langen Pausen – für das hohe Tempo der Staffel.'
            : team === 'double'
              ? 'Laufintervalle: im Renntempo oder etwas schneller – im Doubles läufst du die ganzen 8 km, aber mit Pausen an den Stationen.'
              : 'Laufintervalle: Abschnitte im Renntempo, dazwischen locker traben oder gehen – so wird das Wettkampftempo vertraut.',
        slots: [
          ...warmup(durationMin),
          // Die Intervalle sind die ganze Einheit; zu viele Wiederholungen kürzt die Zeitanpassung
          { ...slot('interval', 'main', 'Laufintervalle', runInterval(minM, maxM)), maxShare: 1.5 },
          ...cooldown(durationMin),
        ],
        extraSlots: [
          slot('core', 'accessory', 'Rumpf', is.core, true),
          slot('steady', 'main', 'Lockeres Auslaufen', steadyRun, true),
        ],
      }
    }

    case 'easy_run':
      return {
        description:
          'Lockerer Dauerlauf: so ruhig, dass du dich noch unterhalten kannst. Baut die Grundlage für 8 km im Rennen auf.',
        slots: [
          slot('warmup_drill', 'warmup', 'Mobilisation', is.warmupDrill),
          slot('steady', 'main', 'Lockerer Dauerlauf', steadyRun),
          slot('stretch', 'cooldown', 'Dehnen', is.stretch),
        ],
        extraSlots: [slot('mobility', 'accessory', 'Mobility', is.mobility, true)],
      }

    case 'station_strength':
      return {
        description:
          'Stationskraft: Grundkraft für die Beine und die schweren Stationen mit Zielgewichten aus deinem Wettkampf.',
        slots: [
          ...warmup(durationMin),
          slot('strength_main', 'main', 'Kraft Unterkörper', (e) =>
            is.strengthMain(e, ['squat', 'hinge']),
          ),
          slot('station', 'main', 'Sled Push', atStation('sled_push')),
          slot('station', 'main', 'Sled Pull', atStation('sled_pull')),
          slot('station', 'main', 'Sandbag Lunges', atStation('sandbag_lunges')),
          slot('station', 'main', 'Wall Balls', atStation('wall_balls')),
          slot('station', 'main', 'Farmers Carry', atStation('farmers_carry'), true),
          ...cooldown(durationMin),
        ],
        extraSlots: [
          slot('strength_main', 'main', 'Kraft Oberkörper', (e) =>
            is.strengthMain(e, ['pull_horizontal', 'pull_vertical']),
          ),
          slot('core', 'accessory', 'Rumpf', is.core, true),
        ],
      }

    case 'activation':
      return {
        description:
          'Aktivierung: kurz und locker – Beine wach halten, ein paar Steigerungen und Stationsbewegungen, ohne zu ermüden.',
        slots: [
          slot('warmup_cardio', 'warmup', 'Einlaufen', is.warmupCardio),
          slot('warmup_drill', 'warmup', 'Aktivierung', is.warmupDrill),
          slot('interval', 'main', 'Steigerungsläufe', strides),
          slot('station', 'main', 'Wall Balls', atStation('wall_balls'), true),
          slot('stretch', 'cooldown', 'Dehnen', is.stretch),
        ],
        extraSlots: [],
      }
  }
}

/** Gewichtsabstufung: Wall Balls gibt es in 1-kg-Schritten. */
const stepFor = (exercise: GeneratorExercise) =>
  exercise.equipment.includes('wall_ball') ? 1 : weightStep(exercise.equipment)

/**
 * Passt dosierte Sätze an den Wettkampf an: Läufe 1 km, Stationen mit dem Anteil des
 * Wettkampfgewichts. Liefert einen Hinweis zum Gewicht (oder `undefined`).
 */
export function applyRaceDosing(
  exercise: GeneratorExercise,
  role: SlotRole,
  sets: PlannedSet[],
  race: RaceSessionRequest,
): { sets: PlannedSet[]; note?: string | undefined } {
  if (role === 'run' && race.type === 'compromised_run') {
    return { sets: sets.map((set) => ({ ...set, distanceM: RACE_RUN_M })) }
  }
  // Aktivierung: nur ein paar Wiederholungen bzw. Meter, damit nichts ermüdet
  if (race.type === 'activation' && role === 'station') {
    sets = sets.slice(0, 2).map((set) => ({
      ...set,
      reps: set.reps === undefined ? undefined : Math.min(set.reps, 10),
      distanceM: set.distanceM === undefined ? undefined : Math.min(set.distanceM, 25),
    }))
  }
  const station = exercise.hyroxStation
  const raceWeight = station === undefined ? undefined : race.stationWeights[station]
  const weighted =
    exercise.measurement === 'weight_reps' || exercise.measurement === 'weight_distance'
  if (raceWeight === undefined || !weighted) return { sets }
  const weightKg = roundToStep(raceWeight * race.loadShare, stepFor(exercise))
  const share = Math.round(race.loadShare * 100)
  return {
    sets: sets.map((set) => (set.type === 'warmup' ? set : { ...set, weightKg })),
    note:
      share === 100
        ? `Wettkampfgewicht ${formatKg(raceWeight)}`
        : `${share} % vom Wettkampfgewicht (${formatKg(raceWeight)})`,
  }
}

const formatKg = (kg: number) => `${kg.toLocaleString('de-DE')} kg`
