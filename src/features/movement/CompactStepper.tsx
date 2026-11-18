/** Kleiner Zahlenwert mit ± – für mehrere Werte je Übung auf dem Handy. */
export function CompactStepper({
  label,
  value,
  min,
  max,
  step = 1,
  format = String,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (value: number) => string
  onChange: (value: number) => void
}) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)))
  const button =
    'grid size-10 place-items-center rounded-lg border border-line-strong bg-surface-raised text-lg font-semibold transition hover:bg-surface-high active:scale-95 disabled:opacity-40'
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-fg-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={button}
          disabled={value <= min}
          onClick={() => set(value - step)}
          aria-label={`${label} verringern`}
        >
          −
        </button>
        <output className="min-w-14 flex-1 text-center font-semibold" aria-live="polite">
          {format(value)}
        </output>
        <button
          type="button"
          className={button}
          disabled={value >= max}
          onClick={() => set(value + step)}
          aria-label={`${label} erhöhen`}
        >
          +
        </button>
      </div>
    </div>
  )
}
