import { describe, expect, it } from 'vitest'
import { generateWorkout } from '@/domain/generator/generateWorkout'
import { LIBRARY, makeInput } from '@/domain/generator/testFixtures'
import type { GeneratedWorkout } from '@/domain/generator/types'
import {
  activeSeconds,
  addSet,
  buildSteps,
  canReplace,
  completeSet,
  createSession,
  currentStep,
  exerciseOutcome,
  extendRest,
  finishSession,
  goToSet,
  isEverythingDone,
  pauseSession,
  removeSet,
  reopenSet,
  replaceExercise,
  restRemaining,
  resumeSession,
  sessionOutcome,
  sessionProgress,
  setActual,
  skipExercise,
  skipRest,
  upcomingStep,
} from './session'
import type { ActiveSession } from './types'

const T0 = '2026-10-21T17:00:00.000Z'
const at = (sec: number) => new Date(Date.parse(T0) + sec * 1000).toISOString()
const measurementOf = (slug: string) => LIBRARY.find((e) => e.slug === slug)?.measurement ?? 'reps'

function idFactory() {
  let n = 0
  return () => `id-${++n}`
}

/** Kleines Workout von Hand: 2 normale Übungen + Zirkel mit 2 Übungen à 2 Runden. */
const workout: GeneratedWorkout = {
  generatorVersion: 'test',
  seed: 1,
  focus: 'mixed',
  intensity: 'moderate',
  targetDurationMin: 30,
  estimatedDurationMin: 30,
  explanation: [],
  recoverySuggested: false,
  blocks: [
    {
      type: 'main',
      items: [
        {
          exerciseSlug: 'back-squat',
          exerciseName: 'Kniebeuge',
          role: 'strength_main',
          estimatedSec: 600,
          sets: [
            { type: 'warmup', reps: 8, restSec: 60 },
            { type: 'working', reps: 5, weightKg: 100, restSec: 180 },
            { type: 'working', reps: 5, weightKg: 100, restSec: 180 },
          ],
        },
        {
          exerciseSlug: 'pull-up',
          exerciseName: 'Klimmzug',
          role: 'strength_main',
          estimatedSec: 300,
          sets: [{ type: 'working', reps: 8, restSec: 120 }],
        },
      ],
    },
    {
      type: 'conditioning',
      rounds: 2,
      items: [
        {
          exerciseSlug: 'hyrox-run',
          exerciseName: 'Lauf',
          role: 'run',
          estimatedSec: 700,
          sets: [
            { type: 'interval', distanceM: 1000, restSec: 0 },
            { type: 'interval', distanceM: 1000, restSec: 0 },
          ],
        },
        {
          exerciseSlug: 'hyrox-wall-balls',
          exerciseName: 'Wall Balls',
          role: 'station',
          estimatedSec: 300,
          sets: [
            { type: 'round', reps: 20, restSec: 90 },
            { type: 'round', reps: 20, restSec: 90 },
          ],
        },
      ],
    },
  ],
}

const start = () => createSession(workout, T0, idFactory(), measurementOf)
const ex = (s: ActiveSession, slug: string) => {
  const found = s.exercises.find((e) => e.exerciseSlug === slug)
  if (!found) throw new Error(slug)
  return found
}
/** Hakt den aktuellen Schritt ab. */
function completeCurrent(s: ActiveSession, sec = 0): ActiveSession {
  const step = currentStep(s)
  if (!step) throw new Error('kein offener Schritt')
  const exercise = s.exercises[step.exerciseIndex]!
  return completeSet(s, exercise.id, exercise.sets[step.setIndex]!.id, at(sec))
}

