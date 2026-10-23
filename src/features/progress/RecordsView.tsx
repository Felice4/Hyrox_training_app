import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { useProfileDetails } from '@/features/profile/useProfile'
import { describeRecord } from '@/features/training/format'
import { formatDurationClock } from '@/lib/time'
import { GROUPS, groupOf, type Group } from './exerciseGroups'

const shortDate = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
  year: '2-digit',
})

/** Alle Bestleistungen – aus Trainings und manuell eingetragene – nach Bereich. */
export function RecordsView() {
  const details = useProfileDetails()
  const { catalog } = useExerciseCatalog()

  if (details.isPending || catalog.isPending) {
    return (
      <div role="status" className="flex justify-center py-12">
        <Spinner className="text-accent" />
      </div>
    )
  }
  if (details.isError || catalog.isError) {
    return (
      <Card className="flex flex-col items-start gap-3 text-sm text-fg-muted">
        Die Bestleistungen konnten nicht geladen werden.
        <Button
          variant="secondary"
          onClick={() => {
            void details.refetch()
            void catalog.refetch()
          }}
        >
          Erneut versuchen
        </Button>
      </Card>
    )
  }

  const exercises = new Map(catalog.data.exercises.map((e) => [e.slug, e]))
  const hyroxTime = details.data.profile?.hyrox_best_time_sec ?? null
  const records = details.data.records.map((record) => {
    const exercise = exercises.get(record.exerciseSlug)
    return {
      ...record,
      name: exercise?.name ?? record.exerciseSlug,
      group: (exercise ? groupOf(exercise) : 'Weitere') as Group,
      ...describeRecord({
        record_type: record.recordType,
        context_key: record.contextKey,
        value: record.value,
      }),
    }
  })

  if (records.length === 0 && hyroxTime === null) {
    return (
      <Card className="text-sm text-fg-muted">
        Noch keine Bestleistungen. Sie entstehen automatisch beim Speichern deiner Trainings;
        frühere Bestwerte kannst du im Profil eintragen.
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {hyroxTime !== null && (
        <Card className="p-4">
          <p className="text-xs text-fg-muted">HYROX-Bestzeit (Wettkampf, laut Profil)</p>
          <p className="font-display text-4xl font-bold">{formatDurationClock(hyroxTime)}</p>
        </Card>
      )}
      {GROUPS.map((group) => {
        const inGroup = records
          .filter((r) => r.group === group)
          .sort((a, b) => a.name.localeCompare(b.name, 'de') || a.label.localeCompare(b.label))
        if (inGroup.length === 0) return null
        return (
          <Card key={group} className="p-4">
            <h2 className="mb-1 text-sm font-semibold tracking-wide text-fg-muted uppercase">
              {group}
            </h2>
            <ul className="divide-y divide-line">
              {inGroup.map((record) => (
                <li
                  key={`${record.exerciseSlug}-${record.recordType}-${record.contextKey}`}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{record.name}</p>
                    <p className="text-xs text-fg-muted">
                      {record.label} · {shortDate.format(new Date(record.achievedAt))}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-display text-xl font-bold">{record.value}</span>
                    {record.source === 'manual' && <Badge>manuell</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}
