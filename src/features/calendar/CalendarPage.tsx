import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { PlannedWorkout } from '@/api/weekPlans'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
  RefreshIcon,
} from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { GENERATOR_VERSION } from '@/domain/generator/config'
import type { HistorySession } from '@/domain/generator/types'
import { FOCUS_LABELS, INTENSITY_LABELS } from '@/features/generator/labels'
import { newSeed } from '@/features/generator/inputs'
import { cn } from '@/lib/cn'
import { toLocalIsoDate } from '@/lib/date'
import { formatShortDay, formatWeek } from './format'
import { planWeek, type PlanningData } from './planning'
import { usePlannedWeek, useReplaceWeekPlan } from './usePlannedWorkouts'
import { usePlanningData } from './usePlanningData'
import {
  addDays,
  calendarWeek,
  canPlanWeek,
  toReplacePayload,
  weekStartOf,
  type CalendarDay,
} from './week'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function CalendarPage() {
  const [today] = useState(() => toLocalIsoDate())
  const [params, setParams] = useSearchParams()
  const requested = params.get('week')
  const weekStart = weekStartOf(requested && DATE_PATTERN.test(requested) ? requested : today)
  const currentWeek = weekStartOf(today)

  const planning = usePlanningData()
  const week = usePlannedWeek(weekStart)

  const goTo = (start: string) =>
    setParams(start === currentWeek ? {} : { week: start }, { replace: true })

  return (
    <>
      <PageHeader title="Kalender" subtitle="Dein Wochenplan" />

      <nav className="mb-4 flex items-center justify-between gap-2" aria-label="Woche wählen">
        <Button
          variant="secondary"
          className="px-3"
          aria-label="Vorherige Woche"
          onClick={() => goTo(addDays(weekStart, -7))}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="text-center">
          <p className="font-semibold">{formatWeek(weekStart)}</p>
          {weekStart === currentWeek ? (
            <p className="text-xs text-accent">Diese Woche</p>
          ) : (
            <button
              type="button"
              className="min-h-6 text-xs text-fg-muted underline"
              onClick={() => goTo(currentWeek)}
            >
              Zur aktuellen Woche
            </button>
          )}
        </div>
        <Button
          variant="secondary"
          className="px-3"
          aria-label="Nächste Woche"
          onClick={() => goTo(addDays(weekStart, 7))}
        >
          <ChevronRightIcon />
        </Button>
      </nav>

      {planning.status === 'loading' || week.isPending ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : planning.status === 'error' || week.isError ? (
        <EmptyState icon={CalendarIcon} title="Daten konnten nicht geladen werden">
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              if (planning.status === 'error') planning.retry()
              void week.refetch()
            }}
          >
            Erneut versuchen
          </Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {planning.historyFailed && (
            <p
              role="status"
              className="rounded-xl border border-hyrox/40 bg-hyrox/10 px-4 py-3 text-sm"
            >
              Dein Trainingsverlauf konnte nicht geladen werden. Absolvierte Trainings fehlen in der
              Ansicht und werden beim Planen nicht berücksichtigt.
            </p>
          )}
          {canPlanWeek(weekStart, today) && (
            <PlanCard
              data={planning.data}
              weekStart={weekStart}
              today={today}
              planned={week.data.planned}
              hasPlan={week.data.plan !== null}
              notes={week.data.plan?.notes ?? null}
            />
          )}
          <ol className="flex flex-col gap-2">
            {calendarWeek(weekStart, today, planning.data.history, week.data.planned).map((day) => (
              <DayRow key={day.date} day={day} />
            ))}
          </ol>
        </div>
      )}
    </>
  )
}

