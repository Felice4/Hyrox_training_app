import { useId, useState } from 'react'
import type { CatalogExercise } from '@/api/exercises'
import { ChevronDownIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import {
  exerciseProgress,
  improvement,
  trainedExercises,
  type ExerciseProgress,
  type ProgressMetric,
  type ProgressSeries,
} from '@/domain/progress/exercise'
import { useSessionsInRange } from '@/features/calendar/useSessionsInRange'
import { formatDistance } from '@/features/exercises/format'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { describeTarget } from '@/features/training/format'
import { cn } from '@/lib/cn'
import { addDays } from '@/lib/date'
import { formatDurationClock } from '@/lib/time'
import { ChartCard } from './charts/ChartCard'
import { ColumnChart } from './charts/ColumnChart'
import { CHART } from './charts/theme'
import { TrendChart } from './charts/TrendChart'

const dayMonth = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
  timeZone: 'UTC',
})
const shortDate = (date: string) => dayMonth.format(new Date(`${date}T12:00:00Z`))
const decimal = (value: number) => String(Math.round(value * 10) / 10).replace('.', ',')

type Group = 'Kraft' | 'Ausdauer & Ergometer' | 'HYROX-Stationen' | 'Weitere'
const GROUPS: readonly Group[] = ['Kraft', 'HYROX-Stationen', 'Ausdauer & Ergometer', 'Weitere']

function groupOf(exercise: CatalogExercise): Group {
  if (exercise.hyroxStation) return 'HYROX-Stationen'
  if (exercise.category === 'strength') return 'Kraft'
  if (exercise.category === 'endurance') return 'Ausdauer & Ergometer'
  return 'Weitere'
}

/** Ruder- und Ski-Ergometer: Pace je 500 m, sonst je km. */
const paceBaseOf = (exercise: CatalogExercise) =>
  exercise.equipment.includes('rower') || exercise.equipment.includes('skierg') ? 500 : 1000

const METRIC_TEXT: Record<ProgressMetric, { title: string; note: string }> = {
  e1rm: {
    title: 'Geschätztes Maximalgewicht',
    note: 'Aus dem besten Satz je Training (bis 12 Wdh., Epley-Formel) – so sind Sätze mit unterschiedlicher Wiederholungszahl vergleichbar.',
  },
  max_reps: { title: 'Meiste Wiederholungen', note: 'Bester Satz je Training.' },
  max_weight: {
    title: 'Höchstes Gewicht',
    note: 'Nur Sätze über dieselbe Strecke bzw. Dauer werden verglichen.',
  },
  pace: {
    title: 'Pace',
    note: 'Nur Einheiten über dieselbe Strecke werden verglichen. Niedriger ist besser.',
  },
  distance: { title: 'Längste Strecke', note: 'Bester Satz je Training.' },
  duration: { title: 'Längste Dauer', note: 'Bester Satz je Training.' },
}

function formatterFor(metric: ProgressMetric, paceBase: number): (value: number) => string {
  switch (metric) {
    case 'e1rm':
    case 'max_weight':
      return (v) => `${decimal(v)} kg`
    case 'max_reps':
      return (v) => `${Math.round(v)} Wdh.`
    case 'pace':
      return (v) => `${formatDurationClock(v)} /${paceBase === 500 ? '500 m' : 'km'}`
    case 'distance':
      return (v) => formatDistance([v, v])
    case 'duration':
      return (v) => formatDurationClock(v)
  }
}

function seriesLabel(series: ProgressSeries): string {
  if (series.distanceM !== undefined) return formatDistance([series.distanceM, series.distanceM])
  if (series.durationSec !== undefined) return formatDurationClock(series.durationSec)
  return 'Alle'
}

