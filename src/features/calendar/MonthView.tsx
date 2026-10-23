import { CalendarIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { FOCUSES } from '@/domain/generator/types'
import { WEEKDAY_SHORT_LABELS, WEEKDAYS } from '@/domain/profile/vocabulary'
import { FOCUS_LABELS } from '@/features/generator/labels'
import { cn } from '@/lib/cn'
import { AddUnitLink, DayContent, type NameOf } from './DayItems'
import { FOCUS_COLORS } from './focusColors'
import { formatLongDay } from './format'
import { monthOf, monthWeeks, periodStats, type PeriodStats } from './month'
import { PeriodNav } from './PeriodNav'
import { usePlannedRange } from './usePlannedWorkouts'
import { useSessionsInRange } from './useSessionsInRange'
import { calendarDays, weekStartOf, type CalendarDay } from './week'

const monthName = new Intl.DateTimeFormat('de-DE', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function MonthView({
  month,
  currentMonth,
  today,
  selectedDay,
  nameOf,
  onMonthChange,
  onSelectDay,
  onOpenWeek,
}: {
  month: string
  currentMonth: string
  today: string
  selectedDay: string | null
  nameOf: NameOf
  onMonthChange: (month: string, direction: -1 | 0 | 1) => void
  onSelectDay: (date: string) => void
  onOpenWeek: (weekStart: string) => void
}) {
  const weeks = monthWeeks(month)
  const from = weeks[0]?.[0] ?? `${month}-01`
  const to = weeks.at(-1)?.[6] ?? `${month}-28`
  const planned = usePlannedRange(from, to)
  const sessions = useSessionsInRange(from, to)

  const nav = (
    <PeriodNav
      label={monthName.format(new Date(`${month}-15T12:00:00Z`))}
      isCurrent={month === currentMonth}
      currentLabel="Dieser Monat"
      unit="Monat"
      onPrev={() => onMonthChange(month, -1)}
      onNext={() => onMonthChange(month, 1)}
      onCurrent={() => onMonthChange(currentMonth, 0)}
    />
  )

  if (planned.isPending || sessions.isPending) {
    return (
      <div className="flex flex-col gap-4">
        {nav}
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      </div>
    )
  }
  if (planned.isError || sessions.isError) {
    return (
      <div className="flex flex-col gap-4">
        {nav}
        <EmptyState icon={CalendarIcon} title="Monat konnte nicht geladen werden">
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              void planned.refetch()
              void sessions.refetch()
            }}
          >
            Erneut versuchen
          </Button>
        </EmptyState>
      </div>
    )
  }

  const days = calendarDays(weeks.flat(), today, sessions.data, planned.data)
  const byDate = new Map(days.map((d) => [d.date, d]))
  const selected = selectedDay ? byDate.get(selectedDay) : undefined

  return (
    <div className="flex flex-col gap-4">
      {nav}
      <MonthStats stats={periodStats(days, month)} />

      <Card className="p-3">
        <div
          role="grid"
          aria-label="Monatskalender"
          className="grid grid-cols-[repeat(7,minmax(0,1fr))_2.25rem] gap-1"
        >
          <div role="row" className="contents">
            {WEEKDAYS.map((weekday) => (
              <span
                key={weekday}
                role="columnheader"
                className="pb-1 text-center text-xs text-fg-muted"
              >
                {WEEKDAY_SHORT_LABELS[weekday]}
              </span>
            ))}
            <span
              role="columnheader"
              className="pb-1 text-center text-xs text-fg-muted"
              title="Trainingstage je Woche"
            >
              Tage
            </span>
          </div>
          {weeks.map((week) => {
            const weekDays = week.flatMap((date) => byDate.get(date) ?? [])
            const trainingDays = periodStats(weekDays).trainingDays
            return (
              <div key={week[0]} role="row" className="contents">
                {weekDays.map((day) => (
                  <DayCell
                    key={day.date}
                    day={day}
                    inMonth={monthOf(day.date) === month}
                    selected={day.date === selectedDay}
                    onSelect={() => onSelectDay(day.date)}
                  />
                ))}
                <button
                  type="button"
                  role="gridcell"
                  onClick={() => onOpenWeek(week[0] ?? weekStartOf(`${month}-01`))}
                  aria-label={`${trainingDays} Trainingstage – Woche öffnen`}
                  className={cn(
                    'grid place-items-center rounded-lg font-display text-lg font-bold hover:bg-surface-raised',
                    trainingDays > 0 ? 'text-accent' : 'text-fg-muted/50',
                  )}
                >
                  {trainingDays}
                </button>
              </div>
            )
          })}
        </div>
        <Legend />
      </Card>

      {selected ? (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">
              {formatLongDay(selected.date)}
              {selected.isToday && <span className="ml-2 text-sm text-accent">Heute</span>}
            </h2>
            {!selected.isPast && <AddUnitLink date={selected.date} />}
          </div>
          <DayContent day={selected} nameOf={nameOf} />
          <Button
            variant="ghost"
            className="self-start px-2 text-sm"
            onClick={() => onOpenWeek(weekStartOf(selected.date))}
          >
            Woche ansehen →
          </Button>
        </Card>
      ) : (
        <p className="text-center text-sm text-fg-muted">
          Tippe auf einen Tag, um die Details zu sehen.
        </p>
      )}
    </div>
  )
}

