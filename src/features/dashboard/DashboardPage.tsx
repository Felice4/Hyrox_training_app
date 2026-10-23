import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import type { ProfileDetails } from '@/api/profile'
import type { PlannedWorkout } from '@/api/weekPlans'
import { ChevronRightIcon, DumbbellIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import type { HistorySession } from '@/domain/generator/types'
import { summarizeTrainingLoad } from '@/domain/load/trainingLoad'
import { WEEKDAY_SHORT_LABELS } from '@/domain/profile/vocabulary'
import { useAuth } from '@/features/auth/authContext'
import { formatShortDay } from '@/features/calendar/format'
import { useUpcomingPlanned } from '@/features/calendar/usePlannedWorkouts'
import { nextPlanned } from '@/features/calendar/week'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { restoreStoredWorkout } from '@/features/generator/inputs'
import { FOCUS_LABELS, INTENSITY_LABELS } from '@/features/generator/labels'
import { useProfileDetails } from '@/features/profile/useProfile'
import { describeRecord } from '@/features/training/format'
import { storageKeys } from '@/features/training/storage'
import { readActiveSession, useActiveSessionKey } from '@/features/training/useActiveSession'
import { useStartTraining } from '@/features/training/useStartTraining'
import { useTrainingHistory } from '@/features/training/useTrainingHistory'
import { cn } from '@/lib/cn'
import { toLocalIsoDate } from '@/lib/date'
import { loadDraft } from '@/lib/localDraft'
import { loadStatus, nextPreferredDay, weekStats, weekStrip, type LoadLevel } from './stats'

const longDate = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const shortDate = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
})
const weekdayName = new Intl.DateTimeFormat('de-DE', { weekday: 'long' })

export function DashboardPage() {
  const auth = useAuth()
  const details = useProfileDetails()
  const history = useTrainingHistory()
  const { catalog } = useExerciseCatalog()
  const [now] = useState(() => new Date())

  const userId = auth.status === 'signedIn' ? auth.session.user.id : 'unbekannt'
  const activeKey = useActiveSessionKey()
  const [hasActive] = useState(() => readActiveSession(activeKey) !== null)
  const [storedWorkout] = useState(() =>
    loadDraft(storageKeys.generatedWorkout(userId), null, restoreStoredWorkout),
  )
  const startTraining = useStartTraining(catalog.data?.exercises ?? [])
  const today = toLocalIsoDate(now)
  const upcoming = useUpcomingPlanned(today)
  const next = nextPlanned(upcoming.data ?? [], today)
  // Heute geplante Einheit hat Vorrang vor dem zuletzt erzeugten Workout
  const plannedToday = next?.date === today && next.workout ? next : undefined

  const name = details.data?.profile?.display_name
  const sessions = history.data ?? []

  return (
    <>
      <PageHeader title={name ? `Hallo ${name}!` : 'Hallo!'} subtitle={longDate.format(now)} />

      <div className="flex flex-col gap-4">
        {hasActive && (
          <Link
            to="/training/active"
            className="flex min-h-16 items-center justify-between rounded-2xl border border-accent/40 bg-accent/10 px-5 font-semibold"
          >
            <span>
              Training läuft
              <span className="block text-sm font-normal text-fg-muted">Tippen zum Fortsetzen</span>
            </span>
            <ChevronRightIcon className="text-accent" />
          </Link>
        )}

        <Card className="flex flex-col gap-3">
          {next ? (
            <NextPlanned planned={next} today={today} />
          ) : (
            <NextTraining details={details.data} sessions={sessions} now={now} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/training"
              className="inline-flex min-h-14 items-center justify-center rounded-xl bg-accent px-3 text-center font-semibold text-on-accent"
            >
              Workout generieren
            </Link>
            <Button
              variant="secondary"
              className="min-h-14"
              disabled={(!plannedToday && !storedWorkout) || hasActive || catalog.isPending}
              onClick={() => {
                if (plannedToday?.workout) startTraining(plannedToday.workout, plannedToday.id)
                else if (storedWorkout) startTraining(storedWorkout.workout)
              }}
            >
              Training starten
            </Button>
          </div>
          {plannedToday && !hasActive && (
            <p className="text-xs text-fg-muted">Startet die heute geplante Einheit.</p>
          )}
          {!plannedToday && storedWorkout && !hasActive && (
            <p className="text-xs text-fg-muted">
              Startet dein zuletzt erstelltes Workout ({FOCUS_LABELS[storedWorkout.workout.focus]},{' '}
              {storedWorkout.workout.estimatedDurationMin} min).
            </p>
          )}
          {!plannedToday && !storedWorkout && !hasActive && (
            <p className="text-xs text-fg-muted">
              Erstelle zuerst ein Workout – danach kannst du es hier direkt starten.
            </p>
          )}
        </Card>

        <Section title="Diese Woche" loading={history.isPending} error={history.isError}>
          <ThisWeek details={details.data} sessions={sessions} now={now} />
        </Section>

        <Section title="Trainingsbelastung" loading={history.isPending} error={history.isError}>
          <Load sessions={sessions} now={now} />
        </Section>

        <Section title="Letzte Trainings" loading={history.isPending} error={history.isError}>
          <RecentWorkouts sessions={sessions} />
        </Section>

        <Section
          title="Neue Bestleistungen"
          loading={details.isPending || catalog.isPending}
          error={details.isError}
        >
          <RecentRecords details={details.data} catalog={catalog.data?.exercises ?? []} />
        </Section>
      </div>
    </>
  )
}

function Section({
  title,
  loading,
  error,
  children,
}: {
  title: string
  loading: boolean
  error: boolean
  children: ReactNode
}) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-fg-muted uppercase">{title}</h2>
      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner className="text-accent" />
        </div>
      ) : error ? (
        <p className="text-sm text-fg-muted">Konnte nicht geladen werden.</p>
      ) : (
        children
      )}
    </Card>
  )
}

