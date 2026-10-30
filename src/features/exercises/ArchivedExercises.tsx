import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useArchivedCustomExercises, useSetArchived } from './useExerciseActions'

/** Archivierte eigene Übungen – lassen sich wiederherstellen. */
export function ArchivedExercises() {
  const archived = useArchivedCustomExercises()
  const restore = useSetArchived()
  if (!archived.data || archived.data.length === 0) return null
  return (
    <Card className="mt-6 p-4">
      <h2 className="mb-1 font-semibold">Archivierte eigene Übungen</h2>
      <p className="mb-2 text-xs text-fg-muted">
        Werden nicht mehr eingeplant. Gespeicherte Trainings mit diesen Übungen bleiben erhalten.
      </p>
      <ul className="divide-y divide-line">
        {archived.data.map((exercise) => (
          <li key={exercise.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 truncate">{exercise.name}</span>
            <Button
              variant="secondary"
              className="min-h-10 shrink-0 px-3 text-sm"
              disabled={restore.isPending}
              onClick={() => restore.mutate({ id: exercise.id, archived: false })}
            >
              Wiederherstellen
            </Button>
          </li>
        ))}
      </ul>
      {restore.isError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          Wiederherstellen fehlgeschlagen. Bitte versuche es erneut.
        </p>
      )}
    </Card>
  )
}
