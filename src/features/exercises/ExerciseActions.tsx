import { Link, useNavigate } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { PREFERENCES, PREFERENCE_LABELS } from '@/data/exercises/vocabulary'
import { useSetArchived, useSetPreference } from './useExerciseActions'

const PREFERENCE_HINTS = {
  neutral: 'Der Generator wählt die Übung ganz normal.',
  preferred: 'Wird im Generator bevorzugt.',
  disliked: 'Wird nur gewählt, wenn es keine gute Alternative gibt.',
  hidden: 'Wird nie automatisch eingeplant, bleibt aber in der Bibliothek und im Verlauf.',
} as const

const LINK_BUTTON =
  'inline-flex min-h-12 items-center rounded-xl border border-line bg-surface-raised px-5 font-semibold hover:bg-line'

/** Persönliche Einstellung und Verwaltung einer Übung (Detailseite). */
export function ExerciseActions({ exercise }: { exercise: CatalogExercise }) {
  const navigate = useNavigate()
  const preference = useSetPreference()
  const archive = useSetArchived()
  const isCustom = exercise.source === 'custom'

  function archiveExercise() {
    const confirmed = window.confirm(
      `„${exercise.name}“ archivieren? Sie wird nicht mehr eingeplant; gespeicherte Trainings bleiben unverändert. Du kannst sie in der Übungsliste wiederherstellen.`,
    )
    if (!confirmed) return
    archive.mutate(
      { id: exercise.id, archived: true },
      { onSuccess: () => void navigate('/exercises', { replace: true }) },
    )
  }

  return (
    <Card className="flex flex-col gap-4">
      <SingleChoiceChips
        label="Im Trainingsgenerator"
        hint={PREFERENCE_HINTS[exercise.preference]}
        options={PREFERENCES.map((value) => ({ value, label: PREFERENCE_LABELS[value] }))}
        value={exercise.preference}
        onChange={(value) => {
          if (value !== exercise.preference && !preference.isPending) {
            preference.mutate({ id: exercise.id, preference: value })
          }
        }}
      />
      {preference.isError && (
        <p role="alert" className="text-sm text-danger">
          Konnte nicht gespeichert werden. Bitte versuche es erneut.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {isCustom ? (
          <>
            <Link to={`/exercises/${exercise.slug}/edit`} className={LINK_BUTTON}>
              Bearbeiten
            </Link>
            <Button variant="ghost" loading={archive.isPending} onClick={archiveExercise}>
              Archivieren
            </Button>
          </>
        ) : (
          <Link to={`/exercises/new?from=${exercise.slug}`} className={LINK_BUTTON}>
            Als eigene Übung kopieren
          </Link>
        )}
      </div>
      {!isCustom && (
        <p className="text-xs text-fg-muted">
          Bibliotheksübungen werden mit App-Updates gepflegt und sind deshalb nicht direkt
          bearbeitbar. Eine Kopie kannst du frei anpassen.
        </p>
      )}
      {archive.isError && (
        <p role="alert" className="text-sm text-danger">
          Archivieren fehlgeschlagen. Bitte versuche es erneut.
        </p>
      )}
    </Card>
  )
}