describe('createSession', () => {
  it('übernimmt alle Übungen und Sätze mit Vorgaben und eindeutigen IDs', () => {
    const s = start()
    expect(s.exercises.map((e) => e.exerciseSlug)).toEqual([
      'back-squat',
      'pull-up',
      'hyrox-run',
      'hyrox-wall-balls',
    ])
    expect(ex(s, 'back-squat').sets[1]?.target).toMatchObject({
      reps: 5,
      weightKg: 100,
      restSec: 180,
    })
    expect(ex(s, 'back-squat').measurement).toBe('weight_reps')
    const ids = [s.id, ...s.exercises.flatMap((e) => [e.id, ...e.sets.map((x) => x.id)])]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('funktioniert mit einem echten generierten Workout', () => {
    const generated = generateWorkout(makeInput({ focus: 'hyrox' }))
    const s = createSession(generated, T0, idFactory(), measurementOf)
    const totalSets = generated.blocks
      .flatMap((b) => b.items)
      .reduce((n, i) => n + i.sets.length, 0)
    expect(buildSteps(s.exercises)).toHaveLength(totalSets)
  })
})

describe('Ablauf', () => {
  it('geht normale Übungen Satz für Satz und Zirkel Runde für Runde durch', () => {
    const order = buildSteps(start().exercises).map((st) => `${st.exerciseIndex}.${st.setIndex}`)
    expect(order).toEqual(['0.0', '0.1', '0.2', '1.0', '2.0', '3.0', '2.1', '3.1'])
  })

  it('zeigt den aktuellen und den nächsten Satz', () => {
    const s = start()
    expect(currentStep(s)).toEqual({ exerciseIndex: 0, setIndex: 0 })
    expect(upcomingStep(s)).toEqual({ exerciseIndex: 0, setIndex: 1 })
  })

  it('springt nach dem Abhaken zum nächsten offenen Satz und startet die Pause', () => {
    const s = completeCurrent(start(), 30)
    expect(currentStep(s)).toEqual({ exerciseIndex: 0, setIndex: 1 })
    expect(s.rest).toEqual({ startedAt: at(30), durationSec: 60 })
  })

  it('übernimmt beim Abhaken die Vorgabe, eigene Eingaben haben Vorrang', () => {
    let s = start()
    const squat = ex(s, 'back-squat')
    s = setActual(s, squat.id, squat.sets[1]!.id, { weightKg: 102.5, rpe: 8 })
    s = completeSet(s, squat.id, squat.sets[1]!.id, at(10))
    expect(ex(s, 'back-squat').sets[1]).toMatchObject({
      actual: { weightKg: 102.5, reps: 5 },
      rpe: 8,
      completed: true,
      completedAt: at(10),
    })
  })

  it('kann zu einem beliebigen Satz springen und überspringt erledigte danach', () => {
    let s = start()
    const run = ex(s, 'hyrox-run')
    s = goToSet(s, run.id, run.sets[0]!.id)
    expect(currentStep(s)).toEqual({ exerciseIndex: 2, setIndex: 0 })
    s = completeCurrent(s)
    expect(currentStep(s)).toEqual({ exerciseIndex: 3, setIndex: 0 })
  })

  it('kehrt nach dem letzten Satz zu offenen Sätzen am Anfang zurück', () => {
    let s = start()
    const wb = ex(s, 'hyrox-wall-balls')
    s = goToSet(s, wb.id, wb.sets[1]!.id)
    s = completeCurrent(s)
    expect(currentStep(s)).toEqual({ exerciseIndex: 0, setIndex: 0 })
  })

  it('startet keine Pause nach dem allerletzten Satz', () => {
    let s = start()
    for (let i = 0; i < 8; i++) s = completeCurrent(s, i * 60)
    expect(isEverythingDone(s)).toBe(true)
    expect(s.rest).toBeUndefined()
    expect(currentStep(s)).toBeUndefined()
  })

  it('kann das Abhaken zurücknehmen', () => {
    let s = completeCurrent(start())
    const squat = ex(s, 'back-squat')
    s = reopenSet(s, squat.id, squat.sets[0]!.id)
    expect(ex(s, 'back-squat').sets[0]?.completed).toBe(false)
  })
})

describe('Sätze und Übungen ändern', () => {
  it('fügt Sätze hinzu und entfernt offene Sätze', () => {
    let s = start()
    const pull = ex(s, 'pull-up')
    s = addSet(s, pull.id, () => 'neu')
    expect(ex(s, 'pull-up').sets).toHaveLength(2)
    expect(ex(s, 'pull-up').sets[1]).toMatchObject({ id: 'neu', setNumber: 2, completed: false })
    s = removeSet(s, pull.id, 'neu')
    expect(ex(s, 'pull-up').sets).toHaveLength(1)
  })

  it('entfernt weder abgehakte Sätze noch den letzten Satz', () => {
    let s = completeCurrent(start())
    const squat = ex(s, 'back-squat')
    s = removeSet(s, squat.id, squat.sets[0]!.id)
    expect(ex(s, 'back-squat').sets).toHaveLength(3)
    const pull = ex(s, 'pull-up')
    s = removeSet(s, pull.id, pull.sets[0]!.id)
    expect(ex(s, 'pull-up').sets).toHaveLength(1)
  })

  it('überspringt Übungen und bewertet sie', () => {
    let s = start()
    s = skipExercise(s, ex(s, 'back-squat').id)
    expect(currentStep(s)).toEqual({ exerciseIndex: 1, setIndex: 0 })
    expect(exerciseOutcome(ex(s, 'back-squat'))).toBe('skipped')
  })

  it('tauscht nur Übungen ohne abgehakte Sätze', () => {
    let s = start()
    const pull = ex(s, 'pull-up')
    expect(canReplace(pull)).toBe(true)
    s = replaceExercise(
      s,
      pull.id,
      {
        slug: 'lat-pulldown',
        name: 'Latziehen',
        measurement: 'weight_reps',
        sets: [{ type: 'working', reps: 10, restSec: 75 }],
      },
      idFactory(),
    )
    expect(ex(s, 'lat-pulldown')).toMatchObject({
      replacedSlug: 'pull-up',
      measurement: 'weight_reps',
    })

    let t = completeCurrent(start())
    const squat = ex(t, 'back-squat')
    t = replaceExercise(
      t,
      squat.id,
      { slug: 'leg-press', name: 'Beinpresse', measurement: 'weight_reps', sets: [] },
      idFactory(),
    )
    expect(ex(t, 'back-squat').exerciseSlug).toBe('back-squat')
  })
})

describe('Pausen und Zeit', () => {
  it('zählt die Pausenzeit herunter und lässt sie verlängern oder überspringen', () => {
    const s = completeCurrent(start(), 0)
    expect(restRemaining(s, at(20))).toBe(40)
    expect(restRemaining(extendRest(s, 15), at(20))).toBe(55)
    expect(restRemaining(s, at(90))).toBe(0)
    expect(skipRest(s).rest).toBeUndefined()
  })

  it('friert Timer und Trainingszeit während einer Pause ein', () => {
    let s = completeCurrent(start(), 0) // Pause 60 s ab 0
    s = pauseSession(s, at(20))
    expect(restRemaining(s, at(300))).toBe(40)
    expect(activeSeconds(s, at(300))).toBe(20)
    s = resumeSession(s, at(320)) // 300 s pausiert
    expect(restRemaining(s, at(330))).toBe(30)
    expect(activeSeconds(s, at(330))).toBe(30)
  })

  it('beendet das Training und berechnet die aktive Zeit', () => {
    let s = pauseSession(start(), at(600))
    s = finishSession(s, at(900))
    expect(s.finishedAt).toBe(at(900))
    expect(activeSeconds(s, at(5000))).toBe(600)
  })
})

describe('Auswertung', () => {
  it('unterscheidet vollständig und teilweise absolvierte Trainings', () => {
    let s = start()
    expect(sessionOutcome(s)).toBe('partial')
    s = completeCurrent(s)
    expect(exerciseOutcome(ex(s, 'back-squat'))).toBe('partial')
    for (let i = 0; i < 7; i++) s = completeCurrent(s)
    expect(sessionOutcome(s)).toBe('completed')
  })

  it('zählt den Fortschritt ohne übersprungene Übungen', () => {
    let s = completeCurrent(start())
    s = skipExercise(s, ex(s, 'pull-up').id)
    expect(sessionProgress(s)).toEqual({ completedSets: 1, totalSets: 7 })
  })
})
