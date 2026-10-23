import { useState } from 'react'
import { Navigate } from 'react-router'
import type { SaveSessionResult } from '@/api/sessions'
import { Button } from '@/components/ui/Button'
import { FullScreenSpinner } from '@/components/ui/Spinner'
import type { SessionSummary } from '@/domain/session/session'
import { useAuth } from '@/features/auth/authContext'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { toGeneratorProfile } from '@/features/generator/inputs'
import { useProfileDetails } from '@/features/profile/useProfile'
import { clearDraft } from '@/lib/localDraft'
import { ActiveWorkout } from './ActiveWorkout'
import { FinishScreen, SavedScreen } from './FinishScreen'
import { storageKeys } from './storage'
import { useActiveSession } from './useActiveSession'

/** Trainingsmodus (Vollbild ohne Navigation): laufendes Training, Abschluss, Bestätigung. */
export function TrainingPage() {
  const auth = useAuth()
  const { session, apply, discard } = useActiveSession()
  const details = useProfileDetails()
  const { catalog } = useExerciseCatalog()
  const [saved, setSaved] = useState<{ result: SaveSessionResult; summary: SessionSummary } | null>(
    null,
  )

  if (saved) {
    return (
      <SavedScreen
        result={saved.result}
        summary={saved.summary}
        catalog={catalog.data?.exercises ?? []}
      />
    )
  }
  if (!session) return <Navigate to="/training" replace />
  if (details.isPending || catalog.isPending) {
    return <FullScreenSpinner label="Training wird geladen …" />
  }
  if (details.isError || catalog.isError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-3xl font-bold uppercase">Keine Verbindung</h1>
        <p className="text-fg-muted">
          Dein Training ist auf diesem Gerät gesichert. Übungsdaten konnten nicht geladen werden.
        </p>
        <Button
          onClick={() => {
            void details.refetch()
            void catalog.refetch()
          }}
        >
          Erneut versuchen
        </Button>
      </main>
    )
  }

  if (session.finishedAt) {
    return (
      <FinishScreen
        session={session}
        apply={apply}
        onSaved={(result, summary) => {
          setSaved({ result, summary })
          // Gespeichert → lokale Kopien des Trainings und des erzeugten Workouts entfernen
          discard()
          if (auth.status === 'signedIn') {
            clearDraft(storageKeys.generatedWorkout(auth.session.user.id))
          }
        }}
        // Verwerfen: nur das laufende Training löschen. Ohne Training leitet diese Seite
        // zur Training-Seite weiter; das erzeugte Workout bleibt dort zum erneuten Start.
        onDiscard={discard}
      />
    )
  }

  return (
    <ActiveWorkout
      session={session}
      apply={apply}
      catalog={catalog.data.exercises}
      profile={toGeneratorProfile(details.data)}
    />
  )
}
