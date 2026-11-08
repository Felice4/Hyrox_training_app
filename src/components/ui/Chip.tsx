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
        'min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition duration-200 active:scale-[0.97]',
        selected
          ? 'border-accent bg-accent text-on-accent shadow-glow'
          : 'border-line-strong bg-surface-raised text-fg-muted hover:border-fg-muted/40 hover:text-fg',
        className,
      )}
      {...props}
    />
  )
}
