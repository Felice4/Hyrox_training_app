import {
  EQUIPMENT_LABELS,
  HYROX_STATION_LABELS,
  MUSCLE_GROUP_LABELS,
  type MuscleGroup,
} from '@/data/exercises/vocabulary'
import { estimateItemSeconds, secondsPerMeter, setWorkSeconds } from '@/domain/duration/estimate'
import { computeMuscleFatigue, fatigueLevel } from '@/domain/load/muscleFatigue'
import { summarizeTrainingLoad } from '@/domain/load/trainingLoad'
import type { TrainingLevel } from '@/domain/profile/vocabulary'
import { createRandom, weightedPick, type Random } from '@/domain/random'
import { readinessEffect, shiftIntensity } from '@/domain/readiness/readiness'
import { DURATION, GENERATOR_VERSION } from './config'
import {
  ADJUSTABLE_ROLES,
  adjustableRange,
  doseExercise,
  niceDistance,
  niceDuration,
} from './dosing'
import { buildHistoryIndex, filterPool } from './pool'
import { excludesFatiguedMuscles, scoreCandidate, SCORING, type ScoringContext } from './scoring'
import { buildTemplate, type SlotSpec, type Template } from './templates'
import type {
  BlockType,
  GeneratedWorkout,
  GeneratorExercise,
  Intensity,
  PlannedSet,
  WorkoutBlock,
  WorkoutRequestInput,
} from './types'

const BLOCK_ORDER: readonly BlockType[] = [
  'warmup',
  'main',
  'accessory',
  'conditioning',
  'cooldown',
]
const INTENSITY_LABELS: Record<Intensity, string> = {
  easy: 'leicht',
  moderate: 'mittel',
  hard: 'hart',
}
/** Wechselzeit pro Runde und Übung in einem Zirkel (Roxzone) */
const CIRCUIT_TRANSITION_SEC = 30
/** Pause nach jeder Zirkelrunde je Intensität */
const CIRCUIT_ROUND_REST: Record<Intensity, number> = { easy: 120, moderate: 90, hard: 60 }
/** Eine Übung, die allein schon mehr als diesen Anteil der Zeit braucht, passt nicht */
const MAX_SHARE_PER_ITEM = 0.6

interface DraftItem {
  spec: SlotSpec
  exercise: GeneratorExercise
  sets: PlannedSet[]
  note?: string | undefined
  inCircuit: boolean
}

interface GenerationState {
  input: WorkoutRequestInput
  random: Random
  pool: GeneratorExercise[]
  level: TrainingLevel
  intensity: Intensity
  volumeFactor: number
  loadFactor: number
  scoring: ScoringContext
  template: Template
  rounds: number
  items: DraftItem[]
  explanation: string[]
  targetSec: number
}

// -----------------------------------------------------------------------------
// Zeit
// -----------------------------------------------------------------------------

/** Geschätzte Dauer einer Übung; im Zirkel fällt die Wechselzeit in jeder Runde an. */
export function estimateWorkoutItem(
  sets: readonly PlannedSet[],
  exercise: GeneratorExercise,
  level: TrainingLevel,
  block: BlockType,
  inCircuit: boolean,
): number {
  if (!inCircuit) return estimateItemSeconds(sets, exercise, level, block)
  const work = sets.reduce((s, set) => s + setWorkSeconds(set, exercise, level), 0)
  const rests = sets.slice(0, -1).reduce((s, set) => s + set.restSec, 0)
  return Math.round(work + rests + sets.length * CIRCUIT_TRANSITION_SEC)
}

function itemSeconds(item: DraftItem, level: TrainingLevel): number {
  return estimateWorkoutItem(item.sets, item.exercise, level, item.spec.block, item.inCircuit)
}

const totalSeconds = (state: GenerationState) =>
  state.items.reduce((sum, item) => sum + itemSeconds(item, state.level), 0)

// -----------------------------------------------------------------------------
// Auswahl
// -----------------------------------------------------------------------------

