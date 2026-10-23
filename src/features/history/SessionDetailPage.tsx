import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import type { SessionDetail, SessionExerciseDetail, SessionSetDetail } from '@/api/sessionHistory'
import { ChevronLeftIcon, DumbbellIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { TextArea } from '@/components/ui/TextArea'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { BLOCK_LABELS, FOCUS_LABELS, INTENSITY_LABELS } from '@/features/generator/labels'
import { describeRecord, describeTarget, rpeLabel } from '@/features/training/format'
import { cn } from '@/lib/cn'
import { useSessionDetail, useUpdateSessionNotes } from './useSessionHistory'

const longDate = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

/** Rücksprung: dorthin, wo das Training geöffnet wurde (Kalender, Start), sonst Historie. */
function backTarget(state: unknown): { to: string; label: string } {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from = state.from
    if (typeof from === 'string') {
      if (from.startsWith('/calendar')) return { to: from, label: 'Kalender' }
      if (from === '/') return { to: '/', label: 'Start' }
    }
  }
  return { to: '/history', label: 'Historie' }
}

export function SessionDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const detail = useSessionDetail(id)
  const back = backTarget(location.state)

  const backLink = (
    <Link
      to={back.to}
      className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
    >
      <ChevronLeftIcon width={18} height={18} />
      {back.label}
    </Link>
  )

  if (detail.isPending) {
    return (
      <>
        {backLink}
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      </>
    )
  }
  if (detail.isError || !detail.data) {
    return (
      <>
        {backLink}
        <EmptyState
          icon={DumbbellIcon}
          title={
            detail.isError ? 'Training konnte nicht geladen werden' : 'Training nicht gefunden'
          }
        >
          {detail.isError && (
            <Button variant="secondary" className="mt-4" onClick={() => void detail.refetch()}>
              Erneut versuchen
            </Button>
          )}
        </EmptyState>
      </>
    )
  }

  return (
    <>
      {backLink}
      <SessionView session={detail.data} />
    </>
  )
}

