import { useId, useState } from 'react'
import { formatDurationClock, parseDuration } from '@/lib/time'

interface DurationInputProps {
  label: string
  value: number | undefined
  target: number | undefined
  onChange: (seconds: number | undefined) => void
  disabled?: boolean
}

const STEP = 15

/** Zeiteingabe als m:ss (bzw. h:mm:ss) mit ±15 s. */
export function DurationInput({
  label,
  value,
  target,
  onChange,
  disabled = false,
}: DurationInputProps) {
  const id = useId()
  const format = (seconds: number | undefined) =>
    seconds === undefined ? '' : formatDurationClock(seconds)
  // Während der Eingabe zählt der getippte Text, sonst der gespeicherte Wert
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const text = draft ?? format(value)

  const base = value ?? target ?? 0
  const buttonClass =
    'grid size-14 shrink-0 place-items-center rounded-xl border border-line bg-surface-raised text-lg font-semibold active:bg-line disabled:opacity-40'

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg-muted">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => onChange(Math.max(0, base - STEP))}
          disabled={disabled || base <= 0}
          aria-label={`${label} um 15 Sekunden verringern`}
        >
          −15
        </button>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={text}
          placeholder={format(target) || 'm:ss'}
          aria-invalid={invalid || undefined}
          onFocus={() => setDraft(format(value))}
          onBlur={() => {
            if (text.trim() === '') {
              setInvalid(false)
              onChange(undefined)
              setDraft(null)
              return
            }
            const parsed = parseDuration(text)
            setInvalid(parsed === null)
            if (parsed !== null) {
              onChange(parsed)
              setDraft(null)
            }
          }}
          onChange={(event) => setDraft(event.target.value)}
          className="h-14 min-w-0 flex-1 rounded-xl border border-line bg-surface text-center font-display text-3xl font-bold text-fg outline-none placeholder:text-fg-muted/70 focus:border-accent aria-invalid:border-danger"
        />
        <button
          type="button"
          className={buttonClass}
          onClick={() => onChange(base + STEP)}
          disabled={disabled}
          aria-label={`${label} um 15 Sekunden erhöhen`}
        >
          +15
        </button>
      </div>
      {invalid && <p className="text-sm text-danger">Bitte als m:ss eingeben, z. B. 4:05.</p>}
    </div>
  )
}
