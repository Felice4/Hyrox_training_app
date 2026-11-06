import { useState } from 'react'
import { SearchIcon } from '@/components/icons'
import { TextField } from '@/components/ui/TextField'
import type { ExerciseSuggestion } from '@/domain/generator'

/** Anzahl der Vorschläge, bevor „Alle ähnlichen Übungen" nötig ist. */
const SHORT_LIST = 5

const normalize = (text: string) =>
  text
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

/**
 * Austausch einer Übung: zuerst die besten Vorschläge, auf Wunsch alle ähnlichen
 * Übungen der Bibliothek (inkl. eigener) mit Suche. `suggestions` ist nach
 * Ähnlichkeit sortiert und enthält bereits alle passenden Übungen.
 */
export function SwapPicker({
  suggestions,
  onPick,
}: {
  suggestions: readonly ExerciseSuggestion[]
  onPick: (suggestion: ExerciseSuggestion) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const [query, setQuery] = useState('')

  if (suggestions.length === 0) {
    return (
      <p className="rounded-xl bg-surface-raised px-4 py-3 text-sm text-fg-muted">
        Keine passende Alternative mit deinen verfügbaren Geräten gefunden.
      </p>
    )
  }

  const words = normalize(query).split(/\s+/).filter(Boolean)
  const visible = showAll
    ? suggestions.filter((s) => {
        const name = normalize(s.exercise.name)
        return words.every((word) => name.includes(word))
      })
    : suggestions.slice(0, SHORT_LIST)
  const hiddenCount = suggestions.length - SHORT_LIST

  return (
    <div className="flex flex-col gap-2">
      {showAll ? (
        <TextField
          label={`Alle ähnlichen Übungen (${suggestions.length})`}
          type="search"
          placeholder="Übung suchen …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          trailing={
            <SearchIcon width={18} height={18} className="mr-3 text-fg-muted" aria-hidden="true" />
          }
        />
      ) : (
        <p className="text-xs font-medium text-fg-muted">Ersetzen durch:</p>
      )}
      <div className={showAll ? 'flex max-h-[60vh] flex-col gap-2 overflow-y-auto' : 'contents'}>
        {visible.map((suggestion) => (
          <button
            key={suggestion.exercise.slug}
            type="button"
            onClick={() => onPick(suggestion)}
            className="flex min-h-12 shrink-0 flex-col items-start justify-center rounded-xl bg-surface-raised px-4 py-2 text-left hover:bg-line"
          >
            <span className="font-medium">{suggestion.exercise.name}</span>
            <span className="text-xs text-fg-muted">{suggestion.reason}</span>
          </button>
        ))}
        {showAll && visible.length === 0 && (
          <p className="px-1 text-sm text-fg-muted">Keine ähnliche Übung mit diesem Namen.</p>
        )}
      </div>
      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-accent"
        >
          <SearchIcon width={18} height={18} />
          Alle ähnlichen Übungen ({suggestions.length}) durchsuchen
        </button>
      )}
    </div>
  )
}
