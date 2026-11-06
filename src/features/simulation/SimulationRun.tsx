import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { finishSession } from '@/domain/session/session'
import type { ActiveSession } from '@/domain/session/types'
import { DIVISION_LABELS, SIMULATION_FORMAT_LABELS } from '@/domain/simulation/formats'
import {
  buildSegments,
  cumulativeDelta,
  currentSegmentIndex,
  describeSegment,
  previousSimulation,
  raceElapsed,
  recordSplit,
  segmentElapsed,
  splitTimes,
  startRace,
  undoSplit,
} from '@/domain/simulation/simulation'
import type { SessionAction } from '@/features/training/useActiveSession'
import { useNow, useWakeLock, vibrate } from '@/features/training/useDeviceFeatures'
import { cn } from '@/lib/cn'
import { formatDurationClock } from '@/lib/time'
import { deltaTone, formatDelta } from './format'
import { useSimulations } from './useSimulations'

/**
 * Laufende HYROX-Simulation (Vollbild): Rennuhr, aktueller Abschnitt, „Abschnitt fertig".
 * Zeiten hängen an Zeitstempeln – die Uhr stimmt auch nach Sperrbildschirm oder App-Wechsel.
 */
export function SimulationRun({
  session,
  apply,
  onDiscard,
}: {
  session: ActiveSession
  apply: (action: SessionAction) => void
  onDiscard: () => void
}) {
  const meta = session.simulation!
  const started = meta.raceStartedAt !== undefined
  const now = useNow(started)
  useWakeLock(true)
  const simulations = useSimulations()

  const segments = buildSegments(meta.format, meta.division)
  const index = currentSegmentIndex(session)
  const current = index === undefined ? undefined : segments[index]
  const upcoming = index === undefined ? undefined : segments[index + 1]
  const splits = splitTimes(session)
  const previous = previousSimulation(
    simulations.data ?? [],
    meta.format,
    meta.raceStartedAt ?? now,
    session.id,
  )
  const behind = cumulativeDelta(splits, previous?.splits)
  const previousSplit = index === undefined ? undefined : previous?.splits[index]

  function discard() {
    if (window.confirm('Simulation abbrechen? Die Zeiten werden nicht gespeichert.')) onDiscard()
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold tracking-wide uppercase">HYROX-Simulation</p>
          <p className="truncate text-xs text-fg-muted">
            {SIMULATION_FORMAT_LABELS[meta.format]} · {DIVISION_LABELS[meta.division]}
          </p>
        </div>
        <Button variant="ghost" className="min-h-10 px-3 text-sm" onClick={discard}>
          Abbrechen
        </Button>
      </header>

      {!started ? (
        <>
          <Card className="flex flex-col gap-2 text-sm">
            <p className="font-semibold">Bereit?</p>
            <p className="text-fg-muted">
              Tippe auf „Start", sobald du losläufst. Nach jedem Lauf und jeder Station tippst du
              auf „Abschnitt fertig" – die Roxzone zählt zum Lauf.
            </p>
            {previous && (
              <p className="text-fg-muted">
                Deine letzte Simulation in diesem Format:{' '}
                <strong className="text-fg">{formatDurationClock(previous.totalSec)}</strong>
              </p>
            )}
          </Card>
          <ol className="flex flex-col gap-1 text-sm">
            {segments.map((segment, i) => (
              <li key={i} className="flex justify-between gap-3 rounded-lg bg-surface px-3 py-2">
                <span className={segment.kind === 'station' ? 'font-semibold' : undefined}>
                  {segment.label}
                </span>
                <span className="text-fg-muted">{describeSegment(segment)}</span>
              </li>
            ))}
          </ol>
          <Button
            fullWidth
            className="mt-auto min-h-24 text-2xl"
            onClick={() => {
              vibrate(80)
              apply((s, time) => startRace(s, time))
            }}
          >
            Start
          </Button>
        </>
      ) : (
        <>
          <div className="text-center">
            <p className="font-display text-7xl font-bold tabular-nums">
              {formatDurationClock(raceElapsed(session, now))}
            </p>
            {behind !== undefined && (
              <p className={cn('text-sm font-semibold', deltaTone(behind))}>
                {formatDelta(behind)} zur letzten Simulation
              </p>
            )}
          </div>

          {current && index !== undefined && (
            <Card className="flex flex-col gap-1 border-accent/40">
              <p className="text-xs text-fg-muted">
                Abschnitt {index + 1} von {segments.length}
              </p>
              <p className="font-display text-4xl font-bold uppercase">{current.label}</p>
              <p className="text-fg-muted">{describeSegment(current)}</p>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <span className="font-display text-4xl font-bold tabular-nums text-accent">
                  {formatDurationClock(segmentElapsed(session, now))}
                </span>
                {previousSplit !== undefined && (
                  <span className="text-sm text-fg-muted">
                    Letztes Mal {formatDurationClock(previousSplit)}
                  </span>
                )}
              </div>
            </Card>
          )}
          {upcoming && (
            <p className="text-sm text-fg-muted">
              Danach: <span className="text-fg">{upcoming.label}</span>
              {describeSegment(upcoming) && ` · ${describeSegment(upcoming)}`}
            </p>
          )}

          <Button
            fullWidth
            className="min-h-24 text-2xl"
            onClick={() => {
              vibrate(80)
              apply((s, time) => recordSplit(s, time))
            }}
          >
            {index === segments.length - 1 ? 'Ziel!' : 'Abschnitt fertig'}
          </Button>

          <div className="flex flex-wrap justify-between gap-2">
            <Button
              variant="ghost"
              className="min-h-11 px-3 text-sm"
              disabled={splits.length === 0}
              onClick={() => apply((s) => undoSplit(s))}
            >
              Letzten Tipp zurücknehmen
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 px-3 text-sm"
              onClick={() => {
                if (
                  window.confirm(
                    'Simulation hier beenden? Geschaffte Abschnitte werden gespeichert.',
                  )
                ) {
                  apply((s, time) => finishSession(s, time))
                }
              }}
            >
              Vorzeitig beenden
            </Button>
          </div>

          {splits.length > 0 && (
            <Card className="p-0">
              <ol className="divide-y divide-line">
                {splits
                  .map((sec, i) => ({ sec, i }))
                  .reverse()
                  .map(({ sec, i }) => {
                    const delta =
                      previous?.splits[i] === undefined ? undefined : sec - previous.splits[i]
                    return (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                      >
                        <span>{segments[i]?.label}</span>
                        <span className="flex items-baseline gap-3 tabular-nums">
                          {delta !== undefined && (
                            <span className={cn('text-xs', deltaTone(delta))}>
                              {formatDelta(delta)}
                            </span>
                          )}
                          <span className="font-semibold">{formatDurationClock(sec)}</span>
                        </span>
                      </li>
                    )
                  })}
              </ol>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
