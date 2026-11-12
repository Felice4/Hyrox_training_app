import { useState } from 'react'
import type { PlannedWorkout } from '@/api/weekPlans'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatShortDay } from './format'
import { moveTargets } from './week'

/** Verschieben (dieselbe Woche), „Fällt aus" / „Wieder einplanen", Entfernen. */
export function PlanActions({
  planned,
  today,
  busy,
  onMove,
  onToggleSkipped,
  onDelete,
}: {
  planned: PlannedWorkout
  today: string
  busy: boolean
  onMove: (date: string) => void
  onToggleSkipped: () => void
  onDelete: () => void
}) {
  const [moving, setMoving] = useState(false)
  const skipped = planned.status === 'skipped'
  const targets = moveTargets(planned, today)

  return (
    <Card className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {!skipped && (
          <Button
            variant="secondary"
            disabled={busy || targets.length === 0}
            aria-expanded={moving}
            onClick={() => setMoving((v) => !v)}
          >
            Verschieben
          </Button>
        )}
        <Button variant="secondary" disabled={busy} onClick={onToggleSkipped}>
          {skipped ? 'Wieder einplanen' : 'Fällt aus'}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onDelete}>
          Entfernen
        </Button>
      </div>
      {moving && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-fg-muted">Verschieben auf (diese Woche):</p>
          <div className="flex flex-wrap gap-2">
            {targets.map((date) => (
              <Button
                key={date}
                variant="secondary"
                className="min-h-11 px-3 text-sm"
                disabled={busy}
                onClick={() => {
                  setMoving(false)
                  onMove(date)
                }}
              >
                {date === today ? 'Heute' : formatShortDay(date)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
