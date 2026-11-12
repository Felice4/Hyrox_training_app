import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import type { SaveSessionResult } from '@/api/sessions'
import { CalendarIcon, ChevronLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import {
  newEntry,
  restoreEntryDraft,
  type EntrySource,
  type ManualEntry,
} from '@/domain/manualEntry/entry'
import { useAuth } from '@/features/auth/authContext'
import { formatLongDay } from '@/features/calendar/format'
import { weekStartOf } from '@/features/calendar/week'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { toLocalIsoDate } from '@/lib/date'
import { clearDraft, loadDraft, saveDraft } from '@/lib/localDraft'
import { EntryForm } from './EntryForm'
import { EntrySaved } from './EntrySaved'
import { SOURCE_LABELS } from './labels'
import { useSaveManualEntry } from './useManualEntry'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const draftKey = (userId: string) => `hyrox-coach:manual-entry:${userId}`

/** Aktuelle Uhrzeit minus Dauer, auf 5 Minuten abgerundet – passt für „gerade fertig". */
function defaultTime(date: string, today: string, durationMin: number): string {
  if (date !== today) return '18:00'
  const start = new Date(Date.now() - durationMin * 60_000)
  if (toLocalIsoDate(start) !== today) return '00:00'
  const minutes = Math.floor(start.getMinutes() / 5) * 5
  return `${String(start.getHours()).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Training nachtragen (`/calendar/log/:date?type=trainer|manual`): Trainer-Session
 * oder eigenes Workout mit Übungen und Sätzen (docs/MANUAL_ENTRY.md §2).
 */
export function LogEntryPage() {
  const { date = '' } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const auth = useAuth()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : ''
  const [today] = useState(() => toLocalIsoDate())
  const source: EntrySource = params.get('type') === 'manual' ? 'manual' : 'trainer'
  const valid = DATE_PATTERN.test(date) && date <= today
  const key = `${date}:${source}`

  const [entry, setEntry] = useState<ManualEntry>(() => {
    const draft = loadDraft(draftKey(userId), null, restoreEntryDraft)
    if (draft && draft.key === key) return draft.entry
    return newEntry({
      id: crypto.randomUUID(),
      source,
      date,
      time: defaultTime(date, today, 60),
    })
  })
  const [saved, setSaved] = useState<SaveSessionResult | null>(null)

  const { catalog } = useExerciseCatalog()
  const measurementOf = (slug: string) =>
    catalog.data?.exercises.find((e) => e.slug === slug)?.measurement
  const save = useSaveManualEntry(measurementOf)

  const state = location.state as { from?: unknown } | null
  const calendarLink =
    typeof state?.from === 'string' && state.from.startsWith('/calendar')
      ? state.from
      : valid
        ? `/calendar?week=${weekStartOf(entry.date)}`
        : '/calendar'

  const backLink = (
    <Link
      to={calendarLink}
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
          Trainings lassen sich nur für heute oder vergangene Tage eintragen.
        </EmptyState>
      </>
    )
  }

  const change = (next: ManualEntry) => {
    setEntry(next)
    saveDraft(draftKey(userId), { key, entry: next })
  }

  return (
    <>
      {backLink}
      <PageHeader
        title={saved ? 'Eingetragen' : SOURCE_LABELS[entry.source]}
        subtitle={formatLongDay(entry.date)}
      />
      {saved ? (
        <EntrySaved
          result={saved}
          catalog={catalog.data?.exercises ?? []}
          showRecords
          calendarLink={`/calendar?week=${weekStartOf(entry.date)}`}
        />
      ) : catalog.isPending ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : catalog.isError ? (
        <EmptyState icon={CalendarIcon} title="Übungen konnten nicht geladen werden">
          <Button variant="secondary" className="mt-4" onClick={() => void catalog.refetch()}>
            Erneut versuchen
          </Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {save.isError && (
            <p
              role="alert"
              className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
            >
              Das Training konnte nicht gespeichert werden. Dein Eintrag bleibt erhalten – bitte
              versuche es erneut.
            </p>
          )}
          <EntryForm
            entry={entry}
            today={today}
            exercises={catalog.data.exercises}
            canChangeSource
            saving={save.isPending}
            saveLabel="Training speichern"
            onChange={change}
            onSave={() =>
              save.mutate(
                { entry, editing: false },
                {
                  onSuccess: (result) => {
                    clearDraft(draftKey(userId))
                    setSaved(result)
                    window.scrollTo({ top: 0 })
                  },
                },
              )
            }
          />
        </div>
      )}
    </>
  )
}
