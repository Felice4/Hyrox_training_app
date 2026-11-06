import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Spinner } from '@/components/ui/Spinner'
import { HYROX_STATION_LABELS } from '@/data/exercises/vocabulary'
import {
  SIMULATION_FORMAT_LABELS,
  SIMULATION_FORMATS,
  type SimulationFormat,
} from '@/domain/simulation/formats'
import {
  bestSplits,
  buildSegments,
  simulationStats,
  type SimulationResult,
} from '@/domain/simulation/simulation'
import { ChartCard } from '@/features/progress/charts/ChartCard'
import { TrendChart } from '@/features/progress/charts/TrendChart'
import { useProfileDetails } from '@/features/profile/useProfile'
import { cn } from '@/lib/cn'
import { formatDurationClock } from '@/lib/time'
import { deltaTone, formatDelta } from './format'
import { useSimulations } from './useSimulations'

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric' })
const longDate = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
  year: '2-digit',
})

/** Statistik → HYROX: Verlauf der Simulationen, Lauf vs. Stationen, Bestzeiten je Abschnitt. */
export function SimulationsView() {
  const simulations = useSimulations()
  const details = useProfileDetails()
  const [picked, setPicked] = useState<SimulationFormat | undefined>()

  if (simulations.isPending) {
    return (
      <div role="status" className="flex justify-center py-12">
        <Spinner className="text-accent" />
      </div>
    )
  }
  if (simulations.isError) {
    return (
      <Card className="flex flex-col items-start gap-3 text-sm text-fg-muted">
        Die Simulationen konnten nicht geladen werden.
        <Button variant="secondary" onClick={() => void simulations.refetch()}>
          Erneut versuchen
        </Button>
      </Card>
    )
  }

  const all = simulations.data
  if (all.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-3 text-sm text-fg-muted">
        Noch keine HYROX-Simulation gespeichert. Hier siehst du danach den Verlauf deiner
        Gesamtzeiten und Zwischenzeiten.
        <Link to="/training/simulation" className="font-medium text-accent">
          Simulation starten →
        </Link>
      </Card>
    )
  }

  const formats = SIMULATION_FORMATS.filter((f) => all.some((r) => r.format === f))
  // Standard: Format der letzten Simulation
  const format = picked && formats.includes(picked) ? picked : all[0]!.format
  return (
    <div className="flex flex-col gap-4">
      {formats.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Format">
          {formats.map((f) => (
            <Chip key={f} selected={f === format} onClick={() => setPicked(f)}>
              {SIMULATION_FORMAT_LABELS[f]}
            </Chip>
          ))}
        </div>
      )}
      <FormatDetails
        results={all.filter((r) => r.format === format)}
        format={format}
        hyroxBestSec={details.data?.profile?.hyrox_best_time_sec ?? null}
      />
    </div>
  )
}

