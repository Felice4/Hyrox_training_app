import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean
}

/** Auswählbarer Filter-Chip (z. B. Kategorie). */
export function Chip({ selected, className, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150',
        selected
          ? 'border-accent bg-accent text-on-accent'
          : 'border-line bg-surface text-fg-muted hover:text-fg',
        className,
      )}
      {...props}
    />
  )
}