function NextTraining({
  details,
  sessions,
  now,
}: {
  details: ProfileDetails | undefined
  sessions: readonly HistorySession[]
  now: Date
}) {
  const preferred = details?.profile?.preferred_weekdays ?? []
  const next = nextPreferredDay(sessions, preferred, now)
  const isToday = next !== undefined && next.toDateString() === now.toDateString()

  return (
    <div className="flex items-center gap-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-raised text-accent">
        <DumbbellIcon />
      </span>
      <div>
        <p className="text-sm text-fg-muted">Nächstes Training</p>
        <p className="font-display text-2xl font-bold uppercase">
          {next ? (isToday ? 'Heute' : weekdayName.format(next)) : 'Wann du willst'}
        </p>
        <p className="text-xs text-fg-muted">
          {next
            ? 'Laut deinen bevorzugten Trainingstagen · Plane deine Woche im Kalender.'
            : 'Plane deine Woche im Kalender oder lege im Profil bevorzugte Tage fest.'}
        </p>
      </div>
    </div>
  )
}

/** Nächste Einheit aus dem Wochenplan. */
function NextPlanned({ planned, today }: { planned: PlannedWorkout; today: string }) {
  return (
    <Link to={`/calendar/planned/${planned.id}`} className="flex items-center gap-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-raised text-accent">
        <DumbbellIcon />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg-muted">
          Nächstes Training · {planned.date === today ? 'Heute' : formatShortDay(planned.date)}
        </p>
        <p className="font-display text-2xl font-bold uppercase">{FOCUS_LABELS[planned.focus]}</p>
        <p className="text-xs text-fg-muted">
          {planned.durationMin} min · {INTENSITY_LABELS[planned.intensity]} · laut Wochenplan
        </p>
      </div>
      <ChevronRightIcon className="shrink-0 text-fg-muted" />
    </Link>
  )
}