/** Fortschritt einzelner Übungen aus den Trainings der letzten 12 Monate. */
export function ExerciseProgressView({ today }: { today: string }) {
  const sessions = useSessionsInRange(addDays(today, -364), today)
  const { catalog } = useExerciseCatalog()

  if (sessions.isPending || catalog.isPending) {
    return (
      <div role="status" className="flex justify-center py-12">
        <Spinner className="text-accent" />
      </div>
    )
  }
  if (sessions.isError || catalog.isError) {
    return (
      <Card className="flex flex-col items-start gap-3 text-sm text-fg-muted">
        Die Trainingsdaten konnten nicht geladen werden.
        <Button
          variant="secondary"
          onClick={() => {
            void sessions.refetch()
            void catalog.refetch()
          }}
        >
          Erneut versuchen
        </Button>
      </Card>
    )
  }

  const counts = trainedExercises(sessions.data)
  const trained = catalog.data.exercises
    .filter((e) => counts.has(e.slug))
    .sort((a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0))

  if (trained.length === 0) {
    return (
      <Card className="text-sm text-fg-muted">
        Noch keine Übungen trainiert. Nach deinen ersten gespeicherten Trainings siehst du hier, wie
        sich Gewichte, Wiederholungen, Zeiten und Pace entwickeln.
      </Card>
    )
  }

  return <ExerciseProgressContent sessions={sessions.data} trained={trained} counts={counts} />
}

function ExerciseProgressContent({
  sessions,
  trained,
  counts,
}: {
  sessions: Parameters<typeof exerciseProgress>[0]
  trained: CatalogExercise[]
  counts: Map<string, number>
}) {
  const selectId = useId()
  const [slug, setSlug] = useState(
    () => (trained.find((e) => groupOf(e) === 'Kraft') ?? trained[0])?.slug ?? '',
  )
  const [seriesKey, setSeriesKey] = useState<string | null>(null)
  const exercise = trained.find((e) => e.slug === slug) ?? trained[0]
  if (!exercise) return null

  const paceBase = paceBaseOf(exercise)
  const progress = exerciseProgress(sessions, exercise.slug, exercise.measurement, paceBase)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-xs font-medium text-fg-muted">
          Übung
        </label>
        <div className="relative">
          <select
            id={selectId}
            value={exercise.slug}
            onChange={(event) => {
              setSlug(event.target.value)
              setSeriesKey(null)
            }}
            className="min-h-12 w-full appearance-none truncate rounded-xl border border-line bg-surface pr-10 pl-4 text-base text-fg outline-none focus:border-accent"
          >
            {GROUPS.map((group) => {
              const items = trained.filter((e) => groupOf(e) === group)
              return items.length > 0 ? (
                <optgroup key={group} label={group}>
                  {items.map((e) => (
                    <option key={e.slug} value={e.slug}>
                      {e.name} ({counts.get(e.slug)}×)
                    </option>
                  ))}
                </optgroup>
              ) : null
            })}
          </select>
          <ChevronDownIcon
            width={18}
            height={18}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-muted"
          />
        </div>
      </div>

      {progress && progress.series.length > 0 ? (
        <ProgressDetails
          progress={progress}
          paceBase={paceBase}
          seriesKey={seriesKey}
          onSeriesChange={setSeriesKey}
        />
      ) : (
        <Card className="text-sm text-fg-muted">
          {progress
            ? 'Für diese Übung gibt es noch keine vergleichbaren Werte (z. B. Gewicht und Wiederholungen bis 12).'
            : 'Diese Übung wird in Kalorien gemessen – dafür gibt es noch keine Auswertung.'}
        </Card>
      )}
    </div>
  )
}

