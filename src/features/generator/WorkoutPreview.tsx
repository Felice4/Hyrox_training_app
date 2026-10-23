import { useState } from 'react'
import { Link } from 'react-router'
import { InfoIcon, RefreshIcon, SwapIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { ExerciseSuggestion, GeneratedWorkout, WorkoutItem } from '@/domain/generator'
import { circuitRest, describeRest, summarizeItem } from './describe'
import { BLOCK_LABELS, FOCUS_LABELS, INTENSITY_LABELS } from './labels'

interface WorkoutPreviewProps {
  workout: GeneratedWorkout
  onRegenerate: () => void
  onEdit: () => void
  onSwitchToRecovery: () => void
  /** Liefert Austauschvorschläge für eine Übung */
  alternativesFor: (exerciseSlug: string) => ExerciseSuggestion[]
  onSwap: (blockIndex: number, itemIndex: number, suggestion: ExerciseSuggestion) => void
  onStart: () => void
  /** Rücksprung aus den Übungsdetails (Standard: Training) */
  backTo?: string
  /** Hinweis unter „Training starten" (z. B. dass die Einheit auf heute verschoben wird) */
  startHint?: string
  startDisabled?: boolean
}

export function WorkoutPreview({
  workout,
  onRegenerate,
  onEdit,
  onSwitchToRecovery,
  alternativesFor,
  onSwap,
  onStart,
  backTo = '/training',
  startHint,
  startDisabled = false,
}: WorkoutPreviewProps) {
  const [showWhy, setShowWhy] = useState(false)
  const [swapping, setSwapping] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{FOCUS_LABELS[workout.focus]}</Badge>
          <Badge>{INTENSITY_LABELS[workout.intensity]}</Badge>
        </div>
        <p className="mt-3 font-display text-5xl font-bold">
          {workout.estimatedDurationMin}
          <span className="ml-1 text-xl font-semibold text-fg-muted">min</span>
        </p>
        <p className="text-sm text-fg-muted">geschätzt · Ziel {workout.targetDurationMin} min</p>

        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          aria-expanded={showWhy}
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent"
        >
          <InfoIcon width={18} height={18} />
          {showWhy ? 'Begründung ausblenden' : 'Warum dieses Training?'}
        </button>
        {showWhy && (
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-fg-muted">
            {workout.explanation.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </Card>

      {workout.recoverySuggested && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-hyrox/40 bg-hyrox/10 px-4 py-3 text-sm"
        >
          <p>Deine Tagesform ist sehr niedrig. Eine regenerative Einheit wäre heute sinnvoller.</p>
          <Button variant="secondary" className="self-start" onClick={onSwitchToRecovery}>
            Regenerative Einheit erstellen
          </Button>
        </div>
      )}

      {workout.blocks.map((block, blockIndex) => {
        const inCircuit = block.rounds !== undefined
        return (
          <Card key={block.type} className="p-0">
            <header className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-2">
              <h2 className="font-display text-2xl font-bold tracking-wide uppercase">
                {BLOCK_LABELS[block.type]}
              </h2>
              {inCircuit && (
                <span className="text-sm text-fg-muted">
                  {block.rounds} Runden im Wechsel · Pause {describeRest(circuitRest(block.items))}
                </span>
              )}
            </header>
            <ul className="divide-y divide-line">
              {block.items.map((item, itemIndex) => {
                const key = `${blockIndex}-${itemIndex}`
                return (
                  <li key={key} className="px-5 py-3">
                    <ItemRow
                      item={item}
                      inCircuit={inCircuit}
                      backTo={backTo}
                      isSwapping={swapping === key}
                      onToggleSwap={() => setSwapping(swapping === key ? null : key)}
                    />
                    {swapping === key && (
                      <SwapList
                        suggestions={alternativesFor(item.exerciseSlug)}
                        onPick={(suggestion) => {
                          onSwap(blockIndex, itemIndex, suggestion)
                          setSwapping(null)
                        }}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        )
      })}

      <div className="flex flex-col gap-3">
        <Button fullWidth className="min-h-14 text-lg" disabled={startDisabled} onClick={onStart}>
          Training starten
        </Button>
        {startHint && <p className="-mt-1 text-center text-xs text-fg-muted">{startHint}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onRegenerate}>
            <RefreshIcon width={20} height={20} />
            Neu erzeugen
          </Button>
          <Button variant="secondary" fullWidth onClick={onEdit}>
            Anpassen
          </Button>
        </div>
      </div>
    </div>
  )
}

function ItemRow({
  item,
  inCircuit,
  backTo,
  isSwapping,
  onToggleSwap,
}: {
  item: WorkoutItem
  inCircuit: boolean
  backTo: string
  isSwapping: boolean
  onToggleSwap: () => void
}) {
  const summary = summarizeItem(item, inCircuit)
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <Link
          to={`/exercises/${item.exerciseSlug}`}
          state={{ backTo }}
          className="font-semibold hover:text-accent"
        >
          {item.exerciseName}
        </Link>
        <p className="mt-0.5 text-sm">
          <span className="font-medium text-accent">{summary.main}</span>
          {summary.details.length > 0 && (
            <span className="text-fg-muted"> · {summary.details.join(' · ')}</span>
          )}
        </p>
        {item.note && <p className="mt-1 text-xs text-fg-muted">{item.note}</p>}
      </div>
      <button
        type="button"
        onClick={onToggleSwap}
        aria-expanded={isSwapping}
        aria-label={`${item.exerciseName} tauschen`}
        className="grid size-11 shrink-0 place-items-center rounded-xl text-fg-muted hover:bg-surface-raised hover:text-fg aria-expanded:bg-surface-raised aria-expanded:text-accent"
      >
        <SwapIcon width={20} height={20} />
      </button>
    </div>
  )
}

function SwapList({
  suggestions,
  onPick,
}: {
  suggestions: ExerciseSuggestion[]
  onPick: (suggestion: ExerciseSuggestion) => void
}) {
  if (suggestions.length === 0) {
    return (
      <p className="mt-3 rounded-xl bg-surface-raised px-4 py-3 text-sm text-fg-muted">
        Keine passende Alternative mit deinen verfügbaren Geräten gefunden.
      </p>
    )
  }
  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-xs font-medium text-fg-muted">Ersetzen durch:</p>
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.exercise.slug}
          type="button"
          onClick={() => onPick(suggestion)}
          className="flex min-h-12 flex-col items-start justify-center rounded-xl bg-surface-raised px-4 py-2 text-left hover:bg-line"
        >
          <span className="font-medium">{suggestion.exercise.name}</span>
          <span className="text-xs text-fg-muted">{suggestion.reason}</span>
        </button>
      ))}
    </div>
  )
}
