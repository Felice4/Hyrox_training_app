import type { Measurement } from '@/data/exercises/vocabulary'
import type { Focus, GeneratedWorkout, Intensity, SlotRole } from '@/domain/generator/types'
import { toSaveSessionPayload, type SaveSessionPayload } from '@/domain/session/payload'
import { MEASURED_FIELDS } from '@/domain/session/session'
import type { ActiveSession, SetValues } from '@/domain/session/types'

/**
 * Nachgetragene Trainings und Trainer-Sessions (docs/MANUAL_ENTRY.md).
 * Ein Eintrag wird in ein beendetes Training umgewandelt und über dieselbe
 * Speicherfunktion gesichert wie ein Training aus dem Trainingsmodus.
 */

export const ENTRY_SOURCES = ['manual', 'trainer'] as const
export type EntrySource = (typeof ENTRY_SOURCES)[number]

/** Herkunft eines gespeicherten Trainings */
export type SessionSource = 'app' | EntrySource

export const ENTRY_BLOCKS = ['warmup', 'main', 'cooldown'] as const
export type EntryBlock = (typeof ENTRY_BLOCKS)[number]

/** Rolle je Block (nur Beschriftung – nachgetragene Übungen haben keine Generator-Rolle) */
const BLOCK_ROLE: Record<EntryBlock, SlotRole> = {
  warmup: 'warmup_drill',
  main: 'accessory',
  cooldown: 'stretch',
}

/** Kennung im Workout-Schnappschuss (statt Generator-Version) */
export const MANUAL_VERSION = 'manual-1'

export const MAX_DURATION_MIN = 600
export const MAX_TEXT_LENGTH = 120

export interface EntrySet {
  id: string
  values: SetValues
}

export interface EntryExercise {
  id: string
  exerciseSlug: string
  exerciseName: string
  measurement: Measurement
  block: EntryBlock
  sets: EntrySet[]
}

export interface ManualEntry {
  /** = ID des gespeicherten Trainings (gleiche ID → Bearbeiten statt Doppeleintrag) */
  id: string
  source: EntrySource
  /** Lokales Datum JJJJ-MM-TT */
  date: string
  /** Lokale Uhrzeit HH:MM */
  time: string
  durationMin: number
  focus: Focus
  /** z. B. „HYROX Class" */
  title?: string | undefined
  /** Trainer oder Studio */
  coach?: string | undefined
  /** Anstrengung des ganzen Trainings 1–10 */
  sessionRpe?: number | undefined
  notes?: string | undefined
  /** Geplante Einheit (z. B. Trainer-Termin), die damit erledigt wird */
  plannedWorkoutId?: string | undefined
  exercises: EntryExercise[]
}

export type ManualPayload = SaveSessionPayload & {
  session: SaveSessionPayload['session'] & {
    source: EntrySource
    title: string | null
    coach: string | null
  }
}

/** Intensität aus der Anstrengung: ≤ 4 leicht, 5–7 mittel, ≥ 8 hart. */
export function intensityFromRpe(rpe: number | undefined): Intensity {
  if (rpe === undefined) return 'moderate'
  if (rpe <= 4) return 'easy'
  if (rpe <= 7) return 'moderate'
  return 'hard'
}

/** Beginn als ISO-Zeitstempel (Datum und Uhrzeit in lokaler Zeit des Geräts). */
export function entryStart(entry: Pick<ManualEntry, 'date' | 'time'>): string {
  return new Date(`${entry.date}T${entry.time}:00`).toISOString()
}

export function newEntry(input: {
  id: string
  source: EntrySource
  date: string
  time: string
  focus?: Focus | undefined
  durationMin?: number | undefined
  title?: string | undefined
  coach?: string | undefined
  plannedWorkoutId?: string | undefined
}): ManualEntry {
  return {
    id: input.id,
    source: input.source,
    date: input.date,
    time: input.time,
    durationMin: input.durationMin ?? 60,
    focus: input.focus ?? (input.source === 'trainer' ? 'hyrox' : 'strength'),
    title: input.title,
    coach: input.coach,
    plannedWorkoutId: input.plannedWorkoutId,
    exercises: [],
  }
}

