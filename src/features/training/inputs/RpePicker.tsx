import { cn } from '@/lib/cn'
import { rpeLabel } from '../format'

interface RpePickerProps {
  label: string
  value: number | undefined
  onChange: (rpe: number | undefined) => void
  /** Auswahlbereich, z. B. 6–10 für einzelne Sätze, 1–10 für das ganze Training */
  min?: number
  max?: number
}

/** Auswahl der Anstrengung; erneutes Antippen hebt die Auswahl auf. */
export function RpePicker({ label, value, onChange, min = 1, max = 10 }: RpePickerProps) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-fg-muted">
        {label}
        {value !== undefined && (
          <span className="ml-2 text-fg">
            {value} – {rpeLabel(value)}
          </span>
        )}
      </legend>
      <div className="grid grid-flow-col gap-1.5">
        {values.map((rpe) => (
          <button
            key={rpe}
            type="button"
            role="radio"
            aria-checked={value === rpe}
            onClick={() => onChange(value === rpe ? undefined : rpe)}
            className={cn(
              'h-11 rounded-lg border text-base font-semibold transition-colors',
              value === rpe
                ? 'border-accent bg-accent text-on-accent'
                : 'border-line bg-surface text-fg-muted active:bg-surface-raised',
            )}
          >
            {rpe}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
