import { useState } from 'react'
import { Link } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import { SearchIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { TextField } from '@/components/ui/TextField'
import {
  DIFFICULTY_LABELS,
  MOVEMENT_GROUPS,
  MOVEMENT_GROUP_LABELS,
  type MovementGroup,
} from '@/data/exercises/vocabulary'
import { isMovementExercise, matchesSearch } from '@/domain/movement/library'
import { hasMovementVideo } from './videos'

/**
 * Übung aus dem Movement Lab wählen: nach Gruppe filtern und suchen. Schon gewählte sind
 * markiert. Wird in der Mobility-Einheit und für Warm-up/Cool-down verwendet.
 */
export function MovementPicker({
  exercises,
  selected,
  label = 'Übung hinzufügen',
  onPick,
  onClose,
}: {
  exercises: readonly CatalogExercise[]
  selected: readonly string[]
  label?: string
  onPick: (exercise: CatalogExercise) => void
  onClose: () => void
}) {
  const [group, setGroup] = useState<MovementGroup | 'all'>('all')
  const [query, setQuery] = useState('')
  const movement = exercises.filter(isMovementExercise)
  const usedGroups = MOVEMENT_GROUPS.filter((g) =>
    movement.some((e) => e.movementGroups.includes(g)),
  )
  const matches = movement
    .filter((e) => (group === 'all' || e.movementGroups.includes(group)) && matchesSearch(e, query))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-surface-raised p-4 shadow-raised">
      {movement.length === 0 ? (
        <p className="text-sm text-fg-muted">
          Im{' '}
          <Link to="/movement" className="font-medium text-accent">
            Movement Lab
          </Link>{' '}
          sind noch keine Übungen. Sie kommen nach und nach dazu.
        </p>
      ) : (
        <>
          <TextField
            label={label}
            type="search"
            placeholder="Übung suchen, z. B. Hüfte, Shrimp …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            trailing={
              <SearchIcon
                width={18}
                height={18}
                className="mr-3 text-fg-muted"
                aria-hidden="true"
              />
            }
          />
          {usedGroups.length > 1 && (
            <div
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
              role="group"
              aria-label="Gruppe"
            >
              <Chip selected={group === 'all'} onClick={() => setGroup('all')}>
                Alle
              </Chip>
              {usedGroups.map((g) => (
                <Chip key={g} selected={group === g} onClick={() => setGroup(g)}>
                  {MOVEMENT_GROUP_LABELS[g]}
                </Chip>
              ))}
            </div>
          )}
          <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
            {matches.map((exercise) => {
              const added = selected.includes(exercise.slug)
              return (
                <li key={exercise.slug}>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => onPick(exercise)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2 text-left transition duration-200 hover:border-line-strong hover:bg-surface-high active:scale-[0.99] disabled:opacity-60"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">
                        {exercise.name}
                        {hasMovementVideo(exercise.slug) && (
                          <span className="ml-1.5" aria-label="mit Video">
                            🎥
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-fg-muted">
                        {exercise.movementGroups.map((g) => MOVEMENT_GROUP_LABELS[g]).join(' · ')} ·{' '}
                        {DIFFICULTY_LABELS[exercise.difficulty]}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-accent">
                      {added ? '✓' : '+'}
                    </span>
                  </button>
                </li>
              )
            })}
            {matches.length === 0 && (
              <li className="px-1 text-sm text-fg-muted">Keine Übung gefunden.</li>
            )}
          </ul>
        </>
      )}
      <Button variant="ghost" className="self-start px-2 text-sm" onClick={onClose}>
        Fertig
      </Button>
    </div>
  )
}
