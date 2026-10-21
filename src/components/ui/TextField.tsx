import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | undefined
  /** Element rechts im Feld, z. B. „Anzeigen" beim Passwort oder eine Einheit. */
  trailing?: ReactNode
  /** Platz für das Element rechts: schmal (Einheit, Icon) oder breit (Button). */
  trailingSize?: 'narrow' | 'wide'
}

export function TextField({
  label,
  error,
  trailing,
  trailingSize = 'narrow',
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-fg-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'min-h-12 w-full rounded-xl border bg-surface px-4 text-base text-fg transition-colors outline-none placeholder:text-fg-muted/60 focus:border-accent',
            error ? 'border-danger' : 'border-line',
            trailing ? (trailingSize === 'wide' ? 'pr-24' : 'pr-12') : undefined,
            className,
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
