import type { TrainerAppointmentInput } from '@/api/weekPlans'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/** Fehlermeldungen für einen Trainer-Termin; leer = speicherbar. */
export function validateAppointment(input: TrainerAppointmentInput, today: string): string[] {
  const errors: string[] = []
  if (!input.title.trim()) errors.push('Titel angeben (z. B. „HYROX Class").')
  if (!TIME_PATTERN.test(input.startTime)) errors.push('Uhrzeit angeben.')
  if (input.date < today) errors.push('Termine lassen sich nur für heute oder später planen.')
  return errors
}

/** Vorauswahl: HYROX · 60 min · hart, 18:00 Uhr. */
export function defaultAppointment(date: string): TrainerAppointmentInput {
  return {
    date,
    startTime: '18:00',
    title: '',
    coach: null,
    focus: 'hyrox',
    intensity: 'hard',
    durationMin: 60,
  }
}
