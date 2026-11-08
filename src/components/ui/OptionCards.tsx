import { cn } from '@/lib/cn'
import { FieldError } from './FieldError'

export interface OptionCard<T extends string> {
  value: T
  label: string
  description: string
}

interface OptionCardsProps<T extends string> {
  label: string
  options: readonly OptionCard<T>[]
  value: T | ''
  onChange: (value: T) => void
  error?: string | undefined
}

/** Einfachauswahl als große Karten mit kurzer Erklärung. */
export function OptionCards<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: OptionCardsProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2" aria-invalid={error ? true : undefined}>
      <legend className="mb-2 text-sm font-medium text-fg-muted">{label}</legend>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex min-h-16 flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition duration-200 active:scale-[0.99]',
              selected
                ? 'border-accent bg-accent/10 shadow-glow'
                : 'border-line-strong bg-surface-raised hover:border-fg-muted/40 hover:bg-surface-high',
            )}
          >
            <span className={cn('font-semibold', selected && 'text-accent')}>{option.label}</span>
            <span className="text-sm text-fg-muted">{option.description}</span>
          </button>
        )
      })}
      <FieldError message={error} />
    </fieldset>
  )
}
