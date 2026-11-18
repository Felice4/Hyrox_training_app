import { Link } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import { ChevronRightIcon } from '@/components/icons'
import { DIFFICULTY_LABELS } from '@/data/exercises/vocabulary'
import { movementDosage } from './format'
import { hasMovementVideo } from './videos'

/** Eintrag in Listen des Movement Lab: Name, Kurzdosierung, Stufe, Video-Hinweis. */
export function MovementListItem({
  exercise,
  backTo,
}: {
  exercise: CatalogExercise
  backTo: string
}) {
  return (
    <Link
      to={`/movement/exercise/${exercise.slug}`}
      state={{ backTo }}
      className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-raised"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {exercise.name}
          {hasMovementVideo(exercise.slug) && (
            <span className="ml-1.5" aria-label="mit Video">
              🎥
            </span>
          )}
        </p>
        <p className="truncate text-sm text-fg-muted">
          {movementDosage(exercise.loadParams)} · {DIFFICULTY_LABELS[exercise.difficulty]}
        </p>
      </div>
      <ChevronRightIcon width={20} height={20} className="shrink-0 text-fg-muted" />
    </Link>
  )
}
