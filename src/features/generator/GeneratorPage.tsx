import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { DumbbellIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import type { CatalogExercise } from '@/api/exercises'
import type { ProfileDetails } from '@/api/profile'
import {
  ruleBasedGenerator,
  swapExercise,
  type HistorySession,
  type WorkoutRequest,
} from '@/domain/generator'
import { useAuth } from '@/features/auth/authContext'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { useTrainingHistory } from '@/features/training/useTrainingHistory'
import { createSession } from '@/domain/session/session'
import { storageKeys } from '@/features/training/storage'
import {
  readActiveSession,
  useActiveSessionKey,
  writeActiveSession,
} from '@/features/training/useActiveSession'
import { useProfileDetails } from '@/features/profile/useProfile'
import { clearDraft, loadDraft, saveDraft } from '@/lib/localDraft'
import { GeneratorForm } from './GeneratorForm'
import {
  newSeed,
  restoreStoredWorkout,
  toGeneratorProfile,
  toGoalWeights,
  type StoredWorkout,
} from './inputs'
import { WorkoutPreview } from './WorkoutPreview'

export function GeneratorPage() {
  const details = useProfileDetails()
  const { catalog } = useExerciseCatalog()
  // Verlauf für Ermüdung, Abwechslung, Belastung und Gewichtsvorschläge
  const history = useTrainingHistory()

  return (
    <>
      <PageHeader title="Training" subtitle="Workout erstellen und starten" />
      {details.isPending || catalog.isPending || history.isPending ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : details.isError || catalog.isError ? (
        <EmptyState icon={DumbbellIcon} title="Daten konnten nicht geladen werden">
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              void details.refetch()
              void catalog.refetch()
            }}
          >
            Erneut versuchen
          </Button>
        </EmptyState>
      ) : (
        <>
          {history.isError && (
            <p
              role="status"
              className="mb-4 rounded-xl border border-hyrox/40 bg-hyrox/10 px-4 py-3 text-sm"
            >
              Dein Trainingsverlauf konnte nicht geladen werden. Workouts werden ohne Verlauf
              erstellt (keine Gewichtsvorschläge, keine Ermüdung).
            </p>
          )}
          <Generator
            details={details.data}
            exercises={catalog.data.exercises}
            history={history.data ?? []}
          />
        </>
      )}
    </>
  )
}

function Generator({
  details,
  exercises,
  history,
}: {
  details: ProfileDetails
  exercises: CatalogExercise[]
  history: readonly HistorySession[]
}) {
  const auth = useAuth()
  const navigate = useNavigate()
  const storageKey = storageKeys.generatedWorkout(
    auth.status === 'signedIn' ? auth.session.user.id : 'unbekannt',
  )
  const activeKey = useActiveSessionKey()
  const [hasActive] = useState(() => readActiveSession(activeKey) !== null)
  const profile = toGeneratorProfile(details)
  const goals = toGoalWeights(details)

  const [stored, setStored] = useState<StoredWorkout | null>(() =>
    loadDraft(storageKey, null, restoreStoredWorkout),
  )
  const [editing, setEditing] = useState(stored === null)

  useEffect(() => {
    if (stored) saveDraft(storageKey, stored)
    else clearDraft(storageKey)
  }, [storageKey, stored])

  const defaultRequest: WorkoutRequest = {
    durationMin: details.profile?.default_duration_min ?? 60,
    focus: 'hyrox',
    intensity: 'moderate',
    readiness: { kind: 'quick', level: 'normal' },
  }

  function generate(request: WorkoutRequest) {
    const workout = ruleBasedGenerator.generateWorkout({
      request,
      profile,
      goals,
      exercises,
      history,
      now: new Date().toISOString(),
      seed: newSeed(),
    })
    setStored({ request, workout })
    setEditing(false)
    window.scrollTo({ top: 0 })
  }

  function startTraining(workout: StoredWorkout['workout']) {
    if (
      readActiveSession(activeKey) &&
      !window.confirm('Es läuft bereits ein Training. Dieses verwerfen und neu starten?')
    ) {
      return
    }
    const measurementOf = (slug: string) =>
      exercises.find((e) => e.slug === slug)?.measurement ?? 'reps'
    const session = createSession(
      workout,
      new Date().toISOString(),
      () => crypto.randomUUID(),
      measurementOf,
    )
    writeActiveSession(activeKey, session)
    void navigate('/training/active')
  }

  const activeBanner = hasActive && (
    <Link
      to="/training/active"
      className="mb-4 flex min-h-14 items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-4 font-semibold"
    >
      Laufendes Training fortsetzen
      <span aria-hidden="true">→</span>
    </Link>
  )

  if (editing || !stored) {
    return (
      <>
        {activeBanner}
        <GeneratorForm
          initial={stored?.request ?? defaultRequest}
          profileEquipment={profile.availableEquipment}
          onSubmit={generate}
        />
      </>
    )
  }

  const slugsInWorkout = stored.workout.blocks.flatMap((b) => b.items.map((i) => i.exerciseSlug))

  return (
    <>
      {activeBanner}
      <WorkoutPreview
        workout={stored.workout}
        onStart={() => startTraining(stored.workout)}
        onRegenerate={() => generate(stored.request)}
        onEdit={() => setEditing(true)}
        onSwitchToRecovery={() =>
          generate({ ...stored.request, focus: 'recovery', intensity: 'easy' })
        }
        alternativesFor={(slug) =>
          ruleBasedGenerator.suggestAlternatives({
            exerciseSlug: slug,
            exercises,
            profile,
            unavailableEquipment: stored.request.unavailableEquipment,
            excludeSlugs: slugsInWorkout,
          })
        }
        onSwap={(blockIndex, itemIndex, suggestion) =>
          setStored({
            ...stored,
            workout: swapExercise(stored.workout, blockIndex, itemIndex, suggestion.exercise, {
              level: profile.trainingLevel,
              history,
            }),
          })
        }
      />
    </>
  )
}
