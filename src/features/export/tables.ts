import type { ExportData, ExportRecord, ExportSession } from '@/api/export'
import {
  BLOCK_TYPES,
  FOCUSES,
  INTENSITIES,
  type BlockType,
  type Focus,
  type Intensity,
} from '@/domain/generator/types'
import { toCsv, type CsvColumn } from '@/domain/export/csv'
import { BLOCK_LABELS, FOCUS_LABELS, INTENSITY_LABELS } from '@/features/generator/labels'
import { describeRecord } from '@/features/training/format'
import { toLocalIsoDate } from '@/lib/date'
import type { Tables } from '@/types/database'

const label = <T extends string>(values: readonly T[], labels: Record<T, string>, value: string) =>
  (values as readonly string[]).includes(value) ? labels[value as T] : value
const num = (value: number | string | null) => (value === null ? null : Number(value))
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
const date = (iso: string) => toLocalIsoDate(new Date(iso))

const SESSION_COLUMNS: CsvColumn<ExportSession>[] = [
  { header: 'Datum', value: (s) => date(s.started_at) },
  { header: 'Beginn', value: (s) => time(s.started_at) },
  { header: 'Ende', value: (s) => time(s.ended_at) },
  { header: 'Aktive Minuten', value: (s) => Math.round(s.active_duration_sec / 60) },
  { header: 'Schwerpunkt', value: (s) => label<Focus>(FOCUSES, FOCUS_LABELS, s.focus) },
  {
    header: 'Intensität',
    value: (s) => label<Intensity>(INTENSITIES, INTENSITY_LABELS, s.intensity),
  },
  { header: 'Status', value: (s) => (s.status === 'partial' ? 'teilweise' : 'vollständig') },
  { header: 'RPE', value: (s) => s.session_rpe },
  { header: 'Belastung', value: (s) => s.training_load },
  { header: 'Übungen', value: (s) => s.session_exercises.length },
  { header: 'Notiz', value: (s) => s.notes },
  { header: 'Training-ID', value: (s) => s.id },
]

interface SetRow {
  session: ExportSession
  exercise: ExportSession['session_exercises'][number]
  set: Tables<'session_sets'>
}

const SET_COLUMNS: CsvColumn<SetRow>[] = [
  { header: 'Datum', value: (r) => date(r.session.started_at) },
  { header: 'Schwerpunkt', value: (r) => label<Focus>(FOCUSES, FOCUS_LABELS, r.session.focus) },
  { header: 'Reihenfolge', value: (r) => r.exercise.position + 1 },
  { header: 'Übung', value: (r) => r.exercise.exercise_name },
  { header: 'Übung (Kennung)', value: (r) => r.exercise.exercise?.slug },
  { header: 'Block', value: (r) => label<BlockType>(BLOCK_TYPES, BLOCK_LABELS, r.exercise.block) },
  { header: 'Satz', value: (r) => r.set.set_number },
  { header: 'Satzart', value: (r) => (r.set.set_type === 'warmup' ? 'Aufwärmen' : 'Arbeitssatz') },
  { header: 'Geschafft', value: (r) => r.set.completed },
  { header: 'Wiederholungen', value: (r) => r.set.reps },
  { header: 'Gewicht (kg)', value: (r) => num(r.set.weight_kg) },
  { header: 'Strecke (m)', value: (r) => num(r.set.distance_m) },
  { header: 'Dauer (s)', value: (r) => r.set.duration_sec },
  { header: 'Kalorien', value: (r) => r.set.calories },
  { header: 'Satz-RPE', value: (r) => num(r.set.rpe) },
  { header: 'Vorgabe Wdh.', value: (r) => r.set.target_reps },
  { header: 'Vorgabe Gewicht (kg)', value: (r) => num(r.set.target_weight_kg) },
  { header: 'Vorgabe Strecke (m)', value: (r) => num(r.set.target_distance_m) },
  { header: 'Vorgabe Dauer (s)', value: (r) => r.set.target_duration_sec },
  { header: 'Training-ID', value: (r) => r.session.id },
]

