import { useId } from 'react'
import { ChevronDownIcon } from '@/components/icons'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
}

/** Natives Auswahlfeld – öffnet am Smartphone die gewohnte System-Auswahl. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-fg-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => {
            const selected = options.find((option) => option.value === event.target.value)
            if (selected) onChange(selected.value)
          }}
          className="min-h-12 w-full appearance-none truncate rounded-xl border border-line bg-surface pr-10 pl-4 text-base text-fg outline-none focus:border-accent"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          width={18}
          height={18}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-muted"
        />
      </div>
    </div>
  )
}
