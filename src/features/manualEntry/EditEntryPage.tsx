import { useState } from 'react'
import { Link, useParams } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import type { SaveSessionResult } from '@/api/sessions'
import { ChevronLeftIcon, DumbbellIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import type { ManualEntry } from '@/domain/manualEntry/entry'
import { formatLongDay } from '@/features/calendar/format'
import { weekStartOf } from '@/features/calendar/week'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { useSessionDetail } from '@/features/history/useSessionHistory'
import { toLocalIsoDate } from '@/lib/date'
import { EntryForm } from './EntryForm'
import { EntrySaved } from './EntrySaved'
import { entryFromDetail } from './fromDetail'
import { SOURCE_LABELS } from './labels'
import { useSaveManualEntry } from './useManualEntry'

/** Nachgetragenes Training bzw. Trainer-Session bearbeiten (`/history/:id/edit`). */
export function EditEntryPage() {
  const { id = '' } = useParams()
  const detail = useSessionDetail(id)
  const { catalog } = useExerciseCatalog()

  const backLink = (
    <Link
      to={`/history/${id}`}
      className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
    >
      <ChevronLeftIcon width={18} height={18} />
      Training
    </Link>
  )

  if (detail.isPending || catalog.isPending) {
    return (
      <>
        {backLink}
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      </>
    )
  }
  if (detail.isError || catalog.isError) {
    return (
      <>
        {backLink}
        <EmptyState icon={DumbbellIcon} title="Training konnte nicht geladen werden">
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              void detail.refetch()
              void catalog.refetch()
            }}
          >
            Erneut versuchen
          </Button>
        </EmptyState>
      </>
    )
  }
  const exercises = catalog.data.exercises
  const entry =
    detail.data &&
    entryFromDetail(
      detail.data,
      (slug) => exercises.find((e) => e.slug === slug)?.measurement,
      () => crypto.randomUUID(),
    )
  if (!entry) {
    return (
      <>
        {backLink}
        <EmptyState icon={DumbbellIcon} title="Nicht bearbeitbar">
          Nur nachgetragene Trainings und Trainer-Sessions lassen sich bearbeiten. Bei Trainings aus
          dem Trainingsmodus kannst du die Notiz ändern.
        </EmptyState>
      </>
    )
  }
  return (
    <>
      {backLink}
      <EditEntryContent initial={entry} exercises={exercises} />
    </>
  )
}

function EditEntryContent({
  initial,
  exercises,
}: {
  initial: ManualEntry
  exercises: readonly CatalogExercise[]
}) {
  const [today] = useState(() => toLocalIsoDate())
  const [entry, setEntry] = useState(initial)
  const [saved, setSaved] = useState<SaveSessionResult | null>(null)
  const save = useSaveManualEntry((slug) => exercises.find((e) => e.slug === slug)?.measurement)

  return (
    <>
      <PageHeader
        title={saved ? 'Gespeichert' : `${SOURCE_LABELS[entry.source]} bearbeiten`}
        subtitle={formatLongDay(entry.date)}
      />
      {saved ? (
        <EntrySaved
          result={saved}
          catalog={exercises}
          showRecords={false}
          calendarLink={`/calendar?week=${weekStartOf(entry.date)}`}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {save.isError && (
            <p
              role="alert"
              className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
            >
              Die Änderungen konnten nicht gespeichert werden. Bitte versuche es erneut.
            </p>
          )}
          <EntryForm
            entry={entry}
            today={today}
            exercises={exercises}
            canChangeSource={false}
            saving={save.isPending}
            saveLabel="Änderungen speichern"
            onChange={setEntry}
            onSave={() =>
              save.mutate(
                { entry, editing: true },
                {
                  onSuccess: (result) => {
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
