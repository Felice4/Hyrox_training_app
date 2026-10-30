import { useState } from 'react'
import type { Checkin } from '@/api/readiness'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { Spinner } from '@/components/ui/Spinner'
import { readinessScore, readinessStatus } from '@/domain/readiness/readiness'
import { cn } from '@/lib/cn'
import { useSaveCheckin, useTodayCheckin } from './useCheckin'

type ScaleKey = 'energy' | 'soreness' | 'sleepQuality' | 'recovery'

/** Die vier Skalen (SPEC §11) – jeweils 1 bis 5, höher = besser. */
const SCALES: { key: ScaleKey; label: string; low: string; high: string }[] = [
  { key: 'energy', label: 'Energie', low: 'sehr niedrig', high: 'sehr hoch' },
  { key: 'soreness', label: 'Muskelkater', low: 'stark', high: 'keiner' },
  { key: 'sleepQuality', label: 'Schlaf', low: 'sehr schlecht', high: 'sehr gut' },
  { key: 'recovery', label: 'Erholt fühle ich mich', low: 'gar nicht', high: 'völlig' },
]

const OPTIONS = [1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }))

const LEVEL_TONE = {
  recovery: 'text-hyrox',
  reduced: 'text-hyrox',
  normal: 'text-fg',
  good: 'text-accent',
} as const

/**
 * Tagesform-Check-in: optional, ein Eintrag pro Tag (erneutes Speichern ändert ihn).
 * Der Generator nutzt ihn automatisch statt der Schnellauswahl.
 */
export function CheckinCard({ today }: { today: string }) {
  const checkin = useTodayCheckin(today)
  const [editing, setEditing] = useState(false)

  if (checkin.isPending) {
    return (
      <Card className="flex justify-center py-6">
        <Spinner className="text-accent" />
      </Card>
    )
  }
  if (checkin.isError) {
    return (
      <Card className="flex items-center justify-between gap-3 text-sm text-fg-muted">
        Tagesform konnte nicht geladen werden.
        <Button variant="secondary" onClick={() => void checkin.refetch()}>
          Erneut
        </Button>
      </Card>
    )
  }

  if (editing) {
    return <CheckinForm today={today} existing={checkin.data} onDone={() => setEditing(false)} />
  }

  if (!checkin.data) {
    return (
      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="font-semibold">Wie fühlst du dich heute?</h2>
          <p className="text-sm text-fg-muted">
            Kurzer Check-in mit vier Fragen – Workouts passen sich deiner Tagesform an.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Check-in starten
        </Button>
      </Card>
    )
  }

  const status = readinessStatus(checkin.data.score)
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-fg-muted">Tagesform heute</p>
          <p className={cn('font-display text-3xl font-bold uppercase', LEVEL_TONE[status.level])}>
            {status.label}
            <span className="ml-2 text-lg text-fg-muted">
              {String(checkin.data.score).replace('.', ',')} / 5
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          className="min-h-10 shrink-0 px-3 text-sm"
          onClick={() => setEditing(true)}
        >
          Ändern
        </Button>
      </div>
      <p className="text-sm text-fg-muted">{status.advice}</p>
      <p className="text-xs text-fg-muted/80">
        Ein Trainingshinweis aus deinen Angaben, keine medizinische Aussage.
      </p>
    </Card>
  )
}

function CheckinForm({
  today,
  existing,
  onDone,
}: {
  today: string
  existing: Checkin | null
  onDone: () => void
}) {
  const save = useSaveCheckin(today)
  const [values, setValues] = useState<Partial<Record<ScaleKey, number>>>(
    existing
      ? {
          energy: existing.energy,
          soreness: existing.soreness,
          sleepQuality: existing.sleepQuality,
          recovery: existing.recovery,
        }
      : {},
  )
  const complete = SCALES.every((s) => values[s.key] !== undefined)

  function submit() {
    const { energy, soreness, sleepQuality, recovery } = values
    if (
      energy === undefined ||
      soreness === undefined ||
      sleepQuality === undefined ||
      recovery === undefined
    ) {
      return
    }
    save.mutate(
      {
        id: existing?.id ?? crypto.randomUUID(),
        checkedAt: new Date().toISOString(),
        energy,
        soreness,
        sleepQuality,
        recovery,
        score: readinessScore({ kind: 'checkin', energy, soreness, sleepQuality, recovery }),
      },
      { onSuccess: onDone },
    )
  }

  return (
    <Card className="flex flex-col gap-5">
      <h2 className="font-semibold">Tagesform-Check-in</h2>
      {SCALES.map((scale) => (
        <SingleChoiceChips
          key={scale.key}
          label={scale.label}
          hint={`1 = ${scale.low} · 5 = ${scale.high}`}
          options={OPTIONS}
          value={values[scale.key] ?? ''}
          onChange={(value) => setValues((v) => ({ ...v, [scale.key]: value }))}
        />
      ))}
      {save.isError && (
        <p role="alert" className="text-sm text-danger">
          Speichern fehlgeschlagen. Bitte versuche es erneut.
        </p>
      )}
      <div className="flex gap-2">
        <Button disabled={!complete} loading={save.isPending} onClick={submit}>
          Speichern
        </Button>
        <Button variant="ghost" disabled={save.isPending} onClick={onDone}>
          Abbrechen
        </Button>
      </div>
    </Card>
  )
}
