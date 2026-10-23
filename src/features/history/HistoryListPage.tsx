import { Link } from 'react-router'
import type { SessionListItem } from '@/api/sessionHistory'
import { ChevronRightIcon, DumbbellIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { FOCUS_LABELS } from '@/features/generator/labels'
import { useSessionList } from './useSessionHistory'

const monthTitle = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
const dayLabel = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
})

/** Alle absolvierten Trainings, nach Monaten gruppiert. */
export function HistoryListPage() {
  const list = useSessionList()
  const sessions = list.data?.pages.flat() ?? []

  const months: { title: string; items: SessionListItem[] }[] = []
  for (const session of sessions) {
    const title = monthTitle.format(new Date(session.startedAt))
    const last = months.at(-1)
    if (last && last.title === title) last.items.push(session)
    else months.push({ title, items: [session] })
  }

  return (
    <>
      <PageHeader title="Historie" subtitle="Alle absolvierten Trainings" />
      {list.isPending ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : list.isError ? (
        <EmptyState icon={DumbbellIcon} title="Trainings konnten nicht geladen werden">
          <Button variant="secondary" className="mt-4" onClick={() => void list.refetch()}>
            Erneut versuchen
          </Button>
        </EmptyState>
      ) : sessions.length === 0 ? (
        <EmptyState icon={DumbbellIcon} title="Noch keine Trainings">
          Gespeicherte Trainings erscheinen hier mit allen Übungen und Sätzen.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-5">
          {months.map((month) => (
            <section key={month.title}>
              <h2 className="mb-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">
                {month.title} · {month.items.length}
              </h2>
              <Card className="p-0">
                <ul className="divide-y divide-line">
                  {month.items.map((session) => (
                    <li key={session.id}>
                      <SessionRow session={session} />
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
          {list.hasNextPage && (
            <Button
              variant="secondary"
              loading={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              Ältere Trainings laden
            </Button>
          )}
          {list.isFetchNextPageError && (
            <p role="alert" className="text-sm text-danger">
              Weitere Trainings konnten nicht geladen werden.
            </p>
          )}
        </div>
      )}
    </>
  )
}

function SessionRow({ session }: { session: SessionListItem }) {
  const start = new Date(session.startedAt)
  return (
    <Link
      to={`/history/${session.id}`}
      className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-raised"
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold">
          {FOCUS_LABELS[session.focus]}
          {session.status === 'partial' && <Badge>teilweise</Badge>}
        </p>
        <p className="text-xs text-fg-muted">
          {dayLabel.format(start)},{' '}
          {start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} ·{' '}
          {session.exerciseCount} Übungen
          {session.rpe !== undefined && ` · RPE ${session.rpe}`}
        </p>
        {session.notes && (
          <p className="mt-0.5 truncate text-xs text-fg-muted italic">{session.notes}</p>
        )}
      </div>
      <span className="font-display text-xl font-bold">{session.durationMin} min</span>
      <ChevronRightIcon width={18} height={18} className="shrink-0 text-fg-muted" />
    </Link>
  )
}
