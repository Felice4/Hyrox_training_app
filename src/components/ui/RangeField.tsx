import { useId } from 'react'

interface RangeFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  /** Zusatzinfo rechts neben dem Wert, z. B. Anteil in Prozent. */
  detail?: string
}

/** Schieberegler mit großem Wert-Label. */
export function RangeField({ label, value, onChange, min, max, step, detail }: RangeFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <span className="text-sm text-fg-muted">
          <span className="font-display text-2xl font-bold text-fg">{value}</span>
          {detail && <span className="ml-2">{detail}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-10 w-full cursor-pointer accent-accent"
      />
    </div>
  )
}
