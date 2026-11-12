import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { PlannedWorkout } from '@/api/weekPlans'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatLongDay, formatShortDay } from '@/features/calendar/format'
import { PlanActions } from '@/features/calendar/PlanActions'
import {
  useDeletePlannedWorkout,
  useUpdatePlannedWorkout,
} from '@/features/calendar/usePlannedWorkouts'
import { moveChange, weekStartOf } from '@/features/calendar/week'
import { FOCUS_LABELS, INTENSITY_LABELS } from '@/features/generator/labels'
import { toLocalIsoDate } from '@/lib/date'
import { AppointmentForm } from './AppointmentForm'

/**
 * Detailseite eines Trainer-Termins (docs/MANUAL_ENTRY.md §3): verschieben, „Fällt aus",
 * bearbeiten, entfernen und „Als absolviert eintragen".
 */
export function TrainerAppointmentDetail({ planned }: { planned: PlannedWorkout }) {
  const navigate = useNavigate()
  const [today] = useState(() => toLocalIsoDate())
  const [editing, setEditing] = useState(false)
  const update = useUpdatePlannedWorkout()
  const remove = useDeletePlannedWorkout()

  const completed = planned.status === 'completed'
  const skipped = planned.status === 'skipped'
  const isPast = planned.date < today
  const editable = !completed && !isPast
  const canLog = planned.status === 'planned' && planned.date <= today
  const busy = update.isPending || remove.isPending

  function deletePlanned() {
    if (!window.confirm('Diesen Termin entfernen?')) return
    remove.mutate(planned.id, {
      onSuccess: () => void navigate(`/calendar?week=${weekStartOf(planned.date)}`),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          {completed ? (
            <Badge tone="accent">Erledigt</Badge>
          ) : skipped ? (
            <Badge>Ausgefallen</Badge>
          ) : isPast ? (
            <Badge>Noch nicht eingetragen</Badge>
          ) : (
            <Badge tone="accent">Geplant</Badge>
          )}
          <Badge tone="hyrox">Trainer-Termin</Badge>
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-wide uppercase">
          {planned.title ?? FOCUS_LABELS[planned.focus]}
        </h1>
        <p className="text-fg-muted">
          {formatLongDay(planned.date)}
          {planned.startTime && ` · ${planned.startTime} Uhr`}
        </p>
        <p className="text-sm text-fg-muted">
          {planned.coach && `${planned.coach} · `}
          {FOCUS_LABELS[planned.focus]} · {planned.durationMin} min ·{' '}
          {INTENSITY_LABELS[planned.intensity]}
        </p>
        {planned.originalDate && (
          <p className="text-sm text-fg-muted">
            Verschoben von {formatShortDay(planned.originalDate)}
          </p>
        )}
      </header>

      {(update.isError || remove.isError) && (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.
        </p>
      )}

      {canLog && (
        <Card className="flex flex-col gap-3 border-accent/40">
          <p className="text-sm text-fg-muted">
            Termin absolviert? Trag die Übungen und Sätze ein – Titel, Schwerpunkt und Dauer sind
            schon ausgefüllt.
          </p>
          <Link
            to={`/calendar/log/${planned.date}?type=trainer&planned=${planned.id}`}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-5 font-semibold text-on-accent shadow-glow transition duration-200 hover:bg-accent-strong active:scale-[0.97]"
          >
            Als absolviert eintragen
          </Link>
        </Card>
      )}

      {completed && (
        <Card className="flex flex-col gap-3 text-sm text-fg-muted">
          Diesen Termin hast du absolviert und eingetragen.
          {planned.completedSessionId && (
            <Link
              to={`/history/${planned.completedSessionId}`}
              className="inline-flex min-h-11 items-center font-medium text-accent"
            >
              Eingetragenes Training ansehen →
            </Link>
          )}
        </Card>
      )}

      {editable && !editing && (
        <>
          <PlanActions
            planned={planned}
            today={today}
            busy={busy}
            onMove={(date) => update.mutate({ id: planned.id, change: moveChange(planned, date) })}
            onToggleSkipped={() =>
              update.mutate({
                id: planned.id,
                change: { status: skipped ? 'planned' : 'skipped' },
              })
            }
            onDelete={deletePlanned}
          />
          <Button variant="secondary" disabled={busy} onClick={() => setEditing(true)}>
            Termin bearbeiten
          </Button>
        </>
      )}

      {editable && editing && (
        <AppointmentForm
          initial={{
            date: planned.date,
            startTime: planned.startTime ?? '18:00',
            title: planned.title ?? '',
            coach: planned.coach,
            focus: planned.focus,
            intensity: planned.intensity,
            durationMin: planned.durationMin,
          }}
          today={today}
          saving={update.isPending}
          saveLabel="Änderungen speichern"
          onCancel={() => setEditing(false)}
          onSave={(input) =>
            update.mutate(
              {
                id: planned.id,
                change: {
                  title: input.title,
                  coach: input.coach,
                  startTime: input.startTime,
                  focus: input.focus,
                  intensity: input.intensity,
                  durationMin: input.durationMin,
                },
              },
              { onSuccess: () => setEditing(false) },
            )
          }
        />
      )}

      {isPast && !completed && (
        <Card className="flex flex-col gap-3 text-sm text-fg-muted">
          Dieser Termin liegt in der Vergangenheit.
          <Button variant="ghost" className="self-start" disabled={busy} onClick={deletePlanned}>
            Termin entfernen
          </Button>
        </Card>
      )}
    </div>
  )
}
