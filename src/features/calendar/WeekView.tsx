import { useState } from 'react'
import type { PlannedWorkout } from '@/api/weekPlans'
import { CalendarIcon, InfoIcon, RefreshIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { GENERATOR_VERSION } from '@/domain/generator/config'
import { newSeed } from '@/features/generator/inputs'
import { cn } from '@/lib/cn'
import { AddUnitLink, DayContent, type NameOf } from './DayItems'
import { formatShortDay, formatWeek } from './format'
import { periodStats } from './month'
import { PeriodNav } from './PeriodNav'
import { planWeek, type PlanningData } from './planning'
import { usePlannedWeek, useReplaceWeekPlan } from './usePlannedWorkouts'
import { useSessionsInRange } from './useSessionsInRange'
import { addDays, calendarWeek, canPlanWeek, toReplacePayload, type CalendarDay } from './week'

export function WeekView({
  data,
  weekStart,
  currentWeek,
  today,
  nameOf,
  onWeekChange,
}: {
  data: PlanningData
  weekStart: string
  currentWeek: string
  today: string
  nameOf: NameOf
  onWeekChange: (weekStart: string) => void
}) {
  const week = usePlannedWeek(weekStart)
  const sessions = useSessionsInRange(weekStart, addDays(weekStart, 6))

  return (
    <div className="flex flex-col gap-4">
      <PeriodNav
        label={formatWeek(weekStart)}
        isCurrent={weekStart === currentWeek}
        currentLabel="Diese Woche"
        unit="Woche"
        onPrev={() => onWeekChange(addDays(weekStart, -7))}
        onNext={() => onWeekChange(addDays(weekStart, 7))}
        onCurrent={() => onWeekChange(currentWeek)}
      />
      {week.isPending || sessions.isPending ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : week.isError || sessions.isError ? (
        <EmptyState icon={CalendarIcon} title="Woche konnte nicht geladen werden">
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              void week.refetch()
              void sessions.refetch()
            }}
          >
            Erneut versuchen
          </Button>
        </EmptyState>
      ) : (
        <WeekContent
          data={data}
          weekStart={weekStart}
          today={today}
          nameOf={nameOf}
          days={calendarWeek(weekStart, today, sessions.data, week.data.planned)}
          planned={week.data.planned}
          hasPlan={week.data.plan !== null}
          notes={week.data.plan?.notes ?? null}
        />
      )}
    </div>
  )
}

function WeekContent({
  data,
  weekStart,
  today,
  nameOf,
  days,
  planned,
  hasPlan,
  notes,
}: {
  data: PlanningData
  weekStart: string
  today: string
  nameOf: NameOf
  days: CalendarDay[]
  planned: readonly PlannedWorkout[]
  hasPlan: boolean
  notes: string | null
}) {
  const stats = periodStats(days)
  const target = data.details.profile?.training_days_per_week
  return (
    <>
      <p className="text-center text-sm text-fg-muted">
        <span className="font-semibold text-fg">{stats.trainingDays}</span>
        {target !== null && target !== undefined && ` von ${target}`} Trainingstagen ·{' '}
        {stats.minutes} min
        {stats.open > 0 && ` · ${stats.open} offen`}
      </p>
      {canPlanWeek(weekStart, today) && (
        <PlanCard
          data={data}
          weekStart={weekStart}
          today={today}
          planned={planned}
          hasPlan={hasPlan}
          notes={notes}
        />
      )}
      <ol className="flex flex-col gap-2">
        {days.map((day) => (
          <li key={day.date}>
            <Card className={cn('flex flex-col gap-2 p-4', day.isToday && 'border-accent/60')}>
              <div className="flex items-center justify-between gap-2">
                <p className={cn('font-semibold', day.isPast && 'text-fg-muted')}>
                  {formatShortDay(day.date)}
                  {day.isToday && <span className="ml-2 text-sm text-accent">Heute</span>}
                </p>
                {!day.isPast && <AddUnitLink date={day.date} />}
              </div>
              <DayContent day={day} nameOf={nameOf} />
            </Card>
          </li>
        ))}
      </ol>
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
