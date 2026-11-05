import { describe, expect, it } from 'vitest'
import type { ExportData, ExportSession } from '@/api/export'
import { csvFiles } from './tables'

const set = (n: number, reps: number, weight: string) => ({
  id: `set-${n}`,
  user_id: 'u',
  session_exercise_id: 'e1',
  set_number: n,
  set_type: 'working',
  target_reps: 5,
  target_weight_kg: 100,
  target_distance_m: null,
  target_duration_sec: null,
  target_calories: null,
  reps,
  weight_kg: weight as unknown as number,
  distance_m: null,
  duration_sec: null,
  calories: null,
  rpe: 8,
  completed: true,
  completed_at: null,
  created_at: '',
  updated_at: '',
})

const session = {
  id: 's1',
  user_id: 'u',
  started_at: new Date('2026-10-21T18:00:00').toISOString(),
  ended_at: new Date('2026-10-21T19:00:00').toISOString(),
  active_duration_sec: 3000,
  status: 'completed',
  focus: 'strength',
  intensity: 'hard',
  session_rpe: 8,
  notes: 'Gut; Knie ok',
  training_load: 400,
  session_exercises: [
    {
      id: 'e1',
      position: 0,
      exercise_name: 'Kniebeuge mit Langhantel',
      block: 'main',
      exercise: { slug: 'back-squat' },
      session_sets: [set(2, 5, '102.50'), set(1, 5, '100.00')],
    },
  ],
} as unknown as ExportSession

const data = {
  format: 'hyrox-coach-export',
  version: 1,
  exportedAt: '',
  profile: null,
  goals: null,
  sessions: [session],
  records: [],
  bodyMeasurements: [],
  readinessCheckins: [],
  weekPlans: [],
  plannedWorkouts: [],
  customExercises: [],
  exercisePreferences: [],
  skillGoals: [],
  skillStageLog: [],
} as ExportData

describe('csvFiles', () => {
  const files = csvFiles(data, '2026-11-03')

  it('liefert vier Dateien mit Datum im Namen und Zeilenanzahl', () => {
    expect(files.map((f) => [f.filename, f.rows])).toEqual([
      ['hyrox-coach-trainings-2026-11-03.csv', 1],
      ['hyrox-coach-saetze-2026-11-03.csv', 2],
      ['hyrox-coach-koerperwerte-2026-11-03.csv', 0],
      ['hyrox-coach-bestleistungen-2026-11-03.csv', 0],
    ])
  })

  it('schreibt Trainings mit deutschen Bezeichnungen', () => {
    const [header, row] = files[0]!.content.slice(1).split('\r\n')
    expect(header).toContain('Datum;Beginn;Ende;Aktive Minuten;Schwerpunkt')
    expect(row).toBe('2026-10-21;18:00;19:00;50;Kraft;Hart;vollständig;8;400;1;"Gut; Knie ok";s1')
  })

  it('schreibt Sätze sortiert und Zahlen aus der Datenbank mit Dezimalkomma', () => {
    const lines = files[1]!.content.slice(1).split('\r\n')
    expect(lines[1]).toContain(
      ';Kniebeuge mit Langhantel;back-squat;Hauptteil;1;Arbeitssatz;ja;5;100;',
    )
    expect(lines[2]).toContain(';2;Arbeitssatz;ja;5;102,5;')
  })
})