function dose(
  state: GenerationState,
  exercise: GeneratorExercise,
  spec: SlotSpec,
  inCircuit: boolean,
) {
  return doseExercise(exercise, spec.role, {
    intensity: state.intensity,
    volumeFactor: state.volumeFactor,
    loadFactor: state.loadFactor,
    history: state.input.history,
    fixedSets: inCircuit ? state.rounds : undefined,
  })
}

function isHighlyFatigued(exercise: GeneratorExercise, state: GenerationState): boolean {
  const wished = state.scoring.targetMuscles
  return exercise.primaryMuscles.some(
    (m) => fatigueLevel(state.scoring.fatigue[m]) === 'high' && !wished.includes(m),
  )
}

/** Wählt per Seed eine der besten Übungen für einen Slot (Schritt 6). */
function selectExercise(
  state: GenerationState,
  spec: SlotSpec,
  maxSec = state.targetSec * MAX_SHARE_PER_ITEM,
): GeneratorExercise | undefined {
  const chosen = state.items.map((i) => i.exercise)
  const chosenSlugs = new Set(chosen.map((e) => e.slug))
  const inCircuit = state.template.circuit?.block === spec.block

  const candidates = state.pool.filter((exercise) => {
    if (chosenSlugs.has(exercise.slug) || !spec.match(exercise, { chosen })) return false
    if (excludesFatiguedMuscles(spec.role) && isHighlyFatigued(exercise, state)) return false
    if (state.level === 'beginner' && spec.block === 'main' && exercise.difficulty === 3) {
      return false
    }
    const probe: DraftItem = {
      spec,
      exercise,
      sets: dose(state, exercise, spec, inCircuit).sets,
      inCircuit,
    }
    return itemSeconds(probe, state.level) <= maxSec
  })
  if (candidates.length === 0) return undefined

  // Ausdrücklich gewünschte HYROX-Stationen werden verbindlich eingeplant, sofern möglich
  const chosenStations = new Set(chosen.map((e) => e.hyroxStation))
  const wishedStations = state.scoring.hyroxStations.filter((s) => !chosenStations.has(s))
  const wished = candidates.filter(
    (e) => e.hyroxStation !== undefined && wishedStations.includes(e.hyroxStation),
  )
  const pickFrom = wished.length > 0 ? wished : candidates

  const scored = pickFrom
    .map((exercise) => ({ exercise, score: scoreCandidate(exercise, spec.role, state.scoring) }))
    .sort((a, b) => b.score - a.score || a.exercise.slug.localeCompare(b.exercise.slug))
    .slice(0, SCORING.topCandidates)
  const lowest = Math.min(...scored.map((s) => s.score))
  return weightedPick(
    scored.map((s) => s.exercise),
    scored.map((s) => s.score - lowest + 1),
    state.random,
  )
}

function addSlot(state: GenerationState, spec: SlotSpec, maxSec?: number): DraftItem | undefined {
  const exercise = selectExercise(state, spec, maxSec)
  if (!exercise) return undefined
  const inCircuit = state.template.circuit?.block === spec.block
  const dosed = dose(state, exercise, spec, inCircuit)
  const item: DraftItem = { spec, exercise, sets: dosed.sets, note: dosed.note, inCircuit }
  state.items.push(item)
  return item
}

/** Pausen im Zirkel: zwischen den Übungen keine, nach jeder Runde eine Rundenpause. */
function applyCircuitRests(state: GenerationState) {
  const circuitItems = state.items.filter((i) => i.inCircuit)
  circuitItems.forEach((item, index) => {
    const isLast = index === circuitItems.length - 1
    item.sets = item.sets.map((set) => ({
      ...set,
      restSec: isLast ? CIRCUIT_ROUND_REST[state.intensity] : 0,
    }))
  })
}

// -----------------------------------------------------------------------------
// Zeitanpassung (Schritt 8)
// -----------------------------------------------------------------------------

interface Knob {
  item: DraftItem
  kind: 'durationSec' | 'distanceM'
  min: number
  max: number
}

