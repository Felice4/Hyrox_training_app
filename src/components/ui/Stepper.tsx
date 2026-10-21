import { useId } from 'react'

interface StepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
}

/** Zahlenwert mit großen Plus/Minus-Tasten – gut mit dem Daumen bedienbar. */
export function Stepper({ label, value, onChange, min, max, step = 1, unit }: StepperProps) {
  const id = useId()
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)))
  const buttonClass =
    'grid size-12 place-items-center rounded-xl border border-line bg-surface-raised text-2xl font-semibold transition-colors hover:bg-line disabled:opacity-40'

  return (
    <div className="flex flex-col gap-2">
      <span id={id} className="text-sm font-medium text-fg-muted">
        {label}
      </span>
      <div className="flex items-center gap-3" role="group" aria-labelledby={id}>
        <button
          type="button"
          className={buttonClass}
          onClick={() => set(value - step)}
          disabled={value <= min}
          aria-label={`${label} verringern`}
        >
          −
        </button>
        <output className="min-w-24 text-center font-display text-3xl font-bold" aria-live="polite">
          {value}
          {unit && <span className="ml-1 text-base font-medium text-fg-muted">{unit}</span>}
        </output>
        <button
          type="button"
          className={buttonClass}
          onClick={() => set(value + step)}
          disabled={value >= max}
          aria-label={`${label} erhöhen`}
        >
          +
        </button>
      </div>
    </div>
  )
}
