import { Link } from 'react-router'
import { FlagIcon } from '@/components/icons'
import { PHASE_LABELS, raceTimeline, raceWeekOf } from '@/domain/race/phases'
import { useActiveRace } from './useRace'

/** Phase der Woche über der Wochenansicht (docs/RACE_PREP.md §7). */
export function RaceWeekBanner({ weekStart }: { weekStart: string }) {
  const race = useActiveRace().data
  if (!race) return null
  const week = raceWeekOf(raceTimeline(race), weekStart)
  if (!week) return null
  return (
    <Link
      to="/race"
      className="flex items-center justify-center gap-2 rounded-xl border border-hyrox/30 bg-hyrox/10 px-4 py-2 text-sm transition hover:bg-hyrox/15"
    >
      <FlagIcon width={16} height={16} className="text-hyrox" />
      <span>
        <span className="font-semibold">{PHASE_LABELS[week.phase]}</span>
        {week.number !== null && (
          <span className="text-fg-muted">
            {' '}
            · Woche {week.number} von {week.total}
          </span>
        )}
      </span>
    </Link>
  )
}

/** Hinweis am Wettkampftag. */
export function RaceDayNote({ date }: { date: string }) {
  const race = useActiveRace().data
  if (!race || race.raceDate !== date) return null
  return (
    <Link
      to="/race"
      className="flex items-center gap-2 rounded-xl bg-hyrox/10 px-3 py-2 text-sm font-semibold text-hyrox ring-1 ring-hyrox/25"
    >
      <FlagIcon width={16} height={16} />
      Wettkampf: {race.name}
    </Link>
  )
}