function knobs(state: GenerationState): Knob[] {
  return state.items.flatMap((item): Knob[] => {
    if (!ADJUSTABLE_ROLES.includes(item.spec.role) || item.sets.length !== 1) return []
    const set = item.sets[0] as PlannedSet
    if (set.durationSec !== undefined) {
      const range = adjustableRange(item.exercise, item.spec.role)
      return range ? [{ item, kind: 'durationSec', min: range[0], max: range[1] }] : []
    }
    const distance = item.exercise.loadParams.distanceM
    if (set.distanceM !== undefined && item.spec.role === 'steady' && distance) {
      return [{ item, kind: 'distanceM', min: distance[0], max: distance[1] }]
    }
    return []
  })
}

/** Verändert einen Stellknopf um ungefähr `deltaSec` Sekunden; liefert die echte Änderung. */
function turnKnob(state: GenerationState, knob: Knob, deltaSec: number): number {
  const set = knob.item.sets[0] as PlannedSet
  const before = itemSeconds(knob.item, state.level)
  if (knob.kind === 'durationSec') {
    const current = set.durationSec ?? knob.min
    const next = Math.min(knob.max, Math.max(knob.min, niceDuration(current + deltaSec)))
    knob.item.sets = [{ ...set, durationSec: next }]
  } else {
    const spm = secondsPerMeter(knob.item.exercise, state.level)
    const current = set.distanceM ?? knob.min
    const next = Math.min(knob.max, Math.max(knob.min, niceDistance(current + deltaSec / spm)))
    knob.item.sets = [{ ...set, distanceM: next }]
  }
  return itemSeconds(knob.item, state.level) - before
}

const workingSets = (item: DraftItem) => item.sets.filter((s) => s.type !== 'warmup')

function changeSets(item: DraftItem, delta: 1 | -1) {
  const template = workingSets(item)[0]
  if (!template) return
  if (delta > 0) item.sets = [...item.sets, { ...template }]
  else {
    const index = item.sets.lastIndexOf(workingSets(item).at(-1) as PlannedSet)
    item.sets = item.sets.filter((_, i) => i !== index)
  }
}

/** Ändert die Rundenzahl eines Zirkels (alle Übungen gleichzeitig). */
function changeRounds(state: GenerationState, delta: 1 | -1): boolean {
  const circuit = state.template.circuit
  const items = state.items.filter((i) => i.inCircuit)
  if (!circuit || items.length === 0) return false
  const next = state.rounds + delta
  if (next < 2 || next > circuit.maxRounds) return false
  state.rounds = next
  items.forEach((item) => changeSets(item, delta))
  applyCircuitRests(state)
  return true
}

const SET_ROLES_REDUCE_FIRST = ['accessory', 'core', 'hypertrophy', 'conditioning'] as const

function tryReduce(state: GenerationState): boolean {
  // a) Sätze im Zusatzteil kürzen (größte Übung zuerst, mindestens 2 Sätze)
  const reducible = state.items
    .filter(
      (i) =>
        !i.inCircuit &&
        (SET_ROLES_REDUCE_FIRST as readonly string[]).includes(i.spec.role) &&
        i.spec.block !== 'main' &&
        workingSets(i).length > 2,
    )
    .sort((a, b) => itemSeconds(b, state.level) - itemSeconds(a, state.level))
  if (reducible[0]) {
    changeSets(reducible[0], -1)
    return true
  }
  // b) optionale Übungen streichen (zuletzt hinzugefügte zuerst)
  const optional = [...state.items].reverse().find((i) => i.spec.optional)
  if (optional) {
    state.items = state.items.filter((i) => i !== optional)
    if (optional.inCircuit) applyCircuitRests(state)
    return true
  }
  // c) Zirkelrunden kürzen
  if (changeRounds(state, -1)) return true
  // d) Hauptsätze kürzen (mindestens 2)
  const main = state.items
    .filter((i) => !i.inCircuit && i.spec.block === 'main' && workingSets(i).length > 2)
    .sort((a, b) => itemSeconds(b, state.level) - itemSeconds(a, state.level))
  if (main[0] && !ADJUSTABLE_ROLES.includes(main[0].spec.role)) {
    changeSets(main[0], -1)
    return true
  }
  return false
}

