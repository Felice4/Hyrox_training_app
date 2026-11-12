import { describe, expect, it } from 'vitest'
import {
  addExercise,
  addSet,
  entryStart,
  entryToSession,
  intensityFromRpe,
  moveExercise,
  newEntry,
  removeExercise,
  removeSet,
  restoreEntryDraft,
  setBlock,
  toEntryPayload,
  updateSet,
  validateEntry,
  type ManualEntry,
} from './entry'

function ids() {
  let n = 0
  return () => `id-${++n}`
}

function filledEntry(): ManualEntry {
  const newId = ids()
  let entry = newEntry({
    id: 'session-1',
    source: 'trainer',
    date: '2026-11-10',
    time: '18:00',
    title: ' HYROX Class ',
    coach: '',
  })
  entry = addExercise(
    entry,
    { slug: 'back-squat', name: 'Kniebeuge', measurement: 'weight_reps' },
    newId,
  )
  const squat = entry.exercises[0]!
  entry = updateSet(entry, squat.id, squat.sets[0]!.id, { weightKg: 100, reps: 5 })
  entry = addSet(entry, squat.id, newId)
  entry = addExercise(entry, { slug: 'wall-balls', name: 'Wall Balls', measurement: 'reps' }, newId)
  const wallBalls = entry.exercises[1]!
  entry = updateSet(entry, wallBalls.id, wallBalls.sets[0]!.id, { reps: 30, weightKg: 6 })
  return { ...entry, sessionRpe: 8, durationMin: 60 }
}

describe('intensityFromRpe', () => {
  it('ordnet die Anstrengung ein', () => {
    expect(intensityFromRpe(3)).toBe('easy')
    expect(intensityFromRpe(4)).toBe('easy')
    expect(intensityFromRpe(5)).toBe('moderate')
    expect(intensityFromRpe(7)).toBe('moderate')
    expect(intensityFromRpe(8)).toBe('hard')
    expect(intensityFromRpe(undefined)).toBe('moderate')
  })
})

describe('Formular-Bearbeitung', () => {
  it('Trainer-Session startet mit HYROX, eigenes Workout mit Kraft', () => {
    expect(newEntry({ id: 'a', source: 'trainer', date: '2026-11-10', time: '18:00' }).focus).toBe(
      'hyrox',
    )
    expect(newEntry({ id: 'a', source: 'manual', date: '2026-11-10', time: '18:00' }).focus).toBe(
      'strength',
    )
  })

  it('neuer Satz übernimmt die Werte des letzten Satzes', () => {
    const entry = filledEntry()
    const squat = entry.exercises[0]!
    expect(squat.sets).toHaveLength(2)
    expect(squat.sets[1]!.values).toEqual({ weightKg: 100, reps: 5 })
    expect(squat.sets[1]!.id).not.toBe(squat.sets[0]!.id)
  })

  it('verschiebt, entfernt und ändert den Block', () => {
    let entry = filledEntry()
    const [squat, wallBalls] = entry.exercises
    entry = moveExercise(entry, wallBalls!.id, -1)
    expect(entry.exercises.map((e) => e.exerciseSlug)).toEqual(['wall-balls', 'back-squat'])
    expect(moveExercise(entry, wallBalls!.id, -1)).toBe(entry)
    entry = setBlock(entry, squat!.id, 'warmup')
    expect(entry.exercises[1]!.block).toBe('warmup')
    entry = removeSet(entry, squat!.id, squat!.sets[0]!.id)
    expect(entry.exercises[1]!.sets).toHaveLength(1)
    entry = removeExercise(entry, wallBalls!.id)
    expect(entry.exercises.map((e) => e.exerciseSlug)).toEqual(['back-squat'])
  })
})

