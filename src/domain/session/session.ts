import type { Measurement } from '@/data/exercises/vocabulary'
import type { GeneratedWorkout, PlannedSet } from '@/domain/generator/types'
import type { ActiveExercise, ActiveSession, ActiveSet, SetValues, Step } from './types'

/**
 * Trainingsablauf als reine Funktionen: jede Aktion liefert eine neue Session.
 * Zeitpunkte (`now`, ISO) und IDs (`newId`) werden übergeben – so bleibt alles testbar.
 */

const seconds = (from: string, to: string) =>
  Math.max(0, (Date.parse(to) - Date.parse(from)) / 1000)
const addSeconds = (iso: string, sec: number) =>
  new Date(Date.parse(iso) + sec * 1000).toISOString()

function toSetValues(set: PlannedSet): SetValues {
  return {
    reps: set.reps,
    weightKg: set.weightKg,
    distanceM: set.distanceM,
    durationSec: set.durationSec,
    calories: set.calories,
  }
}

/** Startet ein Training aus einem generierten Workout. */
export function createSession(
  workout: GeneratedWorkout,
  now: string,
  newId: () => string,
  measurementOf: (slug: string) => Measurement,
): ActiveSession {
  const exercises: ActiveExercise[] = workout.blocks.flatMap((block) =>
    block.items.map((item) => ({
      id: newId(),
      exerciseSlug: item.exerciseSlug,
      exerciseName: item.exerciseName,
      measurement: measurementOf(item.exerciseSlug),
      role: item.role,
      block: block.type,
      inCircuit: block.rounds !== undefined,
      skipped: false,
      note: item.note,
      sets: item.sets.map((set, index) => ({
        id: newId(),
        setNumber: index + 1,
        type: set.type,
        target: { ...toSetValues(set), restSec: set.restSec },
        actual: {},
        completed: false,
      })),
    })),
  )
  return { id: newId(), startedAt: now, workout, exercises, cursor: 0, pausedSec: 0 }
}

// -----------------------------------------------------------------------------
// Ablauf
// -----------------------------------------------------------------------------

/**
 * Reihenfolge aller Sätze: normale Übungen Satz für Satz, Zirkel Runde für Runde
 * (Runde 1: alle Übungen Satz 1, Runde 2: alle Satz 2 …).
 */
export function buildSteps(exercises: readonly ActiveExercise[]): Step[] {
  const steps: Step[] = []
  let i = 0
  while (i < exercises.length) {
    const exercise = exercises[i] as ActiveExercise
    if (!exercise.inCircuit) {
      exercise.sets.forEach((_, setIndex) => steps.push({ exerciseIndex: i, setIndex }))
      i += 1
      continue
    }
    // Zusammenhängende Zirkel-Übungen desselben Blocks
    let end = i
    while (
      end < exercises.length &&
      exercises[end]?.inCircuit &&
      exercises[end]?.block === exercise.block
    ) {
      end += 1
    }
    const group = exercises.slice(i, end)
    const rounds = Math.max(...group.map((e) => e.sets.length))
    for (let round = 0; round < rounds; round++) {
      group.forEach((e, offset) => {
        if (round < e.sets.length) steps.push({ exerciseIndex: i + offset, setIndex: round })
      })
    }
    i = end
  }
  return steps
}

const isPending = (session: ActiveSession, step: Step) => {
  const exercise = session.exercises[step.exerciseIndex]
  return !!exercise && !exercise.skipped && !exercise.sets[step.setIndex]?.completed
}

/** Nächster offener Schritt ab `from` (danach von vorn); -1 = alles erledigt. */
function nextPending(session: ActiveSession, steps: readonly Step[], from: number): number {
  for (let offset = 0; offset < steps.length; offset++) {
    const index = (from + offset) % steps.length
    if (isPending(session, steps[index] as Step)) return index
  }
  return -1
}

export function currentStep(session: ActiveSession): Step | undefined {
  const steps = buildSteps(session.exercises)
  const step = steps[session.cursor]
  return step && isPending(session, step) ? step : undefined
}

/** Der Schritt nach dem aktuellen (Vorschau „Als Nächstes"). */
export function upcomingStep(session: ActiveSession): Step | undefined {
  const steps = buildSteps(session.exercises)
  if (steps.length === 0) return undefined
  const index = nextPending(session, steps, session.cursor + 1)
  return index === -1 || index === session.cursor ? undefined : steps[index]
}

/** Springt zu einem bestimmten Satz (z. B. aus der Übersicht). */
export function goToSet(session: ActiveSession, exerciseId: string, setId: string): ActiveSession {
  const exerciseIndex = session.exercises.findIndex((e) => e.id === exerciseId)
  const setIndex = session.exercises[exerciseIndex]?.sets.findIndex((s) => s.id === setId) ?? -1
  const cursor = buildSteps(session.exercises).findIndex(
    (s) => s.exerciseIndex === exerciseIndex && s.setIndex === setIndex,
  )
  return cursor === -1 ? session : { ...session, cursor }
}

