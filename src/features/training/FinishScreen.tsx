import { useState } from 'react'
import { Link } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import type { SaveSessionResult } from '@/api/sessions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextArea } from '@/components/ui/TextArea'
import { toSaveSessionPayload } from '@/domain/session/payload'
import { reopenSession, summarizeSession, type SessionSummary } from '@/domain/session/session'
import type { ActiveSession } from '@/domain/session/types'
import { describeRecord } from './format'
import { RpePicker } from './inputs/RpePicker'
import type { SessionAction } from './useActiveSession'
import { useSaveSession } from './useSaveSession'

function SummaryGrid({ summary }: { summary: SessionSummary }) {
  const items = [
    { label: 'Trainingszeit', value: `${summary.activeMinutes} min` },
    { label: 'Sätze', value: `${summary.completedSets}/${summary.totalSets}` },
    ...(summary.volumeKg > 0
      ? [{ label: 'Bewegtes Gewicht', value: `${summary.volumeKg.toLocaleString('de-DE')} kg` }]
      : []),
    ...(summary.distanceM > 0
      ? [
          {
            label: 'Strecke',
            value: `${(summary.distanceM / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} km`,
          },
        ]
      : []),
  ]
  return (
    <dl className="grid grid-cols-2 gap-4">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-fg-muted">{item.label}</dt>
          <dd className="font-display text-3xl font-bold">{item.value}</dd>
        </div>
      ))}
      <div className="col-span-2 text-sm text-fg-muted">
        {summary.completedExercises} Übungen vollständig
        {summary.partialExercises > 0 && `, ${summary.partialExercises} teilweise`}
        {summary.skippedExercises > 0 && `, ${summary.skippedExercises} ausgelassen`}
      </div>
    </dl>
  )
}

interface FinishScreenProps {
  session: ActiveSession
  apply: (action: SessionAction) => void
  onSaved: (result: SaveSessionResult, summary: SessionSummary) => void
}

/** Abschluss: Anstrengung bewerten, Notiz, speichern (oder weiter trainieren). */
export function FinishScreen({ session, apply, onSaved }: FinishScreenProps) {
  const [sessionRpe, setSessionRpe] = useState<number | undefined>(undefined)
  const [notes, setNotes] = useState('')
  const save = useSaveSession()
  const summary = summarizeSession(session, session.finishedAt ?? session.startedAt)

  function handleSave() {
    save.mutate(toSaveSessionPayload(session, { sessionRpe, notes }), {
      onSuccess: (result) => onSaved(result, summary),
    })
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <h1 className="font-display text-4xl font-bold tracking-wide uppercase">Geschafft!</h1>
      <Card>
        <SummaryGrid summary={summary} />
      </Card>
      <Card className="flex flex-col gap-5">
        <RpePicker
          label="Wie anstrengend war das Training?"
          value={sessionRpe}
          onChange={setSessionRpe}
        />
        <TextArea
          label="Notizen (optional)"
          placeholder="z. B. Knie leicht gemerkt, Sled lief gut"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
        />
      </Card>
      {save.isError && (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          Speichern fehlgeschlagen. Dein Training bleibt auf diesem Gerät gesichert – bitte
          Internetverbindung prüfen und erneut versuchen.
        </p>
      )}
      <Button fullWidth className="min-h-14 text-lg" loading={save.isPending} onClick={handleSave}>
        {save.isError ? 'Erneut speichern' : 'Training speichern'}
      </Button>
      <Button
        variant="ghost"
        disabled={save.isPending}
        onClick={() => apply((s, now) => reopenSession(s, now))}
      >
        Doch weiter trainieren
      </Button>
    </div>
  )
}

interface SavedScreenProps {
  result: SaveSessionResult
  summary: SessionSummary
  catalog: readonly CatalogExercise[]
}

/** Bestätigung nach dem Speichern mit neuen Bestleistungen. */
export function SavedScreen({ result, summary, catalog }: SavedScreenProps) {
  const nameOf = (slug: string) => catalog.find((e) => e.slug === slug)?.name ?? slug
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <h1 className="font-display text-4xl font-bold tracking-wide uppercase">Gespeichert ✓</h1>
      <Card>
        <SummaryGrid summary={summary} />
      </Card>
      {result.new_records.length > 0 && (
        <Card className="flex flex-col gap-3 border-accent/40">
          <h2 className="font-display text-2xl font-bold text-accent uppercase">
            {result.new_records.length === 1 ? 'Neue Bestleistung!' : 'Neue Bestleistungen!'}
          </h2>
          <ul className="flex flex-col gap-2">
            {result.new_records.map((record) => {
              const { label, value } = describeRecord(record)
              return (
                <li
                  key={`${record.exercise_slug}-${record.record_type}-${record.context_key}`}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span>
                    <span className="font-semibold">{nameOf(record.exercise_slug)}</span>
                    <span className="block text-xs text-fg-muted">{label}</span>
                  </span>
                  <span className="font-display text-2xl font-bold">{value}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
      <Link
        to="/"
        className="inline-flex min-h-14 items-center justify-center rounded-xl bg-accent px-5 text-lg font-semibold text-on-accent"
      >
        Zur Startseite
      </Link>
      <Link
        to="/training"
        className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-semibold text-fg-muted hover:bg-surface-raised"
      >
        Neues Workout erstellen
      </Link>
    </div>
  )
}