describe('validateEntry', () => {
  it('vollständiger Eintrag ist gültig', () => {
    expect(validateEntry(filledEntry(), '2026-11-12')).toEqual([])
  })

  it('meldet fehlende Angaben', () => {
    const entry: ManualEntry = {
      ...newEntry({ id: 'a', source: 'trainer', date: '2026-11-13', time: '25:00' }),
      durationMin: 0,
    }
    const errors = validateEntry(entry, '2026-11-12')
    expect(errors).toContain('Ein Training in der Zukunft kann nicht eingetragen werden.')
    expect(errors).toContain('Uhrzeit fehlt.')
    expect(errors).toContain('Dauer zwischen 1 und 600 Minuten angeben.')
    expect(errors).toContain('Anstrengung (RPE) auswählen.')
    expect(errors).toContain('Titel der Trainer-Session angeben (z. B. „HYROX Class").')
    expect(errors).toContain('Mindestens eine Übung hinzufügen.')
  })

  it('jeder Satz braucht einen Messwert der Übung', () => {
    let entry = filledEntry()
    const squat = entry.exercises[0]!
    entry = updateSet(entry, squat.id, squat.sets[1]!.id, { weightKg: 0, reps: undefined })
    expect(validateEntry(entry, '2026-11-12')).toEqual([
      'Kniebeuge: jeder Satz braucht einen Wert.',
    ])
    entry = removeSet(entry, squat.id, squat.sets[0]!.id)
    entry = removeSet(entry, squat.id, squat.sets[1]!.id)
    expect(validateEntry(entry, '2026-11-12')).toEqual([
      'Kniebeuge: mindestens einen Satz eintragen.',
    ])
  })
})

describe('entryToSession / toEntryPayload', () => {
  it('wandelt in ein beendetes Training um', () => {
    const entry = filledEntry()
    const session = entryToSession(entry)
    expect(session.id).toBe('session-1')
    expect(session.startedAt).toBe(entryStart(entry))
    expect(Date.parse(session.finishedAt!) - Date.parse(session.startedAt)).toBe(60 * 60_000)
    expect(session.exercises.every((e) => e.sets.every((s) => s.completed))).toBe(true)
    // Nur Messwerte der Übung (Wall Balls: Wdh., Gewicht wird nicht erfasst)
    expect(session.exercises[1]!.sets[0]!.actual).toEqual({ reps: 30 })
    expect(session.workout.generatorVersion).toBe('manual-1')
    expect(session.workout.intensity).toBe('hard')
  })

  it('Nutzlast enthält Herkunft, Titel, Belastung und Bestleistungen', () => {
    const payload = toEntryPayload({ ...filledEntry(), plannedWorkoutId: 'planned-1' })
    expect(payload.session).toMatchObject({
      id: 'session-1',
      source: 'trainer',
      title: 'HYROX Class',
      coach: null,
      status: 'completed',
      focus: 'hyrox',
      intensity: 'hard',
      session_rpe: 8,
      active_duration_sec: 3600,
      training_load: 480,
      planned_workout_id: 'planned-1',
    })
    expect(payload.exercises.map((e) => e.block)).toEqual(['main', 'main'])
    expect(payload.records.map((r) => `${r.exercise_slug}:${r.record_type}`)).toEqual(
      expect.arrayContaining([
        'back-squat:estimated_1rm',
        'back-squat:max_weight',
        'wall-balls:max_reps',
      ]),
    )
  })

  it('gleicher Eintrag → gleiche IDs (Bearbeiten legt nichts doppelt an)', () => {
    const entry = filledEntry()
    const a = toEntryPayload(entry)
    const b = toEntryPayload({ ...entry, notes: 'geändert' })
    expect(b.exercises.map((e) => e.id)).toEqual(a.exercises.map((e) => e.id))
    expect(b.exercises.flatMap((e) => e.sets.map((s) => s.id))).toEqual(
      a.exercises.flatMap((e) => e.sets.map((s) => s.id)),
    )
  })

  it('Warm-up zählt nicht für Bestleistungen', () => {
    let entry = filledEntry()
    entry = setBlock(entry, entry.exercises[1]!.id, 'warmup')
    expect(toEntryPayload(entry).records.some((r) => r.exercise_slug === 'wall-balls')).toBe(false)
  })
})

describe('restoreEntryDraft', () => {
  it('stellt einen gültigen Entwurf wieder her', () => {
    const draft = { key: '2026-11-10:trainer', entry: filledEntry() }
    expect(restoreEntryDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft)
  })

  it('verwirft Beschädigtes', () => {
    expect(restoreEntryDraft(null)).toBeNull()
    expect(restoreEntryDraft({ key: 'x' })).toBeNull()
    expect(restoreEntryDraft({ key: 'x', entry: { ...filledEntry(), source: 'app' } })).toBeNull()
    const entry = filledEntry()
    expect(
      restoreEntryDraft({
        key: 'x',
        entry: { ...entry, exercises: [{ ...entry.exercises[0], block: 'accessory' }] },
      }),
    ).toBeNull()
  })
})
