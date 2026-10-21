import { useId, useState } from 'react'
import { parseDecimal } from '@/features/profile/draft'

const format = (value: number | undefined) =>
  value === undefined ? '' : String(Math.round(value * 100) / 100).replace('.', ',')

interface ValueInputProps {
  label: string
  /** Tatsächlich eingetragener Wert */
  value: number | undefined
  /** Vorgabe – wird angezeigt, solange nichts eingetragen ist */
  target: number | undefined
  unit: string
  step: number
  onChange: (value: number | undefined) => void
  disabled?: boolean
}

/**
 * Zahleneingabe für das Training: großes Feld mit Zahlentastatur und ±-Tasten.
 * Ohne Eingabe zeigt es die Vorgabe; ± startet bei der Vorgabe.
 */
export function ValueInput({
  label,
  value,
  target,
  unit,
  step,
  onChange,
  disabled = false,
}: ValueInputProps) {
  const id = useId()
  // Während der Eingabe zählt der getippte Text, sonst der gespeicherte Wert
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? format(value)

  const base = value ?? target ?? 0
  const bump = (delta: number) => {
    const next = Math.max(0, Math.round((base + delta) * 100) / 100)
    onChange(next)
  }
  const buttonClass =
    'grid size-14 shrink-0 place-items-center rounded-xl border border-line bg-surface-raised text-2xl font-semibold active:bg-line disabled:opacity-40'

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg-muted">
        {label}
        {target !== undefined && value !== undefined && value !== target && (
          <span className="ml-2 text-xs">(Vorgabe {format(target)})</span>
        )}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => bump(-step)}
          disabled={disabled || base <= 0}
          aria-label={`${label} um ${format(step)} verringern`}
        >
          −
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            value={text}
            placeholder={format(target)}
            onFocus={() => setDraft(format(value))}
            onBlur={() => {
              const parsed = parseDecimal(text)
              if (parsed === undefined) onChange(undefined)
              else if (!Number.isNaN(parsed)) onChange(parsed)
              setDraft(null)
            }}
            onChange={(event) => setDraft(event.target.value)}
            className="h-14 w-full rounded-xl border border-line bg-surface pr-12 text-center font-display text-3xl font-bold text-fg outline-none placeholder:text-fg-muted/70 focus:border-accent"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-fg-muted">
            {unit}
          </span>
        </div>
        <button
          type="button"
          className={buttonClass}
          onClick={() => bump(step)}
          disabled={disabled}
          aria-label={`${label} um ${format(step)} erhöhen`}
        >
          +
        </button>
      </div>
    </div>
  )
}
