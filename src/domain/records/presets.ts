/**
 * Bestleistungen, die im Onboarding bzw. Profil von Hand eingetragen werden können.
 * Jede Vorlage gehört zu einer Bibliotheksübung und legt fest, unter welchen
 * Bedingungen der Wert gilt (z. B. 1 Wiederholung, 1000 m). Nur Werte mit gleichen
 * Bedingungen werden später miteinander verglichen.
 */

export const RECORD_TYPES = [
  'max_weight',
  'estimated_1rm',
  'max_reps',
  'best_time',
  'max_distance',
  'best_pace',
] as const
export type RecordType = (typeof RECORD_TYPES)[number]

export type RecordUnit = 'kg' | 'reps' | 'sec' | 'm' | 'sec_per_km'

/** Bedingungen eines Rekords, z. B. { reps: 1 } oder { distance_m: 1000 }. */
export type RecordContext = Record<string, number>

export interface ManualRecordPreset {
  key: string
  label: string
  exerciseSlug: string
  recordType: RecordType
  context: RecordContext
  unit: RecordUnit
}

export const MANUAL_RECORD_PRESETS = [
  {
    key: 'back_squat_1rm',
    label: 'Kniebeuge – Maximalgewicht (1 Wdh.)',
    exerciseSlug: 'back-squat',
    recordType: 'max_weight',
    context: { reps: 1 },
    unit: 'kg',
  },
  {
    key: 'deadlift_1rm',
    label: 'Kreuzheben – Maximalgewicht (1 Wdh.)',
    exerciseSlug: 'deadlift',
    recordType: 'max_weight',
    context: { reps: 1 },
    unit: 'kg',
  },
  {
    key: 'bench_press_1rm',
    label: 'Bankdrücken – Maximalgewicht (1 Wdh.)',
    exerciseSlug: 'bench-press',
    recordType: 'max_weight',
    context: { reps: 1 },
    unit: 'kg',
  },
  {
    key: 'pull_up_max_reps',
    label: 'Klimmzüge am Stück',
    exerciseSlug: 'pull-up',
    recordType: 'max_reps',
    context: {},
    unit: 'reps',
  },
  {
    key: 'run_1k',
    label: '1 km Lauf',
    exerciseSlug: 'hyrox-run',
    recordType: 'best_time',
    context: { distance_m: 1000 },
    unit: 'sec',
  },
  {
    key: 'run_5k',
    label: '5 km Lauf',
    exerciseSlug: 'run-5k-time-trial',
    recordType: 'best_time',
    context: { distance_m: 5000 },
    unit: 'sec',
  },
  {
    key: 'row_1k',
    label: '1000 m Rudern',
    exerciseSlug: 'hyrox-row',
    recordType: 'best_time',
    context: { distance_m: 1000 },
    unit: 'sec',
  },
  {
    key: 'skierg_1k',
    label: '1000 m SkiErg',
    exerciseSlug: 'hyrox-skierg',
    recordType: 'best_time',
    context: { distance_m: 1000 },
    unit: 'sec',
  },
] as const satisfies readonly ManualRecordPreset[]

export type ManualRecordKey = (typeof MANUAL_RECORD_PRESETS)[number]['key']

export const MANUAL_RECORD_KEYS = MANUAL_RECORD_PRESETS.map((p) => p.key) as ManualRecordKey[]

/**
 * Normalisierte Form der Bedingungen für den eindeutigen Schlüssel in der Datenbank:
 * Schlüssel alphabetisch, „k=v" mit „;" verbunden. Leere Bedingungen → "".
 */
export function contextKey(context: RecordContext): string {
  return Object.keys(context)
    .sort()
    .map((key) => `${key}=${context[key]}`)
    .join(';')
}
