import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'

/** Blättern zwischen Wochen bzw. Monaten mit Sprung zurück zum aktuellen Zeitraum. */
export function PeriodNav({
  label,
  isCurrent,
  currentLabel,
  unit,
  onPrev,
  onNext,
  onCurrent,
}: {
  label: string
  isCurrent: boolean
  /** z. B. „Diese Woche" */
  currentLabel: string
  /** „Woche" oder „Monat" (für Bildschirmleser) */
  unit: string
  onPrev: () => void
  onNext: () => void
  onCurrent: () => void
}) {
  return (
    <nav className="flex items-center justify-between gap-2" aria-label={`${unit} wählen`}>
      <Button
        variant="secondary"
        className="px-3"
        aria-label={`Vorheriger Zeitraum (${unit})`}
        onClick={onPrev}
      >
        <ChevronLeftIcon />
      </Button>
      <div className="text-center">
        <p className="font-semibold">{label}</p>
        {isCurrent ? (
          <p className="text-xs text-accent">{currentLabel}</p>
        ) : (
          <button
            type="button"
            className="min-h-6 text-xs text-fg-muted underline"
            onClick={onCurrent}
          >
            Zurück zu: {currentLabel}
          </button>
        )}
      </div>
      <Button
        variant="secondary"
        className="px-3"
        aria-label={`Nächster Zeitraum (${unit})`}
        onClick={onNext}
      >
        <ChevronRightIcon />
      </Button>
    </nav>
  )
}