function SessionView({ session }: { session: SessionDetail }) {
  const { catalog } = useExerciseCatalog()
  const nameOf = (slug: string) =>
    catalog.data?.exercises.find((e) => e.slug === slug)?.name ?? slug
  const blocks = session.exercises.reduce<{ block: string; items: SessionExerciseDetail[] }[]>(
    (groups, exercise) => {
      const last = groups.at(-1)
      if (last && last.block === exercise.block) last.items.push(exercise)
      else groups.push({ block: exercise.block, items: [exercise] })
      return groups
    },
    [],
  )

  return (
    <div className="flex flex-col gap-4">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{INTENSITY_LABELS[session.intensity]}</Badge>
          {session.status === 'partial' && <Badge>teilweise absolviert</Badge>}
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-wide uppercase">
          {FOCUS_LABELS[session.focus]}
        </h1>
        <p className="text-fg-muted">
          {longDate.format(new Date(session.startedAt))} · {time(session.startedAt)}–
          {time(session.endedAt)} Uhr
        </p>
      </header>

      <dl className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <dt className="text-xs text-fg-muted">Aktive Zeit</dt>
          <dd className="font-display text-2xl font-bold">{session.durationMin} min</dd>
        </Card>
        <Card className="p-3">
          <dt className="text-xs text-fg-muted">Anstrengung</dt>
          <dd className="font-display text-2xl font-bold">
            {session.rpe !== undefined ? `RPE ${session.rpe}` : '–'}
          </dd>
          {session.rpe !== undefined && (
            <dd className="text-xs text-fg-muted">{rpeLabel(session.rpe)}</dd>
          )}
        </Card>
        <Card className="p-3">
          <dt className="text-xs text-fg-muted">Belastung</dt>
          <dd className="font-display text-2xl font-bold">{session.trainingLoad || '–'}</dd>
        </Card>
      </dl>

      <NotesCard session={session} />

      {session.records.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-1 font-semibold">Bestleistungen aus diesem Training</h2>
          <ul className="divide-y divide-line">
            {session.records.map((record) => {
              const { label, value } = describeRecord({
                record_type: record.recordType,
                context_key: record.contextKey,
                value: record.value,
              })
              return (
                <li
                  key={`${record.exerciseSlug}-${record.recordType}-${record.contextKey}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div>
                    <p className="font-medium">{nameOf(record.exerciseSlug)}</p>
                    <p className="text-xs text-fg-muted">{label}</p>
                  </div>
                  <span className="font-display text-xl font-bold text-accent">{value}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {blocks.map((group, index) => (
        <Card key={`${group.block}-${index}`} className="p-0">
          <h2 className="px-4 pt-4 pb-1 font-display text-2xl font-bold tracking-wide uppercase">
            {BLOCK_LABELS[group.block as keyof typeof BLOCK_LABELS] ?? group.block}
          </h2>
          <ul className="divide-y divide-line">
            {group.items.map((exercise) => (
              <li key={exercise.id} className="px-4 py-3">
                <ExerciseRow exercise={exercise} />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}

function NotesCard({ session }: { session: SessionDetail }) {
  const update = useUpdateSessionNotes(session.id)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(session.notes ?? '')

  if (!editing) {
    return (
      <Card className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="font-semibold">Notiz</h2>
          <p
            className={cn(
              'mt-1 text-sm whitespace-pre-line',
              session.notes ? 'text-fg' : 'text-fg-muted',
            )}
          >
            {session.notes ?? 'Keine Notiz.'}
          </p>
          {update.isSuccess && (
            <p role="status" className="mt-1 text-xs text-accent">
              Gespeichert.
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          className="min-h-10 shrink-0 px-3 text-sm"
          onClick={() => {
            setDraft(session.notes ?? '')
            update.reset()
            setEditing(true)
          }}
        >
          {session.notes ? 'Bearbeiten' : 'Hinzufügen'}
        </Button>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <TextArea
        label="Notiz"
        value={draft}
        maxLength={2000}
        rows={4}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
      />
      {update.isError && (
        <p role="alert" className="text-sm text-danger">
          Speichern fehlgeschlagen. Bitte versuche es erneut.
        </p>
      )}
      <div className="flex gap-2">
        <Button
          loading={update.isPending}
          onClick={() => update.mutate(draft, { onSuccess: () => setEditing(false) })}
        >
          Speichern
        </Button>
        <Button variant="ghost" disabled={update.isPending} onClick={() => setEditing(false)}>
          Abbrechen
        </Button>
      </div>
    </Card>
  )
}

function ExerciseRow({ exercise }: { exercise: SessionExerciseDetail }) {
  const location = useLocation()
  return (
    <div className={cn(exercise.status === 'skipped' && 'opacity-60')}>
      <div className="flex items-baseline justify-between gap-2">
        {exercise.slug ? (
          <Link
            to={`/exercises/${exercise.slug}`}
            state={{ backTo: location.pathname }}
            className="font-semibold hover:text-accent"
          >
            {exercise.name}
          </Link>
        ) : (
          <span className="font-semibold">{exercise.name}</span>
        )}
        {exercise.status === 'skipped' && <Badge>übersprungen</Badge>}
      </div>
      {exercise.replacedName && (
        <p className="text-xs text-fg-muted">statt {exercise.replacedName}</p>
      )}
      {exercise.sets.length > 0 && (
        <ol className="mt-1.5 flex flex-col gap-1">
          {exercise.sets.map((set) => (
            <SetRow key={set.setNumber} set={set} />
          ))}
        </ol>
      )}
    </div>
  )
}

function SetRow({ set }: { set: SessionSetDetail }) {
  const actual = describeTarget(set.actual)
  const target = describeTarget(set.target)
  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        className={cn(
          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold',
          set.completed ? 'bg-accent text-on-accent' : 'border border-line text-fg-muted',
        )}
        aria-label={set.completed ? 'geschafft' : 'nicht geschafft'}
      >
        {set.completed ? '✓' : '–'}
      </span>
      <div className="min-w-0">
        <span className={cn(!set.completed && 'text-fg-muted')}>
          {set.type === 'warmup' ? 'Aufwärmsatz' : `Satz ${set.setNumber}`}
          {set.completed && actual ? ` · ${actual}` : ''}
          {set.rpe !== undefined && ` · RPE ${String(set.rpe).replace('.', ',')}`}
        </span>
        {target && (!set.completed || target !== actual) && (
          <span className="block text-xs text-fg-muted">Vorgabe: {target}</span>
        )}
      </div>
    </li>
  )
}
