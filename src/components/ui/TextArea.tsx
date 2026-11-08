import { useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { FieldError } from './FieldError'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string | undefined
}

export function TextArea({ label, error, className, id, ...props }: TextAreaProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-fg-muted">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'w-full resize-y rounded-xl border bg-surface-raised px-4 py-3 text-base text-fg transition duration-200 outline-none placeholder:text-fg-muted/80 hover:border-fg-muted/40 focus:border-accent focus:ring-4 focus:ring-accent/15',
          error ? 'border-danger' : 'border-line-strong',
          className,
        )}
        {...props}
      />
      <FieldError id={errorId} message={error} />
    </div>
  )
}
