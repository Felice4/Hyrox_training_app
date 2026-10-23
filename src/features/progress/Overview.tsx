import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import {
  PERIODS,
  frequency,
  periodBuckets,
  summarize,
  type FrequencyPoint,
  type Period,
} from '@/domain/progress/frequency'
import { usePlannedRange } from '@/features/calendar/usePlannedWorkouts'
import { useSessionsInRange } from '@/features/calendar/useSessionsInRange'
import { cn } from '@/lib/cn'
import { ChartCard, LegendItem } from './charts/ChartCard'
import { ColumnChart } from './charts/ColumnChart'
import { CHART } from './charts/theme'
import { formatMinutes } from './format'

const PERIOD_LABELS: Record<Period, string> = {
  '4w': '4 Wochen',
  '12w': '12 Wochen',
  '12m': '12 Monate',
}

const dayMonth = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
  timeZone: 'UTC',
})
const monthShort = new Intl.DateTimeFormat('de-DE', { month: 'short', timeZone: 'UTC' })

function bucketLabel(point: FrequencyPoint, period: Period): string {
  const date = new Date(`${point.from}T12:00:00Z`)
  return period === '12m' ? monthShort.format(date) : dayMonth.format(date)
}

/** Trainingshäufigkeit, Trainingszeit und Planerfüllung im gewählten Zeitraum. */
export function Overview({ today }: { today: string }) {
  const [period, setPeriod] = useState<Period>('12w')
  const buckets = periodBuckets(period, today)
  const from = buckets[0]?.from ?? today
  const to = buckets.at(-1)?.to ?? today
  const sessions = useSessionsInRange(from, to)
  const planned = usePlannedRange(from, to)

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Zeitraum" className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={period === p}
            onClick={() => setPeriod(p)}
            className={cn(
              'min-h-11 rounded-full border px-4 text-sm font-medium transition',
              period === p
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-line text-fg-muted hover:text-fg',
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {sessions.isPending || planned.isPending ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : sessions.isError || planned.isError ? (
        <Card className="flex flex-col items-start gap-3 text-sm text-fg-muted">
          Die Trainingsdaten konnten nicht geladen werden.
          <Button
            variant="secondary"
            onClick={() => {
              void sessions.refetch()
              void planned.refetch()
            }}
          >
            Erneut versuchen
          </Button>
        </Card>
      ) : (
        <OverviewContent
          period={period}
          today={today}
          points={frequency(buckets, sessions.data, planned.data)}
          planned={planned.data}
        />
      )}
    </div>
  )
}

function OverviewContent({
  period,
  today,
  points,
  planned,
}: {
  period: Period
  today: string
  points: FrequencyPoint[]
  planned: readonly { date: string; status: 'planned' | 'completed' | 'skipped' }[]
}) {
  const summary = summarize(points, planned, today)
  const unit = period === '12m' ? 'Monat' : 'Woche'
  const data = points.map((p) => ({ ...p, label: bucketLabel(p, period) }))
  const rowLabel = (p: FrequencyPoint) =>
    period === '12m'
      ? monthShort.format(new Date(`${p.from}T12:00:00Z`)) + ` ${p.from.slice(0, 4)}`
      : `Woche ab ${dayMonth.format(new Date(`${p.from}T12:00:00Z`))}`

  if (summary.sessions === 0 && summary.plannedDue === 0) {
    return (
      <Card className="text-sm text-fg-muted">
        Im gewählten Zeitraum gibt es noch keine Trainings. Sobald du Trainings speicherst,
        erscheinen hier Häufigkeit, Trainingszeit und Planerfüllung.
      </Card>
    )
  }

  const tiles = [
    { label: 'Trainings', value: String(summary.sessions) },
    { label: 'Trainingszeit', value: formatMinutes(summary.minutes) },
    { label: 'Ø pro Woche', value: String(summary.perWeek).replace('.', ',') },
    {
      label: 'Plan erfüllt',
      value: summary.adherence === null ? '–' : `${Math.round(summary.adherence * 100)} %`,
      hint:
        summary.adherence === null
          ? 'keine fälligen Einheiten'
          : `${summary.plannedDone} von ${summary.plannedDue} fälligen`,
    },
  ]

  return (
    <>
      <dl className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Card key={tile.label} className="p-4">
            <dt className="text-xs text-fg-muted">{tile.label}</dt>
            <dd className="mt-1 font-display text-3xl font-bold">{tile.value}</dd>
            {tile.hint && <dd className="text-xs text-fg-muted">{tile.hint}</dd>}
          </Card>
        ))}
      </dl>

      <ChartCard
        title={`Trainings pro ${unit}`}
        subtitle={`Absolvierte Einheiten · ${summary.trainingDays} Trainingstage im Zeitraum`}
        table={{
          columns: [unit, 'Trainings', 'Trainingstage'],
          rows: points.map((p) => [rowLabel(p), p.sessions, p.trainingDays]),
        }}
      >
        <ColumnChart
          data={data}
          series={[{ key: 'sessions', label: 'Trainings', color: CHART.accent }]}
        />
      </ChartCard>

      <ChartCard
        title={`Trainingszeit pro ${unit}`}
        subtitle={`Aktive Zeit · gesamt ${formatMinutes(summary.minutes)}`}
        table={{
          columns: [unit, 'Minuten'],
          rows: points.map((p) => [rowLabel(p), p.minutes]),
        }}
      >
        <ColumnChart
          data={data}
          series={[
            { key: 'minutes', label: 'Minuten', color: CHART.accent, format: formatMinutes },
          ]}
        />
      </ChartCard>

      <ChartCard
        title="Geplant und absolviert"
        subtitle="Einheiten aus dem Kalender – offene Einheiten zählen erst, wenn ihr Tag vorbei ist"
        legend={
          <div className="flex gap-4">
            <LegendItem swatch="bg-zinc-500" label="Geplant" />
            <LegendItem swatch="bg-accent" label="Davon absolviert" />
          </div>
        }
        table={{
          columns: [unit, 'Geplant', 'Absolviert'],
          rows: points.map((p) => [rowLabel(p), p.planned, p.plannedDone]),
        }}
      >
        <ColumnChart
          data={data}
          series={[
            { key: 'planned', label: 'Geplant', color: CHART.muted },
            { key: 'plannedDone', label: 'Davon absolviert', color: CHART.accent },
          ]}
        />
      </ChartCard>
    </>
  )
}
