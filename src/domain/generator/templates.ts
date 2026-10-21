import type { MovementPattern, MuscleGroup } from '@/data/exercises/vocabulary'
import type { BlockType, Focus, GeneratorExercise, Intensity, SlotRole } from './types'

/** Bereits gewählte Übungen – manche Slots richten sich danach (z. B. Push nach Pull). */
export interface SlotContext {
  chosen: readonly GeneratorExercise[]
}

export interface SlotSpec {
  role: SlotRole
  block: BlockType
  /** Beschreibung für die Erklärung, z. B. „Kraft Unterkörper" */
  label: string
  match: (exercise: GeneratorExercise, ctx: SlotContext) => boolean
  /** Darf gestrichen werden, wenn die Zeit knapp ist */
  optional: boolean
}

export interface Template {
  /** Ein Satz zum Aufbau – Teil der Erklärung */
  description: string
  slots: SlotSpec[]
  /** Zusätzliche Slots, falls die Zeit für die Grundvorlage zu kurz ist */
  extraSlots: SlotSpec[]
  /** Block, der als Zirkel (Runden) absolviert wird */
  circuit?: { block: BlockType; rounds: number; maxRounds: number }
}

// -----------------------------------------------------------------------------
// Merkmale von Übungen
// -----------------------------------------------------------------------------

const PUSH: readonly MovementPattern[] = ['push_horizontal', 'push_vertical']
const PULL: readonly MovementPattern[] = ['pull_horizontal', 'pull_vertical']
const LEG_MUSCLES: readonly MuscleGroup[] = [
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
  'abductors',
]

const is = {
  /** Ganze Simulationen (≥ 20 min) sind eigene Einheiten, keine Bausteine */
  wholeWorkout: (e: GeneratorExercise) => (e.loadParams.durationSec?.[0] ?? 0) >= 1200,
  warmupCardio: (e: GeneratorExercise) =>
    e.category === 'warmup' && e.trainingTypes.includes('endurance') && e.measurement === 'time',
  warmupDrill: (e: GeneratorExercise) => e.category === 'warmup' && !is.warmupCardio(e),
  cooldownCardio: (e: GeneratorExercise) =>
    e.category === 'cooldown' && e.trainingTypes.includes('endurance') && e.measurement === 'time',
  stretch: (e: GeneratorExercise) =>
    ['cooldown', 'mobility', 'recovery'].includes(e.category) &&
    e.movementPattern === 'mobility' &&
    e.measurement === 'time',
  mobility: (e: GeneratorExercise) => e.category === 'mobility',
  weighted: (e: GeneratorExercise) => e.measurement === 'weight_reps' || e.measurement === 'reps',
  strengthMain: (e: GeneratorExercise, patterns: readonly MovementPattern[]) =>
    e.category === 'strength' &&
    e.trainingTypes.includes('strength') &&
    patterns.includes(e.movementPattern) &&
    is.weighted(e),
  hypertrophy: (e: GeneratorExercise, patterns: readonly MovementPattern[]) =>
    e.category === 'strength' &&
    e.trainingTypes.includes('hypertrophy') &&
    patterns.includes(e.movementPattern) &&
    is.weighted(e),
  legIsolation: (e: GeneratorExercise) =>
    e.category === 'strength' &&
    e.movementPattern === 'isolation' &&
    e.primaryMuscles.some((m) => LEG_MUSCLES.includes(m)) &&
    is.weighted(e),
  upperIsolation: (e: GeneratorExercise) =>
    e.category === 'strength' &&
    e.movementPattern === 'isolation' &&
    !e.primaryMuscles.some((m) => LEG_MUSCLES.includes(m)) &&
    is.weighted(e),
  core: (e: GeneratorExercise) =>
    e.category === 'strength' &&
    e.movementPattern === 'core' &&
    !e.trainingTypes.includes('power') &&
    ['reps', 'weight_reps', 'time'].includes(e.measurement),
  carry: (e: GeneratorExercise) =>
    e.movementPattern === 'carry' && !is.wholeWorkout(e) && e.hyroxStation === undefined,
  run: (e: GeneratorExercise) => e.category === 'hyrox' && e.hyroxStation === 'run',
  station: (e: GeneratorExercise) =>
    e.category === 'hyrox' &&
    e.hyroxStation !== undefined &&
    e.hyroxStation !== 'run' &&
    !e.trainingTypes.includes('skill') &&
    !is.wholeWorkout(e),
  bigStation: (e: GeneratorExercise) =>
    is.station(e) && ['sled', 'skierg', 'rower'].some((g) => e.equipment.includes(g as never)),
  conditioning: (e: GeneratorExercise) =>
    ['hyrox', 'strength'].includes(e.category) &&
    e.trainingTypes.includes('conditioning') &&
    !is.wholeWorkout(e) &&
    !is.run(e) &&
    e.movementPattern !== 'locomotion' &&
    e.measurement !== 'distance_time',
  interval: (e: GeneratorExercise) =>
    e.category === 'endurance' &&
    e.loadParams.sets[1] >= 3 &&
    e.difficulty < 3 &&
    (e.trainingTypes.includes('endurance') || e.trainingTypes.includes('conditioning')) &&
    ['distance_time', 'time', 'calories'].includes(e.measurement),
  steady: (e: GeneratorExercise) =>
    e.category === 'endurance' &&
    e.loadParams.sets[1] <= 2 &&
    e.trainingTypes.includes('endurance') &&
    // Testläufe mit fester Strecke sind keine Grundlageneinheiten
    (e.loadParams.durationSec ?? e.loadParams.distanceM ?? [0, 0])[0] !==
      (e.loadParams.durationSec ?? e.loadParams.distanceM ?? [0, 0])[1],
}

