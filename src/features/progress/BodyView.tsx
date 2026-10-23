import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import { cn } from '@/lib/cn'
import { ChartCard } from './charts/ChartCard'
import { TrendChart } from './charts/TrendChart'
import {
  BODY_METRICS,
  EMPTY_FORM,
  metricSeries,
  parseMeasurementForm,
  recordedMetrics,
  type BodyMetricKey,
  type MeasurementEntry,
  type MeasurementForm,
} from './measurements'
import { useDeleteMeasurement, useMeasurements, useSaveMeasurement } from './useMeasurements'

const dayMonthYear = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
  year: '2-digit',
  timeZone: 'UTC',
})
const formatDate = (date: string) => dayMonthYear.format(new Date(`${date}T12:00:00Z`))
const decimal = (value: number) => String(Math.round(value * 10) / 10).replace('.', ',')
const metricOf = (key: BodyMetricKey) => BODY_METRICS.find((m) => m.key === key)!

/** Körperwerte erfassen und ihren Verlauf ansehen (nur tatsächlich erfasste Werte). */
export function BodyView({ today }: { today: string }) {
  const measurements = useMeasurements()

  return (
    <div className="flex flex-col gap-4">
      <MeasurementFormCard today={today} />
      {measurements.isPending ? (
        <div role="status" className="flex justify-center py-8">
          <Spinner className="text-accent" />
        </div>
      ) : measurements.isError ? (
        <Card className="flex flex-col items-start gap-3 text-sm text-fg-muted">
          Die Körperwerte konnten nicht geladen werden.
          <Button variant="secondary" onClick={() => void measurements.refetch()}>
            Erneut versuchen
          </Button>
        </Card>
      ) : measurements.data.length === 0 ? (
        <Card className="text-sm text-fg-muted">
          Noch keine Körperwerte erfasst. Alles ist freiwillig – trage nur ein, was du verfolgen
          möchtest.
        </Card>
      ) : (
        <History entries={measurements.data} />
      )}
    </div>
  )
}

function MeasurementFormCard({ today }: { today: string }) {
  const save = useSaveMeasurement()
  const [date, setDate] = useState(today)
  const [form, setForm] = useState<MeasurementForm>(EMPTY_FORM)
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Partial<Record<BodyMetricKey | 'form', string>>>({})
  const [saved, setSaved] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    setSaved(false)
    const parsed = parseMeasurementForm(form)
    if (!date || date > today) {
      setErrors({ form: 'Bitte ein Datum bis heute wählen.' })
      return
    }
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }
    setErrors({})
    save.mutate(
      { date, values: parsed.values, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM)
          setNotes('')
          setSaved(true)
        },
      },
    )
  }

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <h2 className="font-semibold">Werte erfassen</h2>
        <TextField
          label="Datum"
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          {BODY_METRICS.map((metric) => (
            <TextField
              key={metric.key}
              label={metric.label}
              inputMode="decimal"
              autoComplete="off"
              value={form[metric.key]}
              error={errors[metric.key]}
              trailing={<span className="pr-3 text-sm text-fg-muted">{metric.unit}</span>}
              onChange={(e) => setForm({ ...form, [metric.key]: e.target.value })}
            />
          ))}
        </div>
        <TextField
          label="Notiz (optional)"
          value={notes}
          maxLength={500}
          onChange={(e) => setNotes(e.target.value)}
        />
        <p className="text-xs text-fg-muted">
          Leere Felder bleiben unverändert. Gibt es für den Tag schon Werte, werden nur die
          eingetragenen ersetzt.
        </p>
        {errors.form && (
          <p role="alert" className="text-sm text-danger">
            {errors.form}
          </p>
        )}
        {save.isError && (
          <p role="alert" className="text-sm text-danger">
            Speichern fehlgeschlagen. Bitte versuche es erneut.
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-accent">
            Gespeichert.
          </p>
        )}
        <Button type="submit" loading={save.isPending}>
          Speichern
        </Button>
      </form>
    </Card>
  )
}

function History({ entries }: { entries: MeasurementEntry[] }) {
  const metrics = recordedMetrics(entries)
  const [selected, setSelected] = useState<BodyMetricKey | null>(null)
  const key = selected && metrics.includes(selected) ? selected : metrics[0]
  const remove = useDeleteMeasurement()
  if (!key) return null
  const metric = metricOf(key)
  const series = metricSeries(entries, key)
  const format = (v: number) => `${decimal(v)} ${metric.unit}`
  const first = series[0]
  const last = series.at(-1)

  return (
    <>
      {metrics.length > 1 && (
        <div role="group" aria-label="Messwert" className="flex flex-wrap gap-2">
          {metrics.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={m === key}
              onClick={() => setSelected(m)}
              className={cn(
                'min-h-11 rounded-full border px-4 text-sm font-medium',
                m === key
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-line text-fg-muted hover:text-fg',
              )}
            >
              {metricOf(m).label}
            </button>
          ))}
        </div>
      )}

      <ChartCard
        title={metric.label}
        subtitle={
          first && last && series.length > 1
            ? `${formatDate(first.date)}: ${format(first.value)} → ${formatDate(last.date)}: ${format(last.value)}`
            : `${series.length} Messung`
        }
        table={{
          columns: ['Datum', metric.label],
          rows: [...series].reverse().map((p) => [formatDate(p.date), format(p.value)]),
        }}
      >
        {series.length < 2 ? (
          <p className="py-6 text-center text-sm text-fg-muted">
            Ab der zweiten Messung erscheint hier der Verlauf.
          </p>
        ) : (
          <TrendChart
            data={series.map((p) => ({ label: formatDate(p.date), value: p.value }))}
            format={format}
          />
        )}
      </ChartCard>

      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Alle Einträge</h2>
        <ul className="divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{formatDate(entry.date)}</p>
                <p className="text-xs text-fg-muted">
                  {BODY_METRICS.filter((m) => entry.values[m.key] !== undefined)
                    .map((m) => `${m.label} ${decimal(entry.values[m.key]!)} ${m.unit}`)
                    .join(' · ')}
                </p>
                {entry.notes && <p className="text-xs text-fg-muted italic">{entry.notes}</p>}
              </div>
              <Button
                variant="ghost"
                className="min-h-10 px-3 text-xs"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Eintrag vom ${formatDate(entry.date)} löschen?`)) {
                    remove.mutate(entry.id)
                  }
                }}
              >
                Löschen
              </Button>
            </li>
          ))}
        </ul>
        {remove.isError && (
          <p role="alert" className="mt-2 text-sm text-danger">
            Löschen fehlgeschlagen. Bitte versuche es erneut.
          </p>
        )}
      </Card>
    </>
  )
}