function ProgressDetails({
  progress,
  paceBase,
  seriesKey,
  onSeriesChange,
}: {
  progress: ExerciseProgress
  paceBase: number
  seriesKey: string | null
  onSeriesChange: (key: string) => void
}) {
  const series = progress.series.find((s) => s.key === seriesKey) ?? progress.series[0]
  if (!series) return null
  const format = formatterFor(progress.metric, paceBase)
  const text = METRIC_TEXT[progress.metric]
  const values = series.points.map((p) => p.value)
  const best = progress.lowerIsBetter ? Math.min(...values) : Math.max(...values)
  const latest = series.points.at(-1)
  const change = improvement(series, progress.lowerIsBetter)

  const tiles = [
    { label: 'Zuletzt', value: latest ? format(latest.value) : '–' },
    { label: 'Bestwert', value: format(best) },
    {
      label: 'Seit dem ersten Mal',
      value:
        change === null
          ? '–'
          : change === 0
            ? '±0'
            : `${change > 0 ? '+' : '−'}${format(Math.abs(change)).replace(/ \/.*$/, '')}`,
      tone: change === null || change === 0 ? undefined : change > 0 ? 'better' : 'worse',
    },
  ]

  return (
    <>
      {progress.series.length > 1 && (
        <div role="group" aria-label="Vergleichbare Einheiten" className="flex flex-wrap gap-2">
          {progress.series.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={s.key === series.key}
              onClick={() => onSeriesChange(s.key)}
              className={cn(
                'min-h-11 rounded-full border px-4 text-sm font-medium',
                s.key === series.key
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-line text-fg-muted hover:text-fg',
              )}
            >
              {seriesLabel(s)} · {s.points.length}×
            </button>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <Card key={tile.label} className="p-3">
            <dt className="text-xs text-fg-muted">{tile.label}</dt>
            <dd className="mt-1 font-display text-xl font-bold">{tile.value}</dd>
            {tile.tone && (
              <dd
                className={cn('text-xs', tile.tone === 'better' ? 'text-accent' : 'text-fg-muted')}
              >
                {tile.tone === 'better' ? '▲ besser' : '▼ schwächer'}
              </dd>
            )}
          </Card>
        ))}
      </dl>

      <ChartCard
        title={`${text.title}${series.distanceM !== undefined || series.durationSec !== undefined ? ` · ${seriesLabel(series)}` : ''}`}
        subtitle={text.note}
        table={{
          columns: ['Datum', text.title, 'Bester Satz'],
          rows: [...series.points]
            .reverse()
            .map((p) => [shortDate(p.date), format(p.value), describeTarget(p.set)]),
        }}
      >
        {series.points.length < 2 ? (
          <p className="py-6 text-center text-sm text-fg-muted">
            Ab dem zweiten Training erscheint hier der Verlauf.
          </p>
        ) : (
          <TrendChart
            data={series.points.map((p) => ({
              label: shortDate(p.date),
              value: p.value,
              detail: describeTarget(p.set),
            }))}
            format={format}
          />
        )}
      </ChartCard>

      {progress.volume.length > 0 && (
        <ChartCard
          title={progress.metric === 'e1rm' ? 'Trainingsvolumen' : 'Wiederholungen gesamt'}
          subtitle={
            progress.metric === 'e1rm'
              ? 'Gewicht × Wiederholungen aller Arbeitssätze je Training'
              : 'Alle Arbeitssätze je Training'
          }
          table={{
            columns: ['Datum', progress.metric === 'e1rm' ? 'kg × Wdh.' : 'Wdh.'],
            rows: [...progress.volume].reverse().map((v) => [shortDate(v.date), v.value]),
          }}
        >
          <ColumnChart
            data={progress.volume.map((v) => ({ label: shortDate(v.date), value: v.value }))}
            series={[
              {
                key: 'value',
                label: progress.metric === 'e1rm' ? 'kg × Wdh.' : 'Wdh.',
                color: CHART.accent,
                format: (v) => v.toLocaleString('de-DE'),
              },
            ]}
          />
        </ChartCard>
      )}

      {progress.repBests.length > 0 && (
        <Card className="p-4">
          <h2 className="font-semibold">Bestes Gewicht je Wiederholungszahl</h2>
          <p className="mb-2 text-xs text-fg-muted">Direkt vergleichbar: gleiche Wiederholungen</p>
          <ul className="divide-y divide-line">
            {progress.repBests.map((best) => (
              <li key={best.reps} className="flex items-baseline justify-between py-2 text-sm">
                <span>
                  {best.reps} Wdh.
                  <span className="ml-2 text-xs text-fg-muted">{shortDate(best.date)}</span>
                </span>
                <span className="font-display text-lg font-bold">{decimal(best.weightKg)} kg</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