function PlanCard({
  data,
  weekStart,
  today,
  planned,
  hasPlan,
  notes,
}: {
  data: PlanningData
  weekStart: string
  today: string
  planned: readonly PlannedWorkout[]
  hasPlan: boolean
  notes: string | null
}) {
  const replace = useReplaceWeekPlan()
  const [showWhy, setShowWhy] = useState(false)
  const openFromToday = planned.filter(
    (p) => p.source === 'week_plan' && p.status === 'planned' && p.date >= today,
  ).length

  function plan() {
    if (
      hasPlan &&
      !window.confirm(
        `Woche neu planen? ${openFromToday} offene Einheit(en) ab heute werden ersetzt. ` +
          'Absolvierte, ausgefallene und selbst hinzugefügte Einheiten bleiben erhalten.',
      )
    ) {
      return
    }
    const generated = planWeek(data, weekStart, today, planned, newSeed())
    replace.mutate(toReplacePayload(generated, today, GENERATOR_VERSION))
  }

  const lines = notes ? notes.split('\n') : []
  const days = data.details.profile?.training_days_per_week

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">{hasPlan ? 'Wochenplan' : 'Noch kein Wochenplan'}</h2>
        <p className="text-sm text-fg-muted">
          {hasPlan
            ? 'Tippe auf eine Einheit, um sie anzusehen, zu verschieben oder zu ersetzen.'
            : `Plant ${days ?? 4} Trainingstage passend zu deinen Zielen, bevorzugten Tagen und dem, was du diese Woche schon trainiert hast.`}
        </p>
      </div>
      <Button
        variant={hasPlan ? 'secondary' : 'primary'}
        fullWidth
        loading={replace.isPending}
        onClick={plan}
      >
        {hasPlan && <RefreshIcon width={20} height={20} />}
        {hasPlan ? 'Woche neu planen' : 'Woche planen'}
      </Button>
      {replace.isError && (
        <p role="alert" className="text-sm text-danger">
          Der Plan konnte nicht gespeichert werden. Bitte versuche es erneut.
        </p>
      )}
      {lines.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            aria-expanded={showWhy}
            className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-accent"
          >
            <InfoIcon width={18} height={18} />
            {showWhy ? 'Begründung ausblenden' : 'Warum dieser Plan?'}
          </button>
          {showWhy && (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-fg-muted">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}

function DayRow({ day }: { day: CalendarDay }) {
  const empty = day.sessions.length === 0 && day.planned.length === 0
  return (
    <li>
      <Card className={cn('flex flex-col gap-2 p-4', day.isToday && 'border-accent/60')}>
        <div className="flex items-center justify-between gap-2">
          <p className={cn('font-semibold', day.isPast && 'text-fg-muted')}>
            {formatShortDay(day.date)}
            {day.isToday && <span className="ml-2 text-sm text-accent">Heute</span>}
          </p>
          {!day.isPast && (
            <Link
              to={`/calendar/new/${day.date}`}
              className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
              aria-label={`Einheit am ${formatShortDay(day.date)} hinzufügen`}
            >
              + Einheit
            </Link>
          )}
        </div>
        {day.sessions.map((session) => (
          <SessionItem key={session.startedAt} session={session} />
        ))}
        {day.planned.map((planned) => (
          <PlannedItem key={planned.id} planned={planned} isPast={day.isPast} />
        ))}
        {empty && <p className="text-sm text-fg-muted/70">{day.isPast ? '–' : 'Ruhetag'}</p>}
      </Card>
    </li>
  )
}

function SessionItem({ session }: { session: HistorySession }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-accent/10 px-3 py-2.5">
      <span
        className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent"
        aria-hidden="true"
      >
        ✓
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{FOCUS_LABELS[session.focus]}</p>
        <p className="text-xs text-fg-muted">
          Absolviert · {Math.round(session.durationMin)} min
          {session.sessionRpe !== undefined && ` · RPE ${session.sessionRpe}`}
        </p>
      </div>
    </div>
  )
}

function PlannedItem({ planned, isPast }: { planned: PlannedWorkout; isPast: boolean }) {
  const skipped = planned.status === 'skipped'
  const missed = !skipped && isPast
  return (
    <Link
      to={`/calendar/planned/${planned.id}`}
      className={cn(
        'flex min-h-14 items-center gap-3 rounded-xl border border-line px-3 py-2.5 hover:bg-surface-raised',
        (skipped || missed) && 'opacity-60',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn('font-semibold', skipped && 'line-through')}>
          {FOCUS_LABELS[planned.focus]}
        </p>
        <p className="text-xs text-fg-muted">
          {planned.durationMin} min · {INTENSITY_LABELS[planned.intensity]}
          {planned.originalDate && ` · verschoben von ${formatShortDay(planned.originalDate)}`}
        </p>
      </div>
      {skipped ? (
        <Badge>Ausgefallen</Badge>
      ) : missed ? (
        <Badge>Nicht absolviert</Badge>
      ) : planned.source === 'manual' ? (
        <Badge tone="hyrox">Spontan</Badge>
      ) : (
        <Badge tone="accent">Geplant</Badge>
      )}
      <ChevronRightIcon className="shrink-0 text-fg-muted" width={18} height={18} />
    </Link>
  )
}
