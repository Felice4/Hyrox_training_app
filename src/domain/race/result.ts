import type { Division } from '@/domain/simulation/formats'
import { simulationStats, type SimulationStats } from '@/domain/simulation/simulation'
import type { Race } from './race'

/**
 * Auswertung des Wettkampf-Ergebnisses (docs/RACE_PREP.md §7): Vergleich mit der
 * Zielzeit und – mit Zwischenzeiten – Laufen vs. Stationen wie bei der Simulation.
 */
export interface RaceResultSummary {
  timeSec: number
  /** Positiv = langsamer als die Zielzeit */
  targetDeltaSec: number | undefined
  stats: SimulationStats | undefined
}

export function raceResultSummary(
  race: Pick<Race, 'resultTimeSec' | 'resultSplits' | 'targetTimeSec' | 'raceDate'>,
  division: Division,
): RaceResultSummary | undefined {
  if (race.resultTimeSec === null) return undefined
  const splits = race.resultSplits ?? []
  return {
    timeSec: race.resultTimeSec,
    targetDeltaSec:
      race.targetTimeSec === null ? undefined : race.resultTimeSec - race.targetTimeSec,
    stats:
      splits.length === 16
        ? simulationStats({
            sessionId: '',
            format: 'full',
            division,
            startedAt: `${race.raceDate}T00:00:00.000Z`,
            totalSec: race.resultTimeSec,
            splits,
          })
        : undefined,
  }
}
