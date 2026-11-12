import { useState } from 'react'
import type { CatalogExercise } from '@/api/exercises'
import { SearchIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { CATEGORY_LABELS } from '@/data/exercises/vocabulary'

const normalize = (text: string) =>
  text
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

/** Höchstens so viele Treffer anzeigen – die Suche grenzt weiter ein. */
const MAX_RESULTS = 40

/** Übung aus der Bibliothek (inkl. eigener Übungen) wählen – mit Suche, alphabetisch. */
export function ExercisePicker({
  exercises,
  onPick,
  onClose,
}: {
  exercises: readonly CatalogExercise[]
  onPick: (exercise: CatalogExercise) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const matches = exercises.filter((e) => {
    const name = normalize(e.name)
    return words.every((word) => name.includes(word))
  })
  const visible = matches.slice(0, MAX_RESULTS)

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-surface-raised p-4 shadow-raised">
      <TextField
        label="Übung hinzufügen"
        type="search"
        placeholder="Übung suchen, z. B. Wall Balls …"
        value={query}
        autoFocus
        onChange={(e) => setQuery(e.target.value)}
        trailing={
          <SearchIcon width={18} height={18} className="mr-3 text-fg-muted" aria-hidden="true" />
        }
      />
      <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
        {visible.map((exercise) => (
          <li key={exercise.slug}>
            <button
              type="button"
              onClick={() => onPick(exercise)}
              className="flex min-h-12 w-full flex-col items-start justify-center rounded-xl border border-line bg-surface px-4 py-2 text-left transition duration-200 hover:border-line-strong hover:bg-surface-high active:scale-[0.99]"
            >
              <span className="font-medium">{exercise.name}</span>
              <span className="text-xs text-fg-muted">
                {CATEGORY_LABELS[exercise.category]}
                {exercise.source === 'custom' && ' · eigene Übung'}
              </span>
            </button>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="px-1 text-sm text-fg-muted">Keine Übung mit diesem Namen gefunden.</li>
        )}
        {matches.length > MAX_RESULTS && (
          <li className="px-1 text-xs text-fg-muted">
            {matches.length - MAX_RESULTS} weitere – Suche genauer eingeben.
          </li>
        )}
      </ul>
      <Button variant="ghost" className="self-start px-2 text-sm" onClick={onClose}>
        Abbrechen
      </Button>
    </div>
  )
}