interface Snapshot {
  items: DraftItem[]
  rounds: number
}

const snapshot = (state: GenerationState): Snapshot => ({
  items: state.items.map((item) => ({ ...item, sets: [...item.sets] })),
  rounds: state.rounds,
})

function restore(state: GenerationState, snap: Snapshot) {
  state.items = snap.items
  state.rounds = snap.rounds
}

const EXTENDABLE_ROLES = [
  'strength_main',
  'hypertrophy',
  'accessory',
  'core',
  'conditioning',
  'interval',
]

/**
 * Mögliche Verlängerungen in sinnvoller Reihenfolge: zuerst Sätze (kürzeste Übung zuerst,
 * damit gleichmäßig), dann eine Zirkelrunde, dann zusätzliche Übungen aus der Vorlage.
 */
function extensionActions(
  state: GenerationState,
  extraQueue: SlotSpec[],
  high: number,
): (() => boolean)[] {
  const setActions = state.items
    .filter(
      (i) =>
        !i.inCircuit &&
        EXTENDABLE_ROLES.includes(i.spec.role) &&
        workingSets(i).length < i.exercise.loadParams.sets[1],
    )
    .sort((a, b) => workingSets(a).length - workingSets(b).length)
    .map((item) => () => {
      const current = state.items.find((i) => i.exercise.slug === item.exercise.slug)
      if (!current) return false
      changeSets(current, 1)
      return true
    })
  const roundAction = () => changeRounds(state, 1)
  const extraActions = extraQueue.map((spec) => () => {
    // Nur Übungen, die in die verbleibende Zeit passen
    const remaining = Math.min(high - totalSeconds(state), state.targetSec * MAX_SHARE_PER_ITEM)
    const added = addSlot(state, spec, remaining)
    if (!added) return false
    if (state.template.circuit?.block === spec.block) applyCircuitRests(state)
    extraQueue.splice(extraQueue.indexOf(spec), 1)
    return true
  })
  return [...setActions, roundAction, ...extraActions]
}

/**
 * Verlängert um einen Schritt. Würde ein Schritt die Obergrenze überschreiten, wird genau
 * dieser rückgängig gemacht und der nächste versucht.
 */
function tryExtend(state: GenerationState, extraQueue: SlotSpec[], high: number): boolean {
  for (const action of extensionActions(state, extraQueue, high)) {
    const before = snapshot(state)
    if (!action()) continue
    if (totalSeconds(state) <= high) return true
    restore(state, before)
  }
  return false
}

function fitDuration(state: GenerationState) {
  const high = state.targetSec * (1 + DURATION.fitTolerance)
  const extraQueue = [...state.template.extraSlots]

  // 1. Zu lang → kürzen (Stellknöpfe stehen anfangs auf Minimum)
  for (let guard = 0; guard < 200 && totalSeconds(state) > high; guard++) {
    if (!tryReduce(state)) break
  }

  // 2. Zu kurz → Sätze/Übungen ergänzen, solange die Grundlageneinheit nicht reicht.
  //    Warm-up/Cool-down sind kein Ersatz für Training und dienen nur der Feinabstimmung.
  for (let guard = 0; guard < 200; guard++) {
    const steadyRoom = knobs(state)
      .filter((k) => k.item.spec.role === 'steady')
      .reduce((sum, k) => sum + roomOf(state, k), 0)
    if (totalSeconds(state) + steadyRoom >= state.targetSec) break
    if (!tryExtend(state, extraQueue, high)) break
  }

  // 3. Feinabstimmung auf die Zieldauer: Grundlage zuerst, dann Warm-up/Cool-down
  const knobOrder = (k: Knob) => (k.item.spec.role === 'steady' ? 0 : 1)
  for (const knob of knobs(state).sort((a, b) => knobOrder(a) - knobOrder(b))) {
    const delta = state.targetSec - totalSeconds(state)
    if (Math.abs(delta) < 30) break
    turnKnob(state, knob, delta)
  }

  // 4. Sicherheitsnetz, falls immer noch zu lang
  for (let guard = 0; guard < 50 && totalSeconds(state) > high; guard++) {
    if (!tryReduce(state)) break
  }
}

