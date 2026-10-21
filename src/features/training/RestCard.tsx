import { Button } from '@/components/ui/Button'
import { extendRest, skipRest } from '@/domain/session/session'
import { formatDurationClock } from '@/lib/time'
import type { SessionAction } from './useActiveSession'

interface RestCardProps {
  remaining: number
  total: number
  apply: (action: SessionAction) => void
}

/** Großer Pausen-Countdown mit Anpassung. */
export function RestCard({ remaining, total, apply }: RestCardProps) {
  const progress = total > 0 ? Math.min(100, ((total - remaining) / total) * 100) : 100
  return (
    <section
      aria-label="Satzpause"
      className="flex flex-col items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-5"
    >
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">Pause</p>
      <p className="font-display text-7xl font-bold tabular-nums">
        {formatDurationClock(remaining)}
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="grid w-full grid-cols-3 gap-2">
        <Button variant="secondary" onClick={() => apply((s) => extendRest(s, -15))}>
          −15 s
        </Button>
        <Button variant="secondary" onClick={() => apply((s) => extendRest(s, 15))}>
          +15 s
        </Button>
        <Button onClick={() => apply((s) => skipRest(s))}>Weiter</Button>
      </div>
    </section>
  )
}