function DayCell({
  day,
  inMonth,
  selected,
  onSelect,
}: {
  day: CalendarDay
  inMonth: boolean
  selected: boolean
  onSelect: () => void
}) {
  const marks = [
    ...day.sessions.map((s) => ({ key: s.startedAt, kind: 'done' as const, focus: s.focus })),
    ...day.planned.map((p) => ({
      key: p.id,
      kind: p.status === 'skipped' ? ('skipped' as const) : ('planned' as const),
      focus: p.focus,
    })),
  ]
  const summary = [
    day.sessions.length > 0 && `${day.sessions.length} absolviert`,
    day.planned.some((p) => p.status === 'planned') && 'geplant',
    day.planned.some((p) => p.status === 'skipped') && 'ausgefallen',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      role="gridcell"
      aria-selected={selected}
      aria-label={`${formatLongDay(day.date)}${summary ? `: ${summary}` : ''}`}
      onClick={onSelect}
      className={cn(
        'flex min-h-14 flex-col items-center gap-1 rounded-lg border pt-1.5 pb-1 transition',
        selected ? 'border-accent bg-surface-raised' : 'border-transparent hover:bg-surface-raised',
        day.sessions.length > 0 && !selected && 'bg-accent/10',
        !inMonth && 'opacity-40',
      )}
    >
      <span
        className={cn(
          'grid size-6 place-items-center rounded-full text-sm',
          day.isToday ? 'bg-fg font-bold text-canvas' : day.isPast ? 'text-fg-muted' : 'text-fg',
        )}
      >
        {Number(day.date.slice(8))}
      </span>
      <span className="flex flex-wrap justify-center gap-0.5" aria-hidden="true">
        {marks.slice(0, 3).map((mark) => (
          <span
            key={mark.key}
            className={cn(
              'size-2 rounded-full',
              mark.kind === 'done' && FOCUS_COLORS[mark.focus].fill,
              mark.kind === 'planned' && cn('border-2', FOCUS_COLORS[mark.focus].ring),
              mark.kind === 'skipped' && 'border-2 border-fg-muted/40',
            )}
          />
        ))}
      </span>
    </button>
  )
}

function MonthStats({ stats }: { stats: PeriodStats }) {
  const items = [
    { label: 'Trainingstage', value: stats.trainingDays },
    { label: 'Minuten', value: stats.minutes },
    { label: 'Offen', value: stats.open },
  ]
  return (
    <Card className="flex flex-col gap-2 p-4">
      <dl className="grid grid-cols-3 gap-2 text-center">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-xs text-fg-muted">{item.label}</dt>
            <dd className="font-display text-3xl font-bold">{item.value}</dd>
          </div>
        ))}
      </dl>
      {(stats.skipped > 0 || stats.missed > 0) && (
        <p className="text-center text-xs text-fg-muted">
          {[
            stats.skipped > 0 && `${stats.skipped} ausgefallen`,
            stats.missed > 0 && `${stats.missed} geplant, aber nicht absolviert`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </Card>
  )
}

function Legend() {
  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 text-xs text-fg-muted">
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {FOCUSES.map((focus) => (
          <span key={focus} className="inline-flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-full', FOCUS_COLORS[focus].fill)} />
            {FOCUS_LABELS[focus]}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-fg-muted" /> absolviert
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-fg-muted" /> geplant
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-fg-muted/40" /> ausgefallen
        </span>
        <span>Spalte „Tage": Trainingstage der Woche</span>
      </div>
    </div>
  )
}