const BODY_COLUMNS: CsvColumn<Tables<'body_measurements'>>[] = [
  { header: 'Datum', value: (m) => m.measured_on },
  { header: 'Körpergewicht (kg)', value: (m) => num(m.weight_kg) },
  { header: 'Körperfett (%)', value: (m) => num(m.body_fat_pct) },
  { header: 'Taille (cm)', value: (m) => num(m.waist_cm) },
  { header: 'Brust (cm)', value: (m) => num(m.chest_cm) },
  { header: 'Oberarm (cm)', value: (m) => num(m.arm_cm) },
  { header: 'Oberschenkel (cm)', value: (m) => num(m.thigh_cm) },
  { header: 'Notiz', value: (m) => m.notes },
]

const UNIT_LABELS: Record<string, string> = {
  kg: 'kg',
  reps: 'Wdh.',
  sec: 's',
  m: 'm',
  sec_per_km: 's/km',
}

const RECORD_COLUMNS: CsvColumn<ExportRecord>[] = [
  { header: 'Übung', value: (r) => r.exercise?.name },
  {
    header: 'Bestleistung',
    value: (r) =>
      describeRecord({
        record_type: r.record_type,
        context_key: r.context_key,
        value: Number(r.value),
      }).label,
  },
  { header: 'Wert', value: (r) => num(r.value) },
  { header: 'Einheit', value: (r) => UNIT_LABELS[r.unit] ?? r.unit },
  { header: 'Datum', value: (r) => date(r.achieved_at) },
  { header: 'Quelle', value: (r) => (r.source === 'manual' ? 'manuell' : 'Training') },
  { header: 'Übung (Kennung)', value: (r) => r.exercise?.slug },
]

export interface CsvFile {
  key: 'sessions' | 'sets' | 'body' | 'records'
  label: string
  description: string
  filename: string
  rows: number
  content: string
}

/** Die vier CSV-Dateien aus einem Export (älteste Einträge zuerst). */
export function csvFiles(data: ExportData, stamp: string): CsvFile[] {
  const sets: SetRow[] = data.sessions.flatMap((session) =>
    [...session.session_exercises]
      .sort((a, b) => a.position - b.position)
      .flatMap((exercise) =>
        [...exercise.session_sets]
          .sort((a, b) => a.set_number - b.set_number)
          .map((set) => ({ session, exercise, set })),
      ),
  )
  return [
    {
      key: 'sessions',
      label: 'Trainings',
      description: 'Eine Zeile pro Training: Datum, Dauer, Schwerpunkt, RPE, Notiz',
      filename: `hyrox-coach-trainings-${stamp}.csv`,
      rows: data.sessions.length,
      content: toCsv(data.sessions, SESSION_COLUMNS),
    },
    {
      key: 'sets',
      label: 'Sätze',
      description: 'Eine Zeile pro Satz mit Ist-Werten und Vorgabe – für eigene Auswertungen',
      filename: `hyrox-coach-saetze-${stamp}.csv`,
      rows: sets.length,
      content: toCsv(sets, SET_COLUMNS),
    },
    {
      key: 'body',
      label: 'Körperwerte',
      description: 'Gewicht, Körperfett und Umfänge je Messtag',
      filename: `hyrox-coach-koerperwerte-${stamp}.csv`,
      rows: data.bodyMeasurements.length,
      content: toCsv(data.bodyMeasurements, BODY_COLUMNS),
    },
    {
      key: 'records',
      label: 'Bestleistungen',
      description: 'Alle Bestleistungen aus Trainings und manuell eingetragene',
      filename: `hyrox-coach-bestleistungen-${stamp}.csv`,
      rows: data.records.length,
      content: toCsv(data.records, RECORD_COLUMNS),
    },
  ]
}
