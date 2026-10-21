import type { ComponentType } from 'react'
import { BackgroundSection } from '@/features/profile/sections/BackgroundSection'
import { ConditionsSection } from '@/features/profile/sections/ConditionsSection'
import { GoalsSection } from '@/features/profile/sections/GoalsSection'
import { PersonalSection } from '@/features/profile/sections/PersonalSection'
import { PreferencesSection } from '@/features/profile/sections/PreferencesSection'
import type { SectionProps } from '@/features/profile/sections/types'

export interface OnboardingStep {
  title: string
  subtitle: string
  /** Entwurfsfelder dieses Schritts – nur deren Fehler blockieren „Weiter". */
  fields: readonly string[]
  Section: ComponentType<SectionProps>
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    title: 'Über dich',
    subtitle: 'Ein paar Eckdaten für deine Trainingsplanung.',
    fields: ['displayName', 'birthDate', 'heightCm', 'weightKg', 'bodyFatPct', 'sex'],
    Section: PersonalSection,
  },
  {
    title: 'Dein Hintergrund',
    subtitle: 'Damit Umfang und Schwierigkeit von Anfang an passen.',
    fields: [
      'trainingLevel',
      'hyroxExperience',
      'strengthExperience',
      'enduranceExperience',
      'fitnessNotes',
      'hyroxBestTime',
      'records',
    ],
    Section: BackgroundSection,
  },
  {
    title: 'Deine Ziele',
    subtitle: 'Wie wichtig ist dir was?',
    fields: ['goals'],
    Section: GoalsSection,
  },
  {
    title: 'Trainingsbedingungen',
    subtitle: 'Wann, wie lange und womit du trainierst.',
    fields: [
      'trainingDaysPerWeek',
      'preferredWeekdays',
      'defaultDurationMin',
      'availableEquipment',
      'limitationRegions',
      'limitationNotes',
    ],
    Section: ConditionsSection,
  },
  {
    title: 'Vorlieben',
    subtitle: 'Übungen, die du besonders magst – oder lieber meidest.',
    fields: ['preferredExercises', 'dislikedExercises'],
    Section: PreferencesSection,
  },
]
