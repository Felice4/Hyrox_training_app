import { useState, type ReactNode } from 'react'
import { SearchIcon } from '@/components/icons'
import { TextField } from '@/components/ui/TextField'
import type { ExerciseSuggestion } from '@/domain/generator'

/** Anzahl der Vorschläge, bevor die Suche nötig ist. */
const SHORT_LIST = 5

type Mode = 'short' | 'similar' | 'all'

const normalize = (text: string) =>
  text
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

/**
 * Austausch einer Übung: zuerst die besten Vorschläge, auf Wunsch alle ähnlichen Übungen
 * oder alle Übungen der Bibliothek (inkl. eigener) mit Suche. `suggestions` stammt aus
 * `suggestAlternatives({ scope: 'all' })`: ähnliche zuerst (`related`), dann alle übrigen.
 */
export function SwapPicker({
  suggestions,
  onPick,
}: {
  suggestions: readonly ExerciseSuggestion[]
  onPick: (suggestion: ExerciseSuggestion) => void
}) {
  const related = suggestions.filter((s) => s.related)
  const [mode, setMode] = useState<Mode>(related.length > 0 ? 'short' : 'all')
  const [query, setQuery] = useState('')

  if (suggestions.length === 0) {
    return (
      <p className="rounded-xl bg-surface-raised px-4 py-3 text-sm text-fg-muted">
        Keine andere Übung mit deinen verfügbaren Geräten gefunden.
      </p>
    )
  }

  const words = normalize(query).split(/\s+/).filter(Boolean)
  const matches = (s: ExerciseSuggestion) => {
    const text = normalize(`${s.exercise.name} ${s.reason}`)
    return words.every((word) => text.includes(word))
  }
  const visible =
    mode === 'short'
      ? related.slice(0, SHORT_LIST)
      : (mode === 'similar' ? related : suggestions).filter(matches)

  return (
    <div className="flex flex-col gap-2">
      {mode === 'short' ? (
        <p className="text-xs font-medium text-fg-muted">Ersetzen durch:</p>
      ) : (
        <>
          <div
            role="group"
            aria-label="Auswahl"
            className="grid grid-cols-2 gap-1 rounded-xl bg-surface-raised p-1"
          >
            <ModeButton
              active={mode === 'similar'}
              disabled={related.length === 0}
              onClick={() => setMode('similar')}
            >
              Ähnliche ({related.length})
            </ModeButton>
            <ModeButton active={mode === 'all'} onClick={() => setMode('all')}>
              Alle Übungen ({suggestions.length})
            </ModeButton>
          </div>
          <TextField
            label={mode === 'all' ? 'Alle Übungen der Bibliothek' : 'Alle ähnlichen Übungen'}
            type="search"
            placeholder="Übung oder Kategorie suchen …"
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
        </>
      )}
      <div
        className={
          mode === 'short' ? 'contents' : 'flex max-h-[60vh] flex-col gap-2 overflow-y-auto'
        }
      >
        {visible.map((suggestion) => (
          <button
            key={suggestion.exercise.slug}
            type="button"
            onClick={() => onPick(suggestion)}
            className="flex min-h-12 shrink-0 flex-col items-start justify-center rounded-xl border border-line bg-surface-raised px-4 py-2 text-left transition duration-200 hover:border-line-strong hover:bg-surface-high active:scale-[0.99]"
          >
            <span className="font-medium">{suggestion.exercise.name}</span>
            <span className="text-xs text-fg-muted">{suggestion.reason}</span>
          </button>
        ))}
        {mode !== 'short' && visible.length === 0 && (
          <p className="px-1 text-sm text-fg-muted">Keine Übung mit diesem Namen.</p>
        )}
      </div>
      {mode === 'short' && (
        <div className="flex flex-col items-start">
          {related.length > SHORT_LIST && (
            <SearchLink onClick={() => setMode('similar')}>
              Alle ähnlichen Übungen ({related.length}) durchsuchen
            </SearchLink>
          )}
          <SearchLink onClick={() => setMode('all')}>
            Alle Übungen der Bibliothek ({suggestions.length}) durchsuchen
          </SearchLink>
        </div>
      )}
    </div>
  )
}

function SearchLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent"
    >
      <SearchIcon width={18} height={18} />
      {children}
    </button>
  )
}

function ModeButton({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-10 rounded-lg px-3 text-sm font-medium transition disabled:opacity-40 ${
        active ? 'bg-surface-high text-fg shadow-card' : 'text-fg-muted hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}
