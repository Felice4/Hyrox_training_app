import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
  /** Zeigt einen Ladekreis und sperrt den Button (z. B. während eine Anfrage läuft). */
  loading?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent shadow-glow hover:bg-accent-strong active:shadow-none disabled:shadow-none',
  secondary:
    'border border-line-strong bg-surface-raised text-fg shadow-card hover:border-fg-muted/40 hover:bg-surface-high',
  ghost: 'text-fg-muted hover:bg-surface-raised hover:text-fg',
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold tracking-[0.01em] transition duration-200 ease-out select-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
        VARIANT_CLASSES[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="size-5" />}
      {children}
    </button>
  )
}
