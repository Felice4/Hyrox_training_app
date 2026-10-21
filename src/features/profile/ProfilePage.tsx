import { useEffect, useState, type ReactNode } from 'react'
import { useBlocker } from 'react-router'
import { UserIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import type { ProfileDetails } from '@/api/profile'
import { toSaveProfilePayload } from '@/domain/profile/payload'
import { toLocalIsoDate } from '@/lib/date'
import { validateDraft, type DraftErrors, type ProfileDraft } from './draft'
import { formatDecimalInput, profileDetailsToDraft } from './fromDetails'
import { BackgroundSection } from './sections/BackgroundSection'
import { ConditionsSection } from './sections/ConditionsSection'
import { GoalsSection } from './sections/GoalsSection'
import { PersonalSection } from './sections/PersonalSection'
import { PreferencesSection } from './sections/PreferencesSection'
import { useProfileDetails, useSaveProfile } from './useProfile'

const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
})

function formatLatest(value: { value: number; measuredOn: string } | null, unit: string) {
  if (!value) return undefined
  const date = dateFormat.format(new Date(`${value.measuredOn}T00:00:00`))
  return `Zuletzt: ${formatDecimalInput(value.value)} ${unit} am ${date}. Neuer Wert wird für heute gespeichert.`
}

export function ProfilePage() {
  const details = useProfileDetails()
  const [showSaved, setShowSaved] = useState(false)

  // Hinweis „Gespeichert" nach kurzer Zeit ausblenden
  useEffect(() => {
    if (!showSaved) return
    const timer = window.setTimeout(() => setShowSaved(false), 3000)
    return () => window.clearTimeout(timer)
  }, [showSaved])

  return (
    <>
      <PageHeader title="Profil & Ziele" subtitle="Deine Angaben für die Trainingsplanung" />
      {details.isPending ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : details.isError ? (
        <EmptyState icon={UserIcon} title="Profil konnte nicht geladen werden">
          <Button
            variant="secondary"
            className="mt-4"
            loading={details.isFetching}
            onClick={() => void details.refetch()}
          >
            Erneut versuchen
          </Button>
        </EmptyState>
      ) : (
        // Nach dem Speichern werden die Daten neu geladen → Formular startet mit den neuen Werten
        <ProfileForm
          key={details.dataUpdatedAt}
          details={details.data}
          showSaved={showSaved}
          onSaved={() => setShowSaved(true)}
          onEdit={() => setShowSaved(false)}
        />
      )}
    </>
  )
}

interface ProfileFormProps {
  details: ProfileDetails
  showSaved: boolean
  onSaved: () => void
  onEdit: () => void
}

function ProfileForm({ details, showSaved, onSaved, onEdit }: ProfileFormProps) {
  const saveProfile = useSaveProfile()
  const [initial] = useState(() => profileDetailsToDraft(details))
  const [draft, setDraft] = useState<ProfileDraft>(initial)
  const [errors, setErrors] = useState<DraftErrors>({})

  const isDirty = JSON.stringify(draft) !== JSON.stringify(initial)

  // Warnung, wenn die Seite mit ungespeicherten Änderungen verlassen wird
  const blocker = useBlocker(isDirty && !saveProfile.isPending)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Ungespeicherte Änderungen verwerfen?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  function update(patch: Partial<ProfileDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    onEdit()
    const changed = Object.keys(patch)
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([key]) => !changed.some((field) => key === field || key.startsWith(`${field}.`)),
        ),
      ),
    )
  }

  function handleSave() {
    const today = toLocalIsoDate()
    const result = validateDraft(draft, today, { requireWeight: false })
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    // mutateAsync statt mutate: Das Formular wird nach dem Neuladen der Daten neu aufgebaut,
    // die Rückmeldung muss trotzdem bei der Seite ankommen.
    saveProfile.mutateAsync(toSaveProfilePayload(result.values, today)).then(onSaved, () => {
      // Fehler zeigt saveProfile.isError an
    })
  }

  const sectionProps = { draft, errors, update }
  const hasErrors = Object.keys(errors).length > 0

  return (
    <div className="flex flex-col gap-4">
      <ProfileCard title="Über dich">
        <PersonalSection
          {...sectionProps}
          weightLabel="Neues Körpergewicht"
          weightHint={formatLatest(details.latestWeight, 'kg')}
          bodyFatHint={formatLatest(details.latestBodyFat, '%')}
        />
      </ProfileCard>
      <ProfileCard title="Hintergrund & Bestleistungen">
        <BackgroundSection {...sectionProps} />
      </ProfileCard>
      <ProfileCard title="Ziele">
        <GoalsSection {...sectionProps} />
      </ProfileCard>
      <ProfileCard title="Trainingsbedingungen">
        <ConditionsSection {...sectionProps} />
      </ProfileCard>
      <ProfileCard title="Übungsvorlieben">
        <PreferencesSection {...sectionProps} />
      </ProfileCard>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-10 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-md">
        <div aria-live="polite">
          {hasErrors && (
            <p role="alert" className="mb-2 text-sm text-danger">
              Bitte prüfe die markierten Angaben.
            </p>
          )}
          {saveProfile.isError && (
            <p role="alert" className="mb-2 text-sm text-danger">
              Speichern fehlgeschlagen. Bitte Internetverbindung prüfen.
            </p>
          )}
          {showSaved && !isDirty && (
            <p className="mb-2 text-sm text-accent">Änderungen gespeichert.</p>
          )}
        </div>
        <div className="flex gap-3">
          {isDirty && (
            <Button
              variant="secondary"
              disabled={saveProfile.isPending}
              onClick={() => {
                setDraft(initial)
                setErrors({})
              }}
            >
              Verwerfen
            </Button>
          )}
          <Button
            fullWidth
            disabled={!isDirty}
            loading={saveProfile.isPending}
            onClick={handleSave}
          >
            {isDirty ? 'Änderungen speichern' : 'Keine Änderungen'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 font-display text-2xl font-bold tracking-wide uppercase">{title}</h2>
      {children}
    </Card>
  )
}
