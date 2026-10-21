/**
 * Wertelisten für Profil und Onboarding mit deutschen Bezeichnungen.
 * Die Werte stehen so in der Datenbank (Tabelle profiles) – nie umbenennen.
 */

export const SEXES = ['female', 'male', 'diverse'] as const
export type Sex = (typeof SEXES)[number]
export const SEX_LABELS: Record<Sex, string> = {
  female: 'Weiblich',
  male: 'Männlich',
  diverse: 'Divers',
}

export const TRAINING_LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export type TrainingLevel = (typeof TRAINING_LEVELS)[number]
export const TRAINING_LEVEL_LABELS: Record<TrainingLevel, string> = {
  beginner: 'Anfänger',
  intermediate: 'Fortgeschritten',
  advanced: 'Erfahren',
}
export const TRAINING_LEVEL_HINTS: Record<TrainingLevel, string> = {
  beginner: 'Weniger als 1 Jahr regelmäßiges Training',
  intermediate: '1–3 Jahre regelmäßiges Training, Grundübungen sicher',
  advanced: 'Mehr als 3 Jahre, strukturiertes Training gewohnt',
}

export const HYROX_EXPERIENCES = ['none', 'some', 'competed'] as const
export type HyroxExperience = (typeof HYROX_EXPERIENCES)[number]
export const HYROX_EXPERIENCE_LABELS: Record<HyroxExperience, string> = {
  none: 'Noch keine',
  some: 'Schon trainiert',
  competed: 'Wettkampf absolviert',
}

/** Erfahrung mit Kraft- bzw. Ausdauertraining. */
export const EXPERIENCE_DURATIONS = ['none', 'under_1y', '1_3y', 'over_3y'] as const
export type ExperienceDuration = (typeof EXPERIENCE_DURATIONS)[number]
export const EXPERIENCE_DURATION_LABELS: Record<ExperienceDuration, string> = {
  none: 'Keine',
  under_1y: 'Unter 1 Jahr',
  '1_3y': '1–3 Jahre',
  over_3y: 'Über 3 Jahre',
}

/** ISO-Wochentage: 1 = Montag … 7 = Sonntag. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const
export type Weekday = (typeof WEEKDAYS)[number]
export const WEEKDAY_SHORT_LABELS: Record<Weekday, string> = {
  1: 'Mo',
  2: 'Di',
  3: 'Mi',
  4: 'Do',
  5: 'Fr',
  6: 'Sa',
  7: 'So',
}

/** Die vier Hauptziele (Spalten weight_* in training_goals). */
export const GOALS = ['hypertrophy', 'strength', 'endurance', 'hyrox'] as const
export type Goal = (typeof GOALS)[number]
export const GOAL_LABELS: Record<Goal, string> = {
  hypertrophy: 'Muskelaufbau',
  strength: 'Kraft',
  endurance: 'Ausdauer',
  hyrox: 'HYROX-Leistung',
}