function withCursorOnPending(session: ActiveSession, from: number): ActiveSession {
  const steps = buildSteps(session.exercises)
  const index = nextPending(session, steps, from)
  return { ...session, cursor: index === -1 ? session.cursor : index }
}

// -----------------------------------------------------------------------------
// Änderungen an Übungen und Sätzen
// -----------------------------------------------------------------------------

function updateExercise(
  session: ActiveSession,
  exerciseId: string,
  change: (exercise: ActiveExercise) => ActiveExercise,
): ActiveSession {
  return {
    ...session,
    exercises: session.exercises.map((e) => (e.id === exerciseId ? change(e) : e)),
  }
}

function updateSet(
  session: ActiveSession,
  exerciseId: string,
  setId: string,
  change: (set: ActiveSet) => ActiveSet,
): ActiveSession {
  return updateExercise(session, exerciseId, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((s) => (s.id === setId ? change(s) : s)),
  }))
}

/** Trägt tatsächliche Werte ein (z. B. Gewicht geändert). */
export function setActual(
  session: ActiveSession,
  exerciseId: string,
  setId: string,
  patch: SetValues & { rpe?: number | undefined },
): ActiveSession {
  const { rpe, ...values } = patch
  return updateSet(session, exerciseId, setId, (set) => ({
    ...set,
    actual: { ...set.actual, ...values },
    rpe: 'rpe' in patch ? rpe : set.rpe,
  }))
}

/** Welche Werte für eine Messart erfasst werden. */
export const MEASURED_FIELDS: Record<Measurement, readonly (keyof SetValues)[]> = {
  weight_reps: ['weightKg', 'reps'],
  reps: ['reps'],
  weight_distance: ['weightKg', 'distanceM'],
  weight_time: ['weightKg', 'durationSec'],
  distance: ['distanceM'],
  distance_time: ['distanceM', 'durationSec'],
  time: ['durationSec'],
  calories: ['calories', 'durationSec'],
}

/**
 * Hakt einen Satz ab. Nicht eingetragene Werte werden aus der Vorgabe übernommen
 * („wie geplant geschafft"). Startet die Pause und springt zum nächsten offenen Satz.
 */
export function completeSet(
  session: ActiveSession,
  exerciseId: string,
  setId: string,
  now: string,
): ActiveSession {
  const exercise = session.exercises.find((e) => e.id === exerciseId)
  const set = exercise?.sets.find((s) => s.id === setId)
  if (!exercise || !set || set.completed) return session

  const actual: SetValues = { ...set.actual }
  for (const field of MEASURED_FIELDS[exercise.measurement]) {
    if (actual[field] === undefined && set.target[field] !== undefined) {
      actual[field] = set.target[field]
    }
  }
  let next = updateSet(session, exerciseId, setId, (s) => ({
    ...s,
    actual,
    completed: true,
    completedAt: now,
  }))

  const steps = buildSteps(next.exercises)
  const exerciseIndex = next.exercises.findIndex((e) => e.id === exerciseId)
  const setIndex = exercise.sets.findIndex((s) => s.id === setId)
  const doneIndex = steps.findIndex(
    (s) => s.exerciseIndex === exerciseIndex && s.setIndex === setIndex,
  )
  next = withCursorOnPending(next, doneIndex + 1)

  const allDone = nextPending(next, steps, 0) === -1
  next = {
    ...next,
    rest:
      set.target.restSec > 0 && !allDone
        ? { startedAt: now, durationSec: set.target.restSec }
        : undefined,
  }
  return next
}

/** Nimmt das Abhaken zurück (Werte bleiben erhalten). */
export function reopenSet(
  session: ActiveSession,
  exerciseId: string,
  setId: string,
): ActiveSession {
  return updateSet(session, exerciseId, setId, (s) => ({
    ...s,
    completed: false,
    completedAt: undefined,
  }))
}

/** Hängt einen weiteren Satz mit derselben Vorgabe an. */
export function addSet(
  session: ActiveSession,
  exerciseId: string,
  newId: () => string,
): ActiveSession {
  return updateExercise(session, exerciseId, (exercise) => {
    const last = exercise.sets.at(-1)
    if (!last) return exercise
    return {
      ...exercise,
      skipped: false,
      sets: [
        ...exercise.sets,
        {
          id: newId(),
          setNumber: exercise.sets.length + 1,
          type: last.type === 'warmup' ? 'working' : last.type,
          target: { ...last.target },
          actual: {},
          completed: false,
        },
      ],
    }
  })
}

/** Entfernt einen offenen Satz (mindestens ein Satz bleibt). */
export function removeSet(
  session: ActiveSession,
  exerciseId: string,
  setId: string,
): ActiveSession {
  const next = updateExercise(session, exerciseId, (exercise) => {
    const set = exercise.sets.find((s) => s.id === setId)
    if (!set || set.completed || exercise.sets.length <= 1) return exercise
    return {
      ...exercise,
      sets: exercise.sets
        .filter((s) => s.id !== setId)
        .map((s, index) => ({ ...s, setNumber: index + 1 })),
    }
  })
  return withCursorOnPending(next, Math.min(next.cursor, buildSteps(next.exercises).length - 1))
}