export const exerciseTraits = is

// -----------------------------------------------------------------------------
// Slot-Bausteine
// -----------------------------------------------------------------------------

const slot = (
  role: SlotRole,
  block: BlockType,
  label: string,
  match: SlotSpec['match'],
  optional = false,
): SlotSpec => ({ role, block, label, match, optional })

const lastUpperPattern = (ctx: SlotContext) =>
  ctx.chosen.find((e) => [...PUSH, ...PULL].includes(e.movementPattern))?.movementPattern

/** Gegenbewegung zur bereits gewählten Oberkörperübung (Push ↔ Pull). */
const oppositeUpper = (ctx: SlotContext): readonly MovementPattern[] => {
  const last = lastUpperPattern(ctx)
  if (last === undefined) return [...PUSH, ...PULL]
  return PUSH.includes(last) ? PULL : PUSH
}

const warmup = (durationMin: number): SlotSpec[] => [
  slot('warmup_cardio', 'warmup', 'Einfahren', is.warmupCardio),
  slot('warmup_drill', 'warmup', 'Aktivierung', is.warmupDrill),
  ...(durationMin >= 45
    ? [slot('warmup_drill', 'warmup', 'Mobilisation', is.warmupDrill, true)]
    : []),
]

const cooldown = (durationMin: number): SlotSpec[] => [
  ...(durationMin >= 45
    ? [slot('cooldown_cardio', 'cooldown', 'Ausfahren', is.cooldownCardio, true)]
    : []),
  slot('stretch', 'cooldown', 'Dehnen', is.stretch),
  ...(durationMin >= 45 ? [slot('stretch', 'cooldown', 'Dehnen', is.stretch, true)] : []),
]

const coreSlot = (block: BlockType, optional = true) =>
  slot('core', block, 'Rumpf', is.core, optional)

/** Rundenzahl für Zirkel nach Dauer und Intensität. */
function circuitRounds(durationMin: number, intensity: Intensity): number {
  const base = durationMin < 40 ? 2 : durationMin < 55 ? 3 : durationMin < 75 ? 4 : 5
  return Math.max(2, base + (intensity === 'easy' ? -1 : 0))
}