/** Wie viele Sekunden lässt sich ein Stellknopf noch verlängern? */
function roomOf(state: GenerationState, knob: Knob): number {
  const set = knob.item.sets[0] as PlannedSet
  if (knob.kind === 'durationSec') return knob.max - (set.durationSec ?? knob.max)
  return (knob.max - (set.distanceM ?? knob.max)) * secondsPerMeter(knob.item.exercise, state.level)
}

// -----------------------------------------------------------------------------
// Erklärung (Schritt 9)
// -----------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

function muscleList(muscles: readonly MuscleGroup[]): string {
  return muscles.map((m) => MUSCLE_GROUP_LABELS[m]).join(', ')
}

// -----------------------------------------------------------------------------
// Hauptfunktion
// -----------------------------------------------------------------------------

/**
 * Erzeugt ein vollständiges Workout – rein und deterministisch:
 * gleicher Input (inkl. Seed und Zeitpunkt) → gleiches Ergebnis.
 */
export function generateWorkout(input: WorkoutRequestInput): GeneratedWorkout {
  const { request, profile, goals } = input
  const explanation: string[] = []

  // 1./2. Tagesform und Belastung
  const readiness = readinessEffect(request.readiness)
  const load = summarizeTrainingLoad(input.history, input.now)
  let intensity = request.focus === 'recovery' ? 'easy' : request.intensity
  let volumeFactor = 1
  if (request.focus !== 'recovery') {
    if (readiness.intensityShift < 0) {
      const lowered = shiftIntensity(intensity, readiness.intensityShift)
      explanation.push(
        `Tagesform eher niedrig (${String(readiness.score).replace('.', ',')} von 5) → Intensität ${INTENSITY_LABELS[lowered]}, etwa 20 % weniger Volumen.`,
      )
      intensity = lowered
      volumeFactor = readiness.volumeFactor
    }
    if (load.elevated && readiness.intensityShift === 0) {
      intensity = shiftIntensity(intensity, -1)
      explanation.push(
        'Die Trainingsbelastung der letzten 7 Tage liegt deutlich über deinem Durchschnitt → Intensität eine Stufe niedriger.',
      )
    }
  }
  if (readiness.recoverySuggested && request.focus !== 'recovery') {
    explanation.push(
      'Deine Tagesform ist sehr niedrig – eine regenerative Einheit wäre heute die bessere Wahl.',
    )
  }

  // 3. Übungspool
  const unavailable = request.unavailableEquipment ?? []
  const pool = filterPool(input.exercises, profile, unavailable)
  if (unavailable.length > 0) {
    explanation.push(`Heute ohne: ${unavailable.map((e) => EQUIPMENT_LABELS[e]).join(', ')}.`)
  }

  // 4. Muskelermüdung
  const fatigue = computeMuscleFatigue(input.history, input.exercises, input.now)
  const highlyFatigued = (Object.keys(fatigue) as MuscleGroup[]).filter(
    (m) => fatigueLevel(fatigue[m]) === 'high',
  )
  if (highlyFatigued.length > 0 && request.focus !== 'recovery') {
    explanation.push(
      `Zuletzt stark beansprucht: ${muscleList(highlyFatigued)} → heute nicht als Hauptmuskeln.`,
    )
  }

  // 5. Vorlage
  const template = buildTemplate(request.focus, request.durationMin, intensity)
  explanation.unshift(template.description)
  const state: GenerationState = {
    input,
    random: createRandom(input.seed),
    pool,
    level: profile.trainingLevel,
    intensity,
    volumeFactor,
    loadFactor: readiness.loadFactor,
    scoring: {
      goals,
      focus: request.focus,
      fatigue,
      history: buildHistoryIndex(input.history, input.exercises, request.focus, input.now),
      targetMuscles: request.targetMuscles ?? [],
      hyroxStations: request.hyroxStations ?? [],
    },
    template,
    rounds: template.circuit?.rounds ?? 0,
    items: [],
    explanation,
    targetSec: request.durationMin * 60,
  }

  // 6./7. Slots füllen und dosieren
  for (const spec of template.slots) {
    const item = addSlot(state, spec)
    if (!item && !spec.optional) {
      explanation.push(
        `Für „${spec.label}" passte heute keine Übung (Geräte, Einschränkungen oder Ermüdung) → ausgelassen.`,
      )
    }
  }
  applyCircuitRests(state)

  // 8. Zeit anpassen
  fitDuration(state)

  // 9. Erklärung zu Stationen und Wünschen
  const nowMs = Date.parse(input.now)
  const hasHistory = input.history.some((s) => nowMs - Date.parse(s.startedAt) < 28 * DAY_MS)
  for (const item of state.items) {
    const station = item.exercise.hyroxStation
    if (!station || station === 'run' || !hasHistory) continue
    const days = state.scoring.history.daysSinceStation.get(station)
    if (days === undefined) {
      explanation.push(
        `${HYROX_STATION_LABELS[station]} in den letzten 4 Wochen nicht trainiert → eingeplant.`,
      )
    } else if (days >= SCORING.stationCoverageDays) {
      explanation.push(
        `${HYROX_STATION_LABELS[station]} seit ${Math.floor(days)} Tagen nicht trainiert → eingeplant.`,
      )
    }
  }
  const wished = state.scoring.targetMuscles
  if (wished.length > 0) {
    const covered = wished.filter((m) =>
      state.items.some((i) => i.exercise.primaryMuscles.includes(m)),
    )
    if (covered.length > 0) explanation.push(`Dein Wunsch berücksichtigt: ${muscleList(covered)}.`)
    const fatiguedWish = covered.filter((m) => fatigueLevel(fatigue[m]) === 'high')
    if (fatiguedWish.length > 0) {
      explanation.push(
        `Achtung: ${muscleList(fatiguedWish)} sind noch ermüdet – heute nicht bis ans Limit gehen.`,
      )
    }
  }
  const preferred = state.items.filter((i) => i.exercise.preference === 'preferred')
  if (preferred.length > 0) {
    explanation.push(`Bevorzugt eingeplant: ${preferred.map((i) => i.exercise.name).join(', ')}.`)
  }

  // Ergebnis zusammenbauen
  const blocks: WorkoutBlock[] = BLOCK_ORDER.map((type) => {
    const items = state.items.filter((i) => i.spec.block === type)
    return {
      type,
      rounds: template.circuit?.block === type && items.length > 0 ? state.rounds : undefined,
      items: items.map((item) => ({
        exerciseSlug: item.exercise.slug,
        exerciseName: item.exercise.name,
        role: item.spec.role,
        sets: item.sets,
        note: item.note,
        estimatedSec: itemSeconds(item, state.level),
      })),
    }
  }).filter((block) => block.items.length > 0)

  const estimatedDurationMin = Math.round(totalSeconds(state) / 60)
  explanation.push(
    `Geschätzte Dauer ${estimatedDurationMin} min bei Ziel ${request.durationMin} min, Intensität ${INTENSITY_LABELS[intensity]}.`,
  )

  return {
    generatorVersion: GENERATOR_VERSION,
    seed: input.seed,
    focus: request.focus,
    intensity,
    targetDurationMin: request.durationMin,
    estimatedDurationMin,
    blocks,
    explanation,
    recoverySuggested: readiness.recoverySuggested && request.focus !== 'recovery',
  }
}
