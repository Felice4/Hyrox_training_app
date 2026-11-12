import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { CalendarIcon, ChevronLeftIcon } from '@/components/icons'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatLongDay } from '@/features/calendar/format'
import { useAddTrainerAppointment } from '@/features/calendar/usePlannedWorkouts'
import { weekStartOf } from '@/features/calendar/week'
import { toLocalIsoDate } from '@/lib/date'
import { defaultAppointment } from './appointment'
import { AppointmentForm } from './AppointmentForm'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Trainer-Termin im Voraus planen (`/calendar/appointment/:date`). */
export function NewAppointmentPage() {
  const { date = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [today] = useState(() => toLocalIsoDate())
  const add = useAddTrainerAppointment()
  const valid = DATE_PATTERN.test(date) && date >= today

  const state = location.state as { from?: unknown } | null
  const from =
    typeof state?.from === 'string' && state.from.startsWith('/calendar') ? state.from : undefined

  const backLink = (
    <Link
      to={from ?? (valid ? `/calendar?week=${weekStartOf(date)}` : '/calendar')}
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
          Trainer-Termine lassen sich nur für heute oder spätere Tage planen. Ein vergangenes
          Training trägst du über „+ Eintragen" → „Training mit Trainer" ein.
        </EmptyState>
      </>
    )
  }

  return (
    <>
      {backLink}
      <PageHeader title="Trainer-Termin planen" subtitle={formatLongDay(date)} />
      {add.isError && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          Der Termin konnte nicht gespeichert werden. Bitte versuche es erneut.
        </p>
      )}
      <AppointmentForm
        initial={defaultAppointment(date)}
        today={today}
        saving={add.isPending}
        saveLabel="Termin speichern"
        onSave={(input) =>
          add.mutate(input, {
            onSuccess: () =>
              void navigate(from ?? `/calendar?week=${weekStartOf(date)}`, { replace: true }),
          })
        }
      />
    </>
  )
}
