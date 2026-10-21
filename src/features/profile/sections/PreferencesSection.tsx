import { useState } from 'react'
import { SearchIcon } from '@/components/icons'
import { FieldError } from '@/components/ui/FieldError'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import { EMPTY_FILTER, filterExercises } from '@/features/exercises/filter'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { cn } from '@/lib/cn'
import type { SectionProps } from './types'

const MAX_RESULTS = 8

type Choice = 'preferred' | 'disliked'

export function PreferencesSection({ draft, errors, update }: SectionProps) {
  const [query, setQuery] = useState('')
  const { catalog } = useExerciseCatalog()
  const exercises = catalog.data?.exercises ?? []
  const nameOf = (slug: string) => exercises.find((e) => e.slug === slug)?.name ?? slug

  const results =
    query.trim().length >= 2
      ? filterExercises(exercises, { ...EMPTY_FILTER, query }).slice(0, MAX_RESULTS)
      : []

  /** Setzt eine Übung auf bevorzugt/unbeliebt bzw. hebt die Auswahl wieder auf. */
  const toggle = (slug: string, choice: Choice) => {
    const preferred = draft.preferredExercises.filter((s) => s !== slug)
    const disliked = draft.dislikedExercises.filter((s) => s !== slug)
    const current = draft.preferredExercises.includes(slug)
      ? 'preferred'
      : draft.dislikedExercises.includes(slug)
        ? 'disliked'
        : null
    if (current !== choice) (choice === 'preferred' ? preferred : disliked).push(slug)
    update({ preferredExercises: preferred, dislikedExercises: disliked })
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-fg-muted">
        Bevorzugte Übungen plant der Generator häufiger ein, unbeliebte seltener. Alles optional –
        du kannst das später jederzeit im Profil ändern.
      </p>

      <TextField
        label="Übung suchen"
        type="search"
        placeholder="z. B. Wall Balls, Kreuzheben"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        trailing={<SearchIcon className="mr-3 text-fg-muted" width={20} height={20} />}
      />

      {catalog.isPending && query.trim().length >= 2 && (
        <div className="flex justify-center py-4">
          <Spinner className="text-accent" />
        </div>
      )}

      {results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((exercise) => (
            <li
              key={exercise.slug}
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate">{exercise.name}</span>
              <ChoiceButton
                active={draft.preferredExercises.includes(exercise.slug)}
                tone="accent"
                onClick={() => toggle(exercise.slug, 'preferred')}
              >
                Mag ich
              </ChoiceButton>
              <ChoiceButton
                active={draft.dislikedExercises.includes(exercise.slug)}
                tone="danger"
                onClick={() => toggle(exercise.slug, 'disliked')}
              >
                Lieber nicht
              </ChoiceButton>
            </li>
          ))}
        </ul>
      )}

      <SelectedList
        title="Bevorzugt"
        slugs={draft.preferredExercises}
        nameOf={nameOf}
        onRemove={(slug) => toggle(slug, 'preferred')}
      />
      <SelectedList
        title="Unbeliebt"
        slugs={draft.dislikedExercises}
        nameOf={nameOf}
        onRemove={(slug) => toggle(slug, 'disliked')}
      />
      <FieldError message={errors.dislikedExercises ?? errors.preferredExercises} />
    </div>
  )
}

function ChoiceButton({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean
  tone: 'accent' | 'danger'
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-10 shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors',
        !active && 'border-line text-fg-muted hover:text-fg',
        active && tone === 'accent' && 'border-accent bg-accent text-on-accent',
        active && tone === 'danger' && 'border-danger bg-danger/15 text-danger',
      )}
    >
      {children}
    </button>
  )
}

function SelectedList({
  title,
  slugs,
  nameOf,
  onRemove,
}: {
  title: string
  slugs: string[]
  nameOf: (slug: string) => string
  onRemove: (slug: string) => void
}) {
  if (slugs.length === 0) return null
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-fg-muted">
        {title} ({slugs.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {slugs.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => onRemove(slug)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-raised px-4 text-sm hover:bg-line"
            aria-label={`${nameOf(slug)} entfernen`}
          >
            {nameOf(slug)}
            <span aria-hidden="true" className="text-fg-muted">
              ✕
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