function FormatDetails({
  results,
  format,
  hyroxBestSec,
}: {
  results: SimulationResult[]
  format: SimulationFormat
  hyroxBestSec: number | null
}) {
  // Neueste zuerst (aus der Datenbank), für das Diagramm aufsteigend
  const complete = results.filter(
    (r) => r.splits.length === buildSegments(r.format, r.division).length,
  )
  const latest = results[0]!
  const segments = buildSegments(latest.format, latest.division)
  const best = complete.reduce<SimulationResult | undefined>(
    (b, r) => (!b || r.totalSec < b.totalSec ? r : b),
    undefined,
  )
  const bests = bestSplits(results)
  const stats = simulationStats(latest)
  const chronological = [...complete].reverse()

  return (
    <>
      <Card className="grid grid-cols-2 gap-4 p-4">
        <div>
          <p className="text-xs text-fg-muted">Letzte Simulation</p>
          <p className="font-display text-3xl font-bold tabular-nums">
            {formatDurationClock(latest.totalSec)}
          </p>
          <p className="text-xs text-fg-muted">{longDate.format(new Date(latest.startedAt))}</p>
        </div>
        {best && (
          <div>
            <p className="text-xs text-fg-muted">Beste Simulation</p>
            <p className="font-display text-3xl font-bold tabular-nums text-accent">
              {formatDurationClock(best.totalSec)}
            </p>
            <p className="text-xs text-fg-muted">{longDate.format(new Date(best.startedAt))}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-fg-muted">Laufen gesamt</p>
          <p className="text-lg font-semibold tabular-nums">{formatDurationClock(stats.runSec)}</p>
          {stats.runPacePerKmSec !== undefined && (
            <p className="text-xs text-fg-muted">
              Ø {formatDurationClock(stats.runPacePerKmSec)} /km inkl. Roxzone
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-fg-muted">Stationen gesamt</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatDurationClock(stats.stationSec)}
          </p>
          {stats.slowestStation && (
            <p className="text-xs text-fg-muted">
              Längste: {HYROX_STATION_LABELS[stats.slowestStation.station]} (
              {formatDurationClock(stats.slowestStation.sec)})
            </p>
          )}
        </div>
        {format === 'full' && hyroxBestSec !== null && (
          <p className="col-span-2 text-sm text-fg-muted">
            Wettkampf-Bestzeit laut Profil:{' '}
            <strong className="text-fg">{formatDurationClock(hyroxBestSec)}</strong>
          </p>
        )}
      </Card>

      {chronological.length > 0 && (
        <ChartCard
          title="Gesamtzeit"
          subtitle={`${SIMULATION_FORMAT_LABELS[format]} · niedriger ist besser`}
          table={{
            columns: ['Datum', 'Zeit'],
            rows: chronological.map((r) => [
              longDate.format(new Date(r.startedAt)),
              formatDurationClock(r.totalSec),
            ]),
          }}
        >
          <TrendChart
            data={chronological.map((r) => ({
              label: dateFormat.format(new Date(r.startedAt)),
              value: r.totalSec,
            }))}
            format={formatDurationClock}
            reference={
              format === 'full' && hyroxBestSec !== null
                ? { value: hyroxBestSec, label: 'Wettkampf' }
                : undefined
            }
          />
        </ChartCard>
      )}

      <Card className="p-4">
        <h2 className="mb-1 font-semibold">Abschnitte</h2>
        <p className="mb-2 text-xs text-fg-muted">
          Letzte Simulation im Vergleich zu deiner besten Zeit je Abschnitt.
        </p>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-left text-xs text-fg-muted">
            <tr>
              <th className="py-1.5 pr-2 font-medium">Abschnitt</th>
              <th className="py-1.5 text-right font-medium">Letzte</th>
              <th className="py-1.5 text-right font-medium">Beste</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {segments.map((segment, i) => {
              const last = latest.splits[i]
              const top = bests[i]
              const delta = last !== undefined && top !== undefined ? last - top : undefined
              return (
                <tr key={i}>
                  <td
                    className={cn(
                      'py-1.5 pr-2',
                      segment.kind === 'run' ? 'text-fg-muted' : 'font-medium',
                    )}
                  >
                    {segment.label}
                  </td>
                  <td className="py-1.5 text-right">
                    {last === undefined ? '–' : formatDurationClock(last)}
                    {delta !== undefined && delta > 0 && (
                      <span className={cn('ml-2 text-xs', deltaTone(delta))}>
                        {formatDelta(delta)}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right text-fg-muted">
                    {top === undefined ? '–' : formatDurationClock(top)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <h2 className="mb-1 font-semibold">Alle Simulationen</h2>
        <ul className="divide-y divide-line">
          {results.map((r, i) => {
            const older = results[i + 1]
            const delta = older ? r.totalSec - older.totalSec : undefined
            return (
              <li key={r.sessionId}>
                <Link
                  to={`/history/${r.sessionId}`}
                  className="flex min-h-11 items-center justify-between gap-3 py-2 hover:text-accent"
                >
                  <span>{longDate.format(new Date(r.startedAt))}</span>
                  <span className="flex items-baseline gap-3 tabular-nums">
                    {delta !== undefined && (
                      <span className={cn('text-xs', deltaTone(delta))}>{formatDelta(delta)}</span>
                    )}
                    <span className="font-semibold">{formatDurationClock(r.totalSec)}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Card>
    </>
  )
}
