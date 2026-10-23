import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CalendarIcon, ChevronLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import type { WorkoutRequest } from '@/domain/generator'
import { GeneratorForm } from '@/features/generator/GeneratorForm'
import { newSeed, toGeneratorProfile } from '@/features/generator/inputs'
import { toLocalIsoDate } from '@/lib/date'
import { formatLongDay } from './format'
import { generateForDay } from './planning'
import { useAddPlannedWorkout } from './usePlannedWorkouts'
import { usePlanningData } from './usePlanningData'
import { weekStartOf } from './week'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Spontane Einheit für einen Tag ab heute hinzufügen (`/calendar/new/:date`). */
export function NewPlannedWorkoutPage() {
  const { date = '' } = useParams()
  const navigate = useNavigate()
  const [today] = useState(() => toLocalIsoDate())
  const planning = usePlanningData()
  const add = useAddPlannedWorkout()
  const valid = DATE_PATTERN.test(date) && date >= today

  const backLink = (
    <Link
      to={valid ? `/calendar?week=${weekStartOf(date)}` : '/calendar'}
      className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
    >
      <ChevronLeftIcon width={18} height={18} />
      Kalender
    </Link>
  )

  if (!valid) {
    return (
      <>
        {backLink}
        <EmptyState icon={CalendarIcon} title="Ungültiger Tag">
          Einheiten lassen sich nur für heute oder spätere Tage hinzufügen.
        </EmptyState>
      </>
    )
  }

  return (
    <>
      {backLink}
      <PageHeader title="Einheit hinzufügen" subtitle={formatLongDay(date)} />
      {planning.status === 'loading' ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : planning.status === 'error' ? (
        <EmptyState icon={CalendarIcon} title="Daten konnten nicht geladen werden">
          <Button variant="secondary" className="mt-4" onClick={planning.retry}>
            Erneut versuchen
          </Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {add.isError && (
            <p
              role="alert"
              className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
            >
              Die Einheit konnte nicht gespeichert werden. Bitte versuche es erneut.
            </p>
          )}
          <GeneratorForm
            initial={{
              durationMin: planning.data.details.profile?.default_duration_min ?? 60,
              focus: 'hyrox',
              intensity: 'moderate',
              readiness: { kind: 'quick', level: 'normal' },
            }}
            profileEquipment={toGeneratorProfile(planning.data.details).availableEquipment}
            onSubmit={(request: WorkoutRequest) => {
              if (add.isPending) return
              const workout = generateForDay(planning.data, request, date, today, newSeed())
              add.mutate(
                { date, workout },
                { onSuccess: (id) => void navigate(`/calendar/planned/${id}`, { replace: true }) },
              )
            }}
          />
          {add.isPending && (
            <div role="status" className="flex justify-center">
              <Spinner className="text-accent" />
            </div>
          )}
        </div>
      )}
    </>
  )
}
