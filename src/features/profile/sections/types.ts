import type { DraftErrors, ProfileDraft } from '../draft'

/** Gemeinsame Eigenschaften aller Formularabschnitte (Onboarding und Profilseite). */
export interface SectionProps {
  draft: ProfileDraft
  errors: DraftErrors
  update: (patch: Partial<ProfileDraft>) => void
}
