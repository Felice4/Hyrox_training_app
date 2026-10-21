import type { ReactNode } from 'react'
import { Chip } from './Chip'
import { FieldError } from './FieldError'

export interface Choice<T extends string | number> {
  value: T
  label: string
}

interface ChoiceFieldsetProps {
  label: string
  hint?: string
  error?: string | undefined
  children: ReactNode
}

function ChoiceFieldset({ label, hint, error, children }: ChoiceFieldsetProps) {
  return (
    <fieldset className="flex flex-col gap-2" aria-invalid={error ? true : undefined}>
      <legend className="mb-2 text-sm font-medium text-fg-muted">{label}</legend>
      {hint && <p className="-mt-1 mb-1 text-xs text-fg-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2">{children}</div>
      <FieldError message={error} />
    </fieldset>
  )
}

interface SingleChoiceProps<T extends string | number> {
  label: string
  hint?: string
  options: readonly Choice<T>[]
  value: T | ''
  onChange: (value: T) => void
  error?: string | undefined
  /** Erneutes Antippen hebt die Auswahl auf (für optionale Angaben). */
  allowDeselect?: boolean
  onClear?: () => void
}

/** Einfachauswahl als Chips (wie Radiobuttons). */
export function SingleChoiceChips<T extends string | number>({
  label,
  hint,
  options,
  value,
  onChange,
  error,
  allowDeselect = false,
  onClear,
}: SingleChoiceProps<T>) {
  return (
    <ChoiceFieldset label={label} hint={hint} error={error}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Chip
            key={String(option.value)}
            selected={selected}
            role="radio"
            aria-checked={selected}
            aria-pressed={undefined}
            onClick={() => (selected && allowDeselect ? onClear?.() : onChange(option.value))}
          >
            {option.label}
          </Chip>
        )
      })}
    </ChoiceFieldset>
  )
}

interface MultiChoiceProps<T extends string | number> {
  label: string
  hint?: string
  options: readonly Choice<T>[]
  values: readonly T[]
  onChange: (values: T[]) => void
  error?: string | undefined
}

/** Mehrfachauswahl als Chips (wie Checkboxen). Reihenfolge folgt den Optionen. */
export function MultiChoiceChips<T extends string | number>({
  label,
  hint,
  options,
  values,
  onChange,
  error,
}: MultiChoiceProps<T>) {
  const toggle = (value: T) => {
    const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
    onChange(options.map((o) => o.value).filter((v) => next.includes(v)))
  }
  return (
    <ChoiceFieldset label={label} hint={hint} error={error}>
      {options.map((option) => (
        <Chip
          key={String(option.value)}
          selected={values.includes(option.value)}
          onClick={() => toggle(option.value)}
        >
          {option.label}
        </Chip>
      ))}
    </ChoiceFieldset>
  )
}
