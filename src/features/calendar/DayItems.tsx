import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import type { PlannedWorkout } from '@/api/weekPlans'
import { ChevronDownIcon, ChevronRightIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import type { HistorySession } from '@/domain/generator/types'
import { FOCUS_LABELS, INTENSITY_LABELS } from '@/features/generator/labels'
import { summarizeSets } from '@/features/training/lastTime'
import { cn } from '@/lib/cn'
import { formatShortDay } from './format'
import type { CalendarDay } from './week'

/** Übungsname zum Slug (aus dem Katalog; Slug als Ersatz). */
export type NameOf = (slug: string) => string

/** Inhalt eines Tages: absolvierte Trainings, geplante Einheiten, „+ Einheit". */
export function DayContent({ day, nameOf }: { day: CalendarDay; nameOf: NameOf }) {
  const empty = day.sessions.length === 0 && day.planned.length === 0
  return (
    <div className="flex flex-col gap-2">
      {day.sessions.map((session) => (
        <SessionItem key={session.startedAt} session={session} nameOf={nameOf} />
      ))}
      {day.planned.map((planned) => (
        <PlannedItem key={planned.id} planned={planned} isPast={day.isPast} />
      ))}
      {empty && <p className="text-sm text-fg-muted/70">{day.isPast ? '–' : 'Ruhetag'}</p>}
    </div>
  )
}

export function AddUnitLink({ date }: { date: string }) {
  return (
    <Link
      to={`/calendar/new/${date}`}
      className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
      aria-label={`Einheit am ${formatShortDay(date)} hinzufügen`}
    >
      + Einheit
    </Link>
  )
}

/** Absolviertes Training – aufklappbar mit allen Übungen und geschafften Sätzen. */
function SessionItem({ session, nameOf }: { session: HistorySession; nameOf: NameOf }) {
  const [open, setOpen] = useState(false)
  const time = new Date(session.startedAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <div className="rounded-xl bg-accent/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent"
          aria-hidden="true"
        >
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{FOCUS_LABELS[session.focus]}</p>
          <p className="text-xs text-fg-muted">
            Absolviert {time} Uhr · {Math.round(session.durationMin)} min
            {session.sessionRpe !== undefined && ` · RPE ${session.sessionRpe}`}
          </p>
        </div>
        <ChevronDownIcon
          width={18}
          height={18}
          className={cn('shrink-0 text-fg-muted transition', open && 'rotate-180')}
        />
      </button>
      {open && (
        <ul className="divide-y divide-line/60 border-t border-line/60 px-3 pb-1">
          {session.exercises.map((exercise, index) => {
            const done = summarizeSets(exercise.sets)
            return (
              <li key={`${exercise.exerciseSlug}-${index}`} className="py-2 text-sm">
                <p className="font-medium">{nameOf(exercise.exerciseSlug)}</p>
                <p className={cn('text-xs', done ? 'text-accent' : 'text-fg-muted')}>
                  {done || 'Nicht absolviert'}
                </p>
              </li>
            )
          })}
          {session.exercises.length === 0 && (
            <li className="py-2 text-sm text-fg-muted">Keine Übungen gespeichert.</li>
          )}
        </ul>
      )}
    </div>
  )
}

export function PlannedItem({ planned, isPast }: { planned: PlannedWorkout; isPast: boolean }) {
  const location = useLocation()
  const skipped = planned.status === 'skipped'
  const missed = !skipped && isPast
  return (
    <Link
      to={`/calendar/planned/${planned.id}`}
      state={{ from: location.pathname + location.search }}
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
