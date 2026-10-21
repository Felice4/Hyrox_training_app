import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { FullScreenSpinner } from '@/components/ui/Spinner'
import { toSaveProfilePayload } from '@/domain/profile/payload'
import { useAuth } from '@/features/auth/authContext'
import {
  errorsForFields,
  restoreDraft,
  createEmptyDraft,
  validateDraft,
  type DraftErrors,
  type ProfileDraft,
} from '@/features/profile/draft'
import { useProfile, useSaveProfile } from '@/features/profile/useProfile'
import { toLocalIsoDate } from '@/lib/date'
import { clearDraft, loadDraft, saveDraft } from '@/lib/localDraft'
import { ONBOARDING_STEPS } from './steps'

export function OnboardingPage() {
  const auth = useAuth()
  const profile = useProfile()

  if (profile.isPending) return <FullScreenSpinner label="Profil wird geladen …" />
  if (profile.data?.onboarding_completed_at) return <Navigate to="/" replace />

  const userId = auth.status === 'signedIn' ? auth.session.user.id : 'unbekannt'
  return <OnboardingWizard storageKey={`hyrox-coach:onboarding-draft:${userId}`} />
}

function OnboardingWizard({ storageKey }: { storageKey: string }) {
  const navigate = useNavigate()
  const saveProfile = useSaveProfile()
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    loadDraft(storageKey, createEmptyDraft(), restoreDraft),
  )
  const [stepIndex, setStepIndex] = useState(0)
  const [errors, setErrors] = useState<DraftErrors>({})
  const topRef = useRef<HTMLDivElement>(null)

  const step = ONBOARDING_STEPS[stepIndex] ?? ONBOARDING_STEPS[0]!
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1

  // Entwurf bei jeder Änderung lokal sichern (übersteht Neuladen der Seite)
  useEffect(() => saveDraft(storageKey, draft), [storageKey, draft])

  const goTo = (index: number) => {
    setStepIndex(index)
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  function update(patch: Partial<ProfileDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    // Fehler der geänderten Felder ausblenden, bis erneut geprüft wird
    const changed = Object.keys(patch)
    setErrors((current) => {
      const remaining = { ...current }
      for (const key of Object.keys(remaining)) {
        if (changed.some((field) => key === field || key.startsWith(`${field}.`))) {
          delete remaining[key]
        }
      }
      return remaining
    })
  }

  function handleNext() {
    const today = toLocalIsoDate()
    const result = validateDraft(draft, today, { requireWeight: true })
    const stepErrors = result.ok ? {} : errorsForFields(result.errors, step.fields)

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      topRef.current?.scrollIntoView({ block: 'start' })
      return
    }
    setErrors({})
    if (!isLast) {
      goTo(stepIndex + 1)
      return
    }
    if (!result.ok) {
      // Sicherheitsnetz: Fehler in einem früheren Schritt → dorthin springen
      const firstInvalid = ONBOARDING_STEPS.findIndex(
        (s) => Object.keys(errorsForFields(result.errors, s.fields)).length > 0,
      )
      setErrors(result.errors)
      goTo(Math.max(firstInvalid, 0))
      return
    }
    saveProfile.mutate(toSaveProfilePayload(result.values, today), {
      onSuccess: () => {
        clearDraft(storageKey)
        void navigate('/', { replace: true })
      },
    })
  }

  const { Section } = step
  const progress = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <div ref={topRef} className="scroll-mt-6" />
      <header className="mb-6">
        <p className="text-sm text-fg-muted">
          Einrichtung · Schritt {stepIndex + 1} von {ONBOARDING_STEPS.length}
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={ONBOARDING_STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label="Fortschritt der Einrichtung"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <h1 className="mt-5 font-display text-4xl font-bold tracking-wide uppercase">
          {step.title}
        </h1>
        <p className="mt-1 text-fg-muted">{step.subtitle}</p>
      </header>

      {Object.keys(errors).length > 0 && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          Bitte prüfe die markierten Angaben.
        </p>
      )}

      <main className="flex-1 pb-8">
        <Section draft={draft} errors={errors} update={update} />
      </main>

      <footer className="sticky bottom-0 -mx-4 border-t border-line bg-canvas/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-md">
        {saveProfile.isError && (
          <p role="alert" className="mb-3 text-sm text-danger">
            Speichern fehlgeschlagen. Bitte Internetverbindung prüfen und erneut versuchen.
          </p>
        )}
        <div className="flex gap-3">
          {stepIndex > 0 && (
            <Button
              variant="secondary"
              onClick={() => goTo(stepIndex - 1)}
              disabled={saveProfile.isPending}
            >
              Zurück
            </Button>
          )}
          <Button fullWidth onClick={handleNext} loading={saveProfile.isPending}>
            {isLast ? 'Einrichtung abschließen' : 'Weiter'}
          </Button>
        </div>
      </footer>
    </div>
  )
}
