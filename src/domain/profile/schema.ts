import { z } from 'zod'
import { EQUIPMENT, STRESS_REGIONS } from '@/data/exercises/vocabulary'
import { MANUAL_RECORD_KEYS } from '@/domain/records/presets'
import {
  EXPERIENCE_DURATIONS,
  HYROX_EXPERIENCES,
  SEXES,
  TRAINING_LEVELS,
  WEEKDAYS,
} from './vocabulary'

export const MIN_AGE = 14
export const MAX_AGE = 100

/** Alter in vollen Jahren an einem Stichtag (beide als „JJJJ-MM-TT"). */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number) as [number, number, number]
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number]
  const hadBirthday = tm > bm || (tm === bm && td >= bd)
  return ty - by - (hadBirthday ? 0 : 1)
}

const goalWeight = z
  .int('Bitte eine ganze Zahl angeben.')
  .min(0, 'Mindestens 0.')
  .max(100, 'Höchstens 100.')

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Höchstens ${max} Zeichen.`)
    .transform((text) => (text === '' ? undefined : text))
    .optional()

const slugList = z.array(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/))

/**
 * Prüfregeln für alle Profilangaben (Onboarding und Profilseite).
 * `today` („JJJJ-MM-TT") wird übergeben, damit die Altersprüfung testbar bleibt.
 */
export function createProfileSchema(today: string) {
  return z
    .object({
      // Persönliche Angaben
      displayName: z
        .string()
        .trim()
        .min(1, 'Bitte einen Namen eingeben.')
        .max(50, 'Höchstens 50 Zeichen.'),
      birthDate: z.iso
        .date('Bitte ein gültiges Datum eingeben.')
        .refine((date) => date <= today && ageOn(date, today) >= MIN_AGE, {
          error: `Du musst mindestens ${MIN_AGE} Jahre alt sein.`,
        })
        .refine((date) => ageOn(date, today) <= MAX_AGE, {
          error: 'Bitte das Geburtsdatum prüfen.',
        }),
      heightCm: z
        .number('Bitte die Körpergröße eingeben.')
        .min(100, 'Mindestens 100 cm.')
        .max(250, 'Höchstens 250 cm.'),
      weightKg: z
        .number('Bitte das Körpergewicht eingeben.')
        .min(30, 'Mindestens 30 kg.')
        .max(250, 'Höchstens 250 kg.')
        .optional(),
      bodyFatPct: z.number().min(3, 'Mindestens 3 %.').max(60, 'Höchstens 60 %.').optional(),
      sex: z.enum(SEXES).optional(),

      // Trainingshintergrund
      trainingLevel: z.enum(TRAINING_LEVELS, 'Bitte das Trainingsniveau wählen.'),
      hyroxExperience: z.enum(HYROX_EXPERIENCES, 'Bitte die HYROX-Erfahrung wählen.'),
      strengthExperience: z.enum(EXPERIENCE_DURATIONS, 'Bitte die Krafttraining-Erfahrung wählen.'),
      enduranceExperience: z.enum(
        EXPERIENCE_DURATIONS,
        'Bitte die Ausdauertraining-Erfahrung wählen.',
      ),
      fitnessNotes: optionalText(2000),
      hyroxBestTimeSec: z
        .int()
        .min(1800, 'Mindestens 30 Minuten.')
        .max(14400, 'Höchstens 4 Stunden.')
        .optional(),
      records: z.partialRecord(
        z.enum(MANUAL_RECORD_KEYS),
        z.number().positive('Der Wert muss größer als 0 sein.'),
      ),

      // Ziele
      goals: z
        .object({
          hypertrophy: goalWeight,
          strength: goalWeight,
          endurance: goalWeight,
          hyrox: goalWeight,
        })
        .refine((g) => g.hypertrophy + g.strength + g.endurance + g.hyrox > 0, {
          error: 'Mindestens ein Ziel muss eine Gewichtung über 0 haben.',
        }),

      // Trainingsbedingungen
      trainingDaysPerWeek: z.int().min(1, 'Mindestens 1 Tag.').max(7, 'Höchstens 7 Tage.'),
      preferredWeekdays: z
        .array(z.union(WEEKDAYS.map((day) => z.literal(day))))
        .refine((days) => new Set(days).size === days.length, { error: 'Doppelte Wochentage.' }),
      defaultDurationMin: z
        .int()
        .min(20, 'Mindestens 20 Minuten.')
        .max(150, 'Höchstens 150 Minuten.'),
      availableEquipment: z.array(z.enum(EQUIPMENT)),
      limitationRegions: z.array(z.enum(STRESS_REGIONS)),
      limitationNotes: optionalText(2000),
      preferredExercises: slugList,
      dislikedExercises: slugList,
    })
    .superRefine((values, ctx) => {
      const disliked = new Set(values.dislikedExercises)
      if (values.preferredExercises.some((slug) => disliked.has(slug))) {
        ctx.addIssue({
          code: 'custom',
          path: ['dislikedExercises'],
          message: 'Eine Übung kann nicht zugleich bevorzugt und unbeliebt sein.',
        })
      }
    })
}

export type ProfileFormInput = z.input<ReturnType<typeof createProfileSchema>>
export type ProfileFormValues = z.output<ReturnType<typeof createProfileSchema>>