// -----------------------------------------------------------------------------
// Übungen und Sätze bearbeiten (reine Funktionen für das Formular)
// -----------------------------------------------------------------------------

export function addExercise(
  entry: ManualEntry,
  exercise: { slug: string; name: string; measurement: Measurement },
  newId: () => string,
  block: EntryBlock = 'main',
): ManualEntry {
  return {
    ...entry,
    exercises: [
      ...entry.exercises,
      {
        id: newId(),
        exerciseSlug: exercise.slug,
        exerciseName: exercise.name,
        measurement: exercise.measurement,
        block,
        sets: [{ id: newId(), values: {} }],
      },
    ],
  }
}

function mapExercise(
  entry: ManualEntry,
  exerciseId: string,
  change: (exercise: EntryExercise) => EntryExercise,
): ManualEntry {
  return {
    ...entry,
    exercises: entry.exercises.map((e) => (e.id === exerciseId ? change(e) : e)),
  }
}

export function removeExercise(entry: ManualEntry, exerciseId: string): ManualEntry {
  return { ...entry, exercises: entry.exercises.filter((e) => e.id !== exerciseId) }
}

/** Verschiebt eine Übung um eine Position nach oben (-1) oder unten (+1). */
export function moveExercise(entry: ManualEntry, exerciseId: string, by: -1 | 1): ManualEntry {
  const from = entry.exercises.findIndex((e) => e.id === exerciseId)
  const to = from + by
  if (from < 0 || to < 0 || to >= entry.exercises.length) return entry
  const exercises = [...entry.exercises]
  const [moved] = exercises.splice(from, 1)
  exercises.splice(to, 0, moved!)
  return { ...entry, exercises }
}

export function setBlock(entry: ManualEntry, exerciseId: string, block: EntryBlock): ManualEntry {
  return mapExercise(entry, exerciseId, (e) => ({ ...e, block }))
}

/** Neuer Satz mit den Werten des letzten Satzes (meist gleich oder ähnlich). */
export function addSet(entry: ManualEntry, exerciseId: string, newId: () => string): ManualEntry {
  return mapExercise(entry, exerciseId, (e) => ({
    ...e,
    sets: [...e.sets, { id: newId(), values: { ...e.sets.at(-1)?.values } }],
  }))
}

export function removeSet(entry: ManualEntry, exerciseId: string, setId: string): ManualEntry {
  return mapExercise(entry, exerciseId, (e) => ({
    ...e,
    sets: e.sets.filter((s) => s.id !== setId),
  }))
}

export function updateSet(
  entry: ManualEntry,
  exerciseId: string,
  setId: string,
  patch: SetValues,
): ManualEntry {
  return mapExercise(entry, exerciseId, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.id === setId ? { ...s, values: { ...s.values, ...patch } } : s)),
  }))
}

// -----------------------------------------------------------------------------
// Prüfen und umwandeln
// -----------------------------------------------------------------------------

/** Satz hat mindestens einen Messwert der Übung (z. B. Wdh. oder Gewicht). */
export function setHasValue(measurement: Measurement, values: SetValues): boolean {
  return MEASURED_FIELDS[measurement].some((field) => (values[field] ?? 0) > 0)
}

