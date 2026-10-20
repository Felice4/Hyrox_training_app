import { cn } from '@/lib/cn'

/** Kleiner Ladekreis in der aktuellen Textfarbe. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-6 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none',
        className,
      )}
    />
  )
}

/** Ganzseitige Ladeanzeige, z. B. während die Anmeldung geprüft wird. */
export function FullScreenSpinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <Spinner className="size-8 text-accent" />
      <span className="text-sm text-fg-muted">{label}</span>
    </div>
  )
}
