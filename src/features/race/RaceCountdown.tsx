import { Link } from 'react-router'
import { ChevronRightIcon, FlagIcon } from '@/components/icons'
import { daysUntil } from '@/domain/race/phases'
import type { Race } from '@/domain/race/race'
import { variantLabel } from '@/domain/race/variant'
import { formatLongDay } from '@/features/calendar/format'
import { countdownLabel, phaseLine } from './format'

/** Countdown-Karte für das Dashboard (docs/RACE_PREP.md §7). */
export function RaceCountdownCard({ race, today }: { race: Race; today: string }) {
  const phase = phaseLine(race, today)
  return (
    <Link
      to="/race"
      className="flex items-center gap-4 rounded-2xl border border-hyrox/30 bg-hyrox/10 p-4 shadow-card transition hover:bg-hyrox/15"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-hyrox/15 text-hyrox ring-1 ring-hyrox/25">
        <FlagIcon width={24} height={24} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-fg-muted">
          {race.name} · {formatLongDay(race.raceDate)}
        </p>
        <p className="font-display text-2xl leading-tight font-bold uppercase">
          {countdownLabel(daysUntil(race.raceDate, today))}
        </p>
        <p className="truncate text-xs text-fg-muted">{phase ?? variantLabel(race)}</p>
      </div>
      <ChevronRightIcon className="shrink-0 text-fg-muted" />
    </Link>
  )
}