/** Fehlermeldungen für das Formular; leer = speicherbar. `today` = lokales Datum. */
export function validateEntry(entry: ManualEntry, today: string): string[] {
  const errors: string[] = []
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) errors.push('Datum fehlt.')
  else if (entry.date > today)
    errors.push('Ein Training in der Zukunft kann nicht eingetragen werden.')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time)) errors.push('Uhrzeit fehlt.')
  if (
    !Number.isInteger(entry.durationMin) ||
    entry.durationMin < 1 ||
    entry.durationMin > MAX_DURATION_MIN
  ) {
    errors.push(`Dauer zwischen 1 und ${MAX_DURATION_MIN} Minuten angeben.`)
  }
  if (entry.sessionRpe === undefined) errors.push('Anstrengung (RPE) auswählen.')
  if (entry.source === 'trainer' && !entry.title?.trim()) {
    errors.push('Titel der Trainer-Session angeben (z. B. „HYROX Class").')
  }
  if ((entry.title?.trim().length ?? 0) > MAX_TEXT_LENGTH) errors.push('Titel ist zu lang.')
  if ((entry.coach?.trim().length ?? 0) > MAX_TEXT_LENGTH)
    errors.push('Trainer/Studio ist zu lang.')
  if ((entry.notes?.length ?? 0) > 2000) errors.push('Notiz ist zu lang (max. 2000 Zeichen).')
  if (entry.exercises.length === 0) errors.push('Mindestens eine Übung hinzufügen.')
  for (const exercise of entry.exercises) {
    if (exercise.sets.length === 0) {
      errors.push(`${exercise.exerciseName}: mindestens einen Satz eintragen.`)
    } else if (!exercise.sets.every((s) => setHasValue(exercise.measurement, s.values))) {
      errors.push(`${exercise.exerciseName}: jeder Satz braucht einen Wert.`)
    }
  }
  return errors
}

/** Nur Messwerte der Übung, leere/0-Werte entfernt. */
function cleanValues(measurement: Measurement, values: SetValues): SetValues {
  const clean: SetValues = {}
  for (const field of MEASURED_FIELDS[measurement]) {
    const value = values[field]
    if (value !== undefined && value > 0) clean[field] = value
  }
  return clean
}

/** Schnappschuss für `workout_snapshot` – beschreibt das eingetragene Training. */
function entryWorkout(entry: ManualEntry): GeneratedWorkout {
  const blocks = ENTRY_BLOCKS.map((type) => ({
    type,
    items: entry.exercises
      .filter((e) => e.block === type)
      .map((e) => ({
        exerciseSlug: e.exerciseSlug,
        exerciseName: e.exerciseName,
        role: BLOCK_ROLE[type],
        sets: e.sets.map((s) => ({
          type: 'working' as const,
          ...cleanValues(e.measurement, s.values),
          restSec: 0,
        })),
        estimatedSec: 0,
      })),
  })).filter((b) => b.items.length > 0)
  return {
    generatorVersion: MANUAL_VERSION,
    seed: 0,
    focus: entry.focus,
    intensity: intensityFromRpe(entry.sessionRpe),
    targetDurationMin: entry.durationMin,
    estimatedDurationMin: entry.durationMin,
    blocks,
    explanation: [],
    recoverySuggested: false,
  }
}

/** Eintrag → beendetes Training (alle Sätze geschafft, Zeitpunkt = Beginn). */
export function entryToSession(entry: ManualEntry): ActiveSession {
  const startedAt = entryStart(entry)
  const finishedAt = new Date(Date.parse(startedAt) + entry.durationMin * 60_000).toISOString()
  return {
    id: entry.id,
    startedAt,
    finishedAt,
    workout: entryWorkout(entry),
    plannedWorkoutId: entry.plannedWorkoutId,
    exercises: entry.exercises.map((e) => ({
      id: e.id,
      exerciseSlug: e.exerciseSlug,
      exerciseName: e.exerciseName,
      measurement: e.measurement,
      role: BLOCK_ROLE[e.block],
      block: e.block,
      inCircuit: false,
      skipped: false,
      sets: e.sets.map((s, index) => ({
        id: s.id,
        setNumber: index + 1,
        type: 'working',
        target: { restSec: 0 },
        actual: cleanValues(e.measurement, s.values),
        completed: true,
        completedAt: startedAt,
      })),
    })),
    cursor: 0,
    pausedSec: 0,
  }
}

/** Speicher-Nutzlast für save_workout_session inkl. Herkunft, Titel und Trainer. */
export function toEntryPayload(entry: ManualEntry): ManualPayload {
  const payload = toSaveSessionPayload(entryToSession(entry), {
    sessionRpe: entry.sessionRpe,
    notes: entry.notes,
  })
  const title = entry.title?.trim()
  const coach = entry.coach?.trim()
  return {
    ...payload,
    session: {
      ...payload.session,
      source: entry.source,
      title: title ? title : null,
      coach: coach ? coach : null,
    },
  }
}