function ThisWeek({
  details,
  sessions,
  now,
}: {
  details: ProfileDetails | undefined
  sessions: readonly HistorySession[]
  now: Date
}) {
  const stats = weekStats(sessions, now)
  const target = details?.profile?.training_days_per_week ?? undefined
  const strip = weekStrip(sessions, details?.profile?.preferred_weekdays ?? [], now)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-6">
        <div>
          <p className="font-display text-5xl leading-none font-bold">
            {stats.sessions}
            {target !== undefined && <span className="text-2xl text-fg-muted"> / {target}</span>}
          </p>
          <p className="mt-1 text-xs text-fg-muted">Einheiten</p>
        </div>
        <div>
          <p className="font-display text-3xl leading-none font-bold">{stats.minutes}</p>
          <p className="mt-1 text-xs text-fg-muted">Minuten</p>
        </div>
      </div>
      <ol className="grid grid-cols-7 gap-1.5" aria-label="Wochenübersicht">
        {strip.map((day) => (
          <li key={day.date} className="flex flex-col items-center gap-1">
            <span
              className={cn('text-xs', day.isToday ? 'font-semibold text-fg' : 'text-fg-muted')}
            >
              {WEEKDAY_SHORT_LABELS[day.weekday]}
            </span>
            <span
              className={cn(
                'grid size-9 place-items-center rounded-full border text-sm font-semibold',
                day.trained
                  ? 'border-accent bg-accent text-on-accent'
                  : day.preferred && !day.isPast
                    ? 'border-accent/60 text-accent'
                    : 'border-line text-fg-muted/60',
                day.isToday && 'ring-2 ring-fg/30 ring-offset-2 ring-offset-surface',
              )}
              aria-label={
                day.trained ? 'trainiert' : day.preferred ? 'geplanter Trainingstag' : 'frei'
              }
            >
              {day.trained ? '✓' : day.preferred && !day.isPast ? '•' : ''}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

const LOAD_TONE: Record<LoadLevel, string> = {
  unknown: 'text-fg-muted',
  low: 'text-fg',
  normal: 'text-accent',
  high: 'text-hyrox',
}

function Load({ sessions, now }: { sessions: readonly HistorySession[]; now: Date }) {
  const summary = summarizeTrainingLoad(sessions, now.toISOString())
  const status = loadStatus(summary)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn('font-display text-3xl font-bold uppercase', LOAD_TONE[status.level])}>
          {status.label}
        </p>
        {summary.acute > 0 && (
          <p className="text-right text-xs text-fg-muted">
            7 Tage: {summary.acute}
            <br />Ø Woche: {summary.chronicWeekly}
          </p>
        )}
      </div>
      <p className="text-sm text-fg-muted">{status.explanation}</p>
      <p className="text-xs text-fg-muted/80">
        Belastung = Anstrengung (1–10) × Minuten. Ein Trainingshinweis, keine medizinische Aussage.
      </p>
    </div>
  )
}

function RecentWorkouts({ sessions }: { sessions: readonly HistorySession[] }) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-fg-muted">
        Noch kein Training gespeichert. Dein erstes Workout erstellst du unter{' '}
        <Link to="/training" className="text-accent">
          Training
        </Link>
        .
      </p>
    )
  }
  return (
    <ul className="divide-y divide-line">
      {sessions.slice(0, 3).map((session) => (
        <li key={session.startedAt} className="flex items-center justify-between gap-3 py-2.5">
          <div>
            <p className="font-semibold">{FOCUS_LABELS[session.focus]}</p>
            <p className="text-xs text-fg-muted">
              {shortDate.format(new Date(session.startedAt))} · {session.exercises.length} Übungen
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-bold">{Math.round(session.durationMin)} min</p>
            {session.sessionRpe !== undefined && (
              <p className="text-xs text-fg-muted">RPE {session.sessionRpe}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function RecentRecords({
  details,
  catalog,
}: {
  details: ProfileDetails | undefined
  catalog: readonly CatalogExercise[]
}) {
  const records = (details?.records ?? [])
    .filter((r) => r.source === 'session')
    .sort((a, b) => Date.parse(b.achievedAt) - Date.parse(a.achievedAt))
    .slice(0, 3)
  if (records.length === 0) {
    return (
      <p className="text-sm text-fg-muted">
        Sobald du in einem Training eine Bestleistung schaffst, erscheint sie hier.
      </p>
    )
  }
  return (
    <ul className="divide-y divide-line">
      {records.map((record) => {
        const { label, value } = describeRecord({
          record_type: record.recordType,
          context_key: record.contextKey,
          value: record.value,
        })
        const name =
          catalog.find((e) => e.slug === record.exerciseSlug)?.name ?? record.exerciseSlug
        return (
          <li
            key={`${record.exerciseSlug}-${record.recordType}-${record.contextKey}`}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div>
              <p className="font-semibold">{name}</p>
              <p className="text-xs text-fg-muted">
                {label} · {shortDate.format(new Date(record.achievedAt))}
              </p>
            </div>
            <p className="font-display text-xl font-bold text-accent">{value}</p>
          </li>
        )
      })}
    </ul>
  )
}