/** Vorlage je Schwerpunkt (docs/GENERATOR.md, Schritt 5). */
export function buildTemplate(focus: Focus, durationMin: number, intensity: Intensity): Template {
  const short = durationMin < 40

  switch (focus) {
    case 'strength':
      return {
        description:
          'Schwerpunkt Kraft: zwei schwere Grundübungen (Unter- und Oberkörper), danach Gegenbewegung, Beine und Rumpf.',
        slots: [
          ...warmup(durationMin),
          slot('strength_main', 'main', 'Kraft Unterkörper', (e) =>
            is.strengthMain(e, ['squat', 'hinge']),
          ),
          slot('strength_main', 'main', 'Kraft Oberkörper', (e) =>
            is.strengthMain(e, [...PUSH, ...PULL]),
          ),
          slot('hypertrophy', 'accessory', 'Oberkörper Gegenbewegung', (e, ctx) =>
            is.hypertrophy(e, oppositeUpper(ctx)),
          ),
          ...(short
            ? []
            : [
                slot(
                  'hypertrophy',
                  'accessory',
                  'Beine einbeinig/isoliert',
                  (e) => is.hypertrophy(e, ['lunge']) || is.legIsolation(e),
                  true,
                ),
              ]),
          coreSlot('accessory'),
          ...cooldown(durationMin),
        ],
        extraSlots: [
          slot('accessory', 'accessory', 'Isolation Oberkörper', is.upperIsolation, true),
          slot('accessory', 'accessory', 'Isolation Beine', is.legIsolation, true),
          coreSlot('accessory'),
          slot('accessory', 'accessory', 'Isolation Oberkörper', is.upperIsolation, true),
          slot(
            'hypertrophy',
            'accessory',
            'Oberkörper',
            (e) => is.hypertrophy(e, [...PUSH, ...PULL]),
            true,
          ),
          slot(
            'hypertrophy',
            'accessory',
            'Beine',
            (e) => is.hypertrophy(e, ['squat', 'hinge', 'lunge']),
            true,
          ),
        ],
      }

    case 'hyrox':
      return {
        description:
          'Schwerpunkt HYROX: Laufen und Stationen im Wechsel als Zirkel – trainiert das Laufen mit müden Beinen wie im Rennen.',
        slots: [
          ...warmup(durationMin),
          slot('run', 'main', 'Lauf', is.run),
          slot('station', 'main', 'Station mit Gerät', is.bigStation),
          ...(short
            ? []
            : [
                slot(
                  'station',
                  'main',
                  'Station Kraftausdauer',
                  (e) => is.station(e) && !is.bigStation(e),
                ),
              ]),
          ...(short
            ? []
            : [slot('conditioning', 'conditioning', 'Kraftausdauer', is.conditioning, true)]),
          ...cooldown(durationMin),
        ],
        extraSlots: [
          slot('conditioning', 'conditioning', 'Kraftausdauer', is.conditioning, true),
          coreSlot('conditioning'),
          slot('conditioning', 'conditioning', 'Kraftausdauer', is.conditioning, true),
        ],
        circuit: {
          block: 'main',
          rounds: circuitRounds(durationMin, intensity),
          maxRounds: 8,
        },
      }

    case 'endurance':
      return {
        description:
          intensity === 'easy'
            ? 'Schwerpunkt Ausdauer (locker): ruhige Grundlage für eine breite Ausdauerbasis.'
            : 'Schwerpunkt Ausdauer: Intervalle für Tempohärte und höhere Sauerstoffaufnahme.',
        slots: [
          ...warmup(durationMin),
          intensity === 'easy'
            ? slot('steady', 'main', 'Grundlagenausdauer', is.steady)
            : slot('interval', 'main', 'Intervalle', is.interval),
          ...(short ? [] : [coreSlot('accessory')]),
          ...cooldown(durationMin),
        ],
        extraSlots: [
          coreSlot('accessory'),
          slot('steady', 'main', 'Grundlage zum Abschluss', is.steady, true),
          slot('mobility', 'accessory', 'Mobility', is.mobility, true),
          slot('mobility', 'accessory', 'Mobility', is.mobility, true),
        ],
      }

    case 'full_body':
      return {
        description:
          'Schwerpunkt Ganzkörper: Beine, Drücken, Ziehen und Tragen in mittleren Wiederholungen, kurzer Finisher.',
        slots: [
          ...warmup(durationMin),
          slot('hypertrophy', 'main', 'Unterkörper', (e) =>
            is.hypertrophy(e, ['squat', 'hinge', 'lunge']),
          ),
          slot('hypertrophy', 'main', 'Drücken', (e) => is.hypertrophy(e, PUSH)),
          slot('hypertrophy', 'main', 'Ziehen', (e) => is.hypertrophy(e, PULL)),
          ...(short ? [] : [slot('accessory', 'main', 'Tragen', is.carry, true)]),
          ...(short
            ? []
            : [slot('conditioning', 'conditioning', 'Finisher', is.conditioning, true)]),
          ...cooldown(durationMin),
        ],
        extraSlots: [
          coreSlot('accessory'),
          slot('accessory', 'accessory', 'Isolation Oberkörper', is.upperIsolation, true),
          slot('accessory', 'accessory', 'Isolation Beine', is.legIsolation, true),
          slot('conditioning', 'conditioning', 'Zweiter Finisher', is.conditioning, true),
          slot('accessory', 'accessory', 'Isolation Oberkörper', is.upperIsolation, true),
          coreSlot('accessory'),
        ],
      }

    case 'mixed':
      return {
        description:
          'Schwerpunkt Mixed: Kraftblock mit Grundübungen, danach ein HYROX-naher Zirkel.',
        slots: [
          ...warmup(durationMin),
          slot('strength_main', 'main', 'Kraft Unterkörper', (e) =>
            is.strengthMain(e, ['squat', 'hinge']),
          ),
          ...(short
            ? []
            : [
                slot('strength_main', 'main', 'Kraft Oberkörper', (e) =>
                  is.strengthMain(e, [...PUSH, ...PULL]),
                ),
              ]),
          slot('conditioning', 'conditioning', 'HYROX-Finisher', (e) => is.station(e)),
          slot('conditioning', 'conditioning', 'Finisher', is.conditioning),
          ...cooldown(durationMin),
        ],
        extraSlots: [
          coreSlot('accessory'),
          slot('hypertrophy', 'accessory', 'Oberkörper Gegenbewegung', (e, ctx) =>
            is.hypertrophy(e, oppositeUpper(ctx)),
          ),
          slot('accessory', 'accessory', 'Isolation', is.upperIsolation, true),
          slot('accessory', 'accessory', 'Isolation', is.upperIsolation, true),
          coreSlot('accessory'),
          slot('accessory', 'accessory', 'Isolation Beine', is.legIsolation, true),
        ],
        circuit: { block: 'conditioning', rounds: short ? 2 : 3, maxRounds: 6 },
      }

    case 'recovery':
      return {
        description:
          'Regeneration: lockere Ausdauer und Mobility – Durchblutung fördern, ohne neu zu ermüden.',
        slots: [
          slot('warmup_drill', 'warmup', 'Mobilisation', is.warmupDrill),
          slot('steady', 'main', 'Lockere Ausdauer', is.steady),
          slot('mobility', 'accessory', 'Mobility', is.mobility),
          slot('mobility', 'accessory', 'Mobility', is.mobility, true),
          slot('stretch', 'cooldown', 'Dehnen', is.stretch),
          slot('stretch', 'cooldown', 'Dehnen', is.stretch, true),
        ],
        extraSlots: [
          slot('steady', 'main', 'Lockere Ausdauer (zweites Gerät)', is.steady, true),
          slot('mobility', 'accessory', 'Mobility', is.mobility, true),
          slot('steady', 'main', 'Lockere Ausdauer (drittes Gerät)', is.steady, true),
          slot('stretch', 'cooldown', 'Dehnen', is.stretch, true),
          slot('mobility', 'accessory', 'Mobility', is.mobility, true),
          slot('mobility', 'accessory', 'Mobility', is.mobility, true),
        ],
      }
  }
}
