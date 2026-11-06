import { Card } from '@/components/ui/Card'
import { SIMULATION_FORMAT_LABELS } from '@/domain/simulation/formats'
import {
  biggestLosses,
  buildSegments,
  previousSimulation,
  splitDeltas,
  type SimulationRecord,
} from '@/domain/simulation/simulation'
import { cn } from '@/lib/cn'
import { formatDurationClock } from '@/lib/time'
import { deltaTone, formatDelta } from './format'
import { useSimulations } from './useSimulations'

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric' })

/**
 * Ergebnis einer Simulation: Gesamtzeit, alle Abschnitte mit Differenz zur letzten
 * Simulation desselben Formats, die größten Zeitverluste markiert.
 */
export function SimulationResultCard({
  record,
  hyroxBestSec,
}: {
  record: SimulationRecord
  /** Wettkampf-Bestzeit aus dem Profil (nur beim kompletten Format verglichen) */
  hyroxBestSec?: number | null | undefined
}) {
  const simulations = useSimulations()
  const segments = buildSegments(record.format, record.division)
  const previous = previousSimulation(
    simulations.data ?? [],
    record.format,
    record.started_at,
    record.session_id,
  )
  const deltas = splitDeltas(record.splits, previous?.splits)
  const losses = biggestLosses(deltas)
  const totalDelta = previous ? record.total_sec - previous.totalSec : undefined
  const complete = record.splits.length === segments.length

  return (
    <Card className="flex flex-col gap-3 border-accent/40">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase">
          Simulation {complete ? '' : '(vorzeitig beendet)'}
        </h2>
        <p className="text-sm text-fg-muted">{SIMULATION_FORMAT_LABELS[record.format]}</p>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-display text-5xl font-bold tabular-nums">
          {formatDurationClock(record.total_sec)}
        </span>
        {totalDelta !== undefined && previous && (
          <span className={cn('text-sm font-semibold', deltaTone(totalDelta))}>
            {formatDelta(totalDelta)} zum {dateFormat.format(new Date(previous.startedAt))}
          </span>
        )}
      </div>
      {record.format === 'full' && complete && hyroxBestSec ? (
        <p className="text-sm text-fg-muted">
          Wettkampf-Bestzeit {formatDurationClock(hyroxBestSec)} ·{' '}
          <span className={deltaTone(record.total_sec - hyroxBestSec)}>
            {formatDelta(record.total_sec - hyroxBestSec)}
          </span>
        </p>
      ) : null}
      {!previous && (
        <p className="text-sm text-fg-muted">
          Erste Simulation in diesem Format – ab der nächsten siehst du hier den Vergleich.
        </p>
      )}
      {losses.length > 0 && (
        <p className="text-sm">
          <span className="text-fg-muted">Größte Zeitverluste: </span>
          {losses.map((i) => segments[i]?.label).join(', ')}
        </p>
      )}
      <ol className="divide-y divide-line">
        {record.splits.map((sec, i) => {
          const delta = deltas[i]
          return (
            <li
              key={i}
              className={cn(
                'flex items-center justify-between gap-3 py-1.5 text-sm',
                losses.includes(i) && 'font-semibold',
              )}
            >
              <span className={segments[i]?.kind === 'run' ? 'text-fg-muted' : undefined}>
                {losses.includes(i) && <span className="text-danger">▲ </span>}
                {segments[i]?.label}
              </span>
              <span className="flex items-baseline gap-3 tabular-nums">
                {delta !== undefined && (
                  <span className={cn('text-xs', deltaTone(delta))}>{formatDelta(delta)}</span>
                )}
                <span>{formatDurationClock(sec)}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