/** Überspringt eine Übung (bereits abgehakte Sätze bleiben erhalten). */
export function skipExercise(session: ActiveSession, exerciseId: string): ActiveSession {
  const next = updateExercise(session, exerciseId, (e) => ({ ...e, skipped: true }))
  return withCursorOnPending({ ...next, rest: undefined }, next.cursor)
}

export function unskipExercise(session: ActiveSession, exerciseId: string): ActiveSession {
  return updateExercise(session, exerciseId, (e) => ({ ...e, skipped: false }))
}

export interface Replacement {
  slug: string
  name: string
  measurement: Measurement
  sets: readonly PlannedSet[]
  note?: string | undefined
}

/** Ob eine Übung noch ausgetauscht werden darf (nur, solange kein Satz abgehakt ist). */
export function canReplace(exercise: ActiveExercise): boolean {
  return !exercise.sets.some((s) => s.completed)
}

/** Tauscht eine noch nicht begonnene Übung gegen eine Alternative. */
export function replaceExercise(
  session: ActiveSession,
  exerciseId: string,
  replacement: Replacement,
  newId: () => string,
): ActiveSession {
  return updateExercise(session, exerciseId, (exercise) => {
    if (!canReplace(exercise)) return exercise
    return {
      ...exercise,
      exerciseSlug: replacement.slug,
      exerciseName: replacement.name,
      measurement: replacement.measurement,
      replacedSlug: exercise.replacedSlug ?? exercise.exerciseSlug,
      skipped: false,
      note: replacement.note,
      sets: replacement.sets.map((set, index) => ({
        id: newId(),
        setNumber: index + 1,
        type: set.type,
        target: { ...toSetValues(set), restSec: set.restSec },
        actual: {},
        completed: false,
      })),
    }
  })
}

// -----------------------------------------------------------------------------
// Pause, Pausentimer, Ende
// -----------------------------------------------------------------------------

export function pauseSession(session: ActiveSession, now: string): ActiveSession {
  return session.pausedSince || session.finishedAt ? session : { ...session, pausedSince: now }
}

/** Setzt fort; ein laufender Pausentimer wird um die Unterbrechung verschoben. */
export function resumeSession(session: ActiveSession, now: string): ActiveSession {
  if (!session.pausedSince) return session
  const paused = seconds(session.pausedSince, now)
  return {
    ...session,
    pausedSince: undefined,
    pausedSec: session.pausedSec + paused,
    rest: session.rest
      ? { ...session.rest, startedAt: addSeconds(session.rest.startedAt, paused) }
      : undefined,
  }
}

/** Verbleibende Pausenzeit in Sekunden (0 = vorbei oder keine Pause). */
export function restRemaining(session: ActiveSession, now: string): number {
  if (!session.rest) return 0
  const reference = session.pausedSince ?? now
  const elapsed = seconds(session.rest.startedAt, reference)
  return Math.max(0, Math.ceil(session.rest.durationSec - elapsed))
}

export function skipRest(session: ActiveSession): ActiveSession {
  return { ...session, rest: undefined }
}

export function extendRest(session: ActiveSession, deltaSec: number): ActiveSession {
  if (!session.rest) return session
  return {
    ...session,
    rest: { ...session.rest, durationSec: Math.max(0, session.rest.durationSec + deltaSec) },
  }
}

/** Aktive Trainingszeit in Sekunden (ohne Pausen). */
export function activeSeconds(session: ActiveSession, now: string): number {
  // Während einer laufenden Pause zählt die Zeit bis zum Pausenbeginn
  const end = session.finishedAt ?? session.pausedSince ?? now
  return Math.round(Math.max(0, seconds(session.startedAt, end) - session.pausedSec))
}

export function finishSession(session: ActiveSession, now: string): ActiveSession {
  const resumed = resumeSession(session, now)
  return { ...resumed, finishedAt: now, rest: undefined }
}

// -----------------------------------------------------------------------------
// Auswertung
// -----------------------------------------------------------------------------

export type ExerciseOutcome = 'completed' | 'partial' | 'skipped'

export function exerciseOutcome(exercise: ActiveExercise): ExerciseOutcome {
  const done = exercise.sets.filter((s) => s.completed).length
  if (done === 0) return 'skipped'
  if (done === exercise.sets.length && !exercise.skipped) return 'completed'
  return 'partial'
}

export function sessionOutcome(session: ActiveSession): 'completed' | 'partial' {
  return session.exercises.every((e) => exerciseOutcome(e) === 'completed')
    ? 'completed'
    : 'partial'
}

export interface SessionProgress {
  completedSets: number
  totalSets: number
}

/** Fortschritt ohne übersprungene Übungen. */
export function sessionProgress(session: ActiveSession): SessionProgress {
  const relevant = session.exercises.filter((e) => !e.skipped)
  return {
    completedSets: relevant.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0),
    totalSets: relevant.reduce((n, e) => n + e.sets.length, 0),
  }
}

export function isEverythingDone(session: ActiveSession): boolean {
  return nextPending(session, buildSteps(session.exercises), 0) === -1
}
