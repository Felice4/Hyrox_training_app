import { Link } from 'react-router'
import { FlagIcon } from '@/components/icons'
import { PHASE_LABELS, raceTimeline, raceWeekOf } from '@/domain/race/phases'
import { useActiveRace } from './useRace'

/**
 * Hinweis im freien Generator: Im Wettkampfmodus plant der Kalender die Einheiten der
 * Phase (docs/RACE_PREP.md §4) – hier entsteht ein zusätzliches, freies Workout.
 */
export function RaceGeneratorHint({ today }: { today: string }) {
  const race = useActiveRace().data
  const week = race ? raceWeekOf(raceTimeline(race), today) : undefined
  if (!race || !week) return null
  return (
    <Link
      to="/calendar"
      className="mb-4 flex min-h-14 items-center gap-3 rounded-xl border border-hyrox/30 bg-hyrox/10 px-4 py-3 text-sm"
    >
      <FlagIcon width={20} height={20} className="shrink-0 text-hyrox" />
      <span className="flex-1">
        <span className="block font-semibold">Wettkampfmodus · {PHASE_LABELS[week.phase]}</span>
        <span className="block text-fg-muted">
          Deine Einheiten für {race.name} plant der Kalender passend zur Phase. Hier erstellst du
          ein zusätzliches, freies Workout.
        </span>
      </span>
      <span aria-hidden="true">→</span>
    </Link>
  )
}
