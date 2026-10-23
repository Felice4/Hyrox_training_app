import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { CalendarIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { toLocalIsoDate } from '@/lib/date'
import { addMonths, monthOf } from './month'
import { MonthView } from './MonthView'
import { usePlanningData } from './usePlanningData'
import { weekStartOf } from './week'
import { WeekView } from './WeekView'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

type View = 'week' | 'month'

/**
 * Kalender mit Wochen- und Monatsansicht. Ansicht, Woche, Monat und gewählter Tag
 * stehen in der Adresse (`?view=month&month=2026-10&day=2026-10-23`), damit „Zurück"
 * aus einer Einheit an dieselbe Stelle führt.
 */
export function CalendarPage() {
  const [today] = useState(() => toLocalIsoDate())
  const [params, setParams] = useSearchParams()
  const view: View = params.get('view') === 'month' ? 'month' : 'week'

  const weekParam = params.get('week')
  const weekStart = weekStartOf(weekParam && DATE_PATTERN.test(weekParam) ? weekParam : today)
  const monthParam = params.get('month')
  const month = monthParam && MONTH_PATTERN.test(monthParam) ? monthParam : monthOf(today)
  const dayParam = params.get('day')
  const selectedDay = dayParam && DATE_PATTERN.test(dayParam) ? dayParam : null

  const planning = usePlanningData()

  const showWeek = (start: string) =>
    setParams(start === weekStartOf(today) ? {} : { week: start }, { replace: true })
  const showMonth = (m: string, day?: string) =>
    setParams({ view: 'month', month: m, ...(day ? { day } : {}) }, { replace: true })

  return (
    <>
      <PageHeader title="Kalender" subtitle="Plan und absolvierte Trainings" />

      <div
        role="tablist"
        aria-label="Ansicht"
        className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1"
      >
        {(
          [
            ['week', 'Woche'],
            ['month', 'Monat'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() =>
              value === 'week'
                ? showWeek(selectedDay ? weekStartOf(selectedDay) : weekStart)
                : showMonth(monthOf(weekStart === weekStartOf(today) ? today : weekStart))
            }
            className={cn(
              'min-h-11 rounded-lg font-semibold transition',
              view === value ? 'bg-surface-raised text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {label}
          </button>
        ))}
      </div>

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
        <>
          {planning.historyFailed && (
            <p
              role="status"
              className="mb-4 rounded-xl border border-hyrox/40 bg-hyrox/10 px-4 py-3 text-sm"
            >
              Dein Trainingsverlauf konnte nicht geladen werden. Beim Planen werden absolvierte
              Trainings deshalb nicht berücksichtigt.
            </p>
          )}
          {view === 'week' ? (
            <WeekView
              data={planning.data}
              weekStart={weekStart}
              currentWeek={weekStartOf(today)}
              today={today}
              nameOf={nameOfFrom(planning.data.exercises)}
              onWeekChange={showWeek}
            />
          ) : (
            <MonthView
              month={month}
              currentMonth={monthOf(today)}
              today={today}
              selectedDay={selectedDay}
              nameOf={nameOfFrom(planning.data.exercises)}
              onMonthChange={(m, direction) =>
                showMonth(
                  direction === 0 ? m : addMonths(m, direction),
                  direction === 0 ? today : undefined,
                )
              }
              onSelectDay={(day) => showMonth(month, day)}
              onOpenWeek={showWeek}
            />
          )}
        </>
      )}
    </>
  )
}

function nameOfFrom(exercises: readonly { slug: string; name: string }[]) {
  const names = new Map(exercises.map((e) => [e.slug, e.name]))
  return (slug: string) => names.get(slug) ?? slug
}
