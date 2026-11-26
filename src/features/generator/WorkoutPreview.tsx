import { useState } from 'react'
import { Link } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import { InfoIcon, RefreshIcon, SwapIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type {
  ExerciseSuggestion,
  GeneratedWorkout,
  SkillPractice,
  WorkoutItem,
} from '@/domain/generator'
import { circuitRest, describeRest, summarizeItem } from './describe'
import type { MovementPlacement } from '@/domain/movement/placement'
import { hasMovementVideo } from '@/features/movement/videos'
import { BLOCK_LABELS, FOCUS_LABELS, INTENSITY_LABELS } from './labels'
import { MovementPracticeCard } from './MovementPracticeCard'
import { SkillPracticeCard } from './SkillPracticeCard'
import type { SkillOption } from './skillOptions'
import { SwapPicker } from './SwapPicker'

interface WorkoutPreviewProps {
  workout: GeneratedWorkout
  onRegenerate: () => void
  onEdit: () => void
  onSwitchToRecovery: () => void
  /** Liefert alle Übungen zum Austausch: ähnliche zuerst (`related`), dann alle übrigen */
  alternativesFor: (exerciseSlug: string) => ExerciseSuggestion[]
  onSwap: (blockIndex: number, itemIndex: number, suggestion: ExerciseSuggestion) => void
  onStart: () => void
  /** Rücksprung aus den Übungsdetails (Standard: Training) */
  backTo?: string
  /** Hinweis unter „Training starten" (z. B. dass die Einheit auf heute verschoben wird) */
  startHint?: string
  startDisabled?: boolean
  /** „Skill üben": Skills für dieses Training einbauen (ohne Angabe ausgeblendet) */
  skills?: {
    options: readonly SkillOption[]
    onAdd: (practice: SkillPractice) => void
    onRemove: (skillSlug: string) => void
  }
  /** „Movement einbauen": Movement-Lab-Übungen ins Warm-up/Cool-down (ohne Angabe ausgeblendet) */
  movement?: {
    exercises: readonly CatalogExercise[]
    onAdd: (exercise: CatalogExercise, placement: MovementPlacement) => void
    onRemove: (exerciseSlug: string) => void
  }
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
  skills,
  movement,
}: WorkoutPreviewProps) {
  const [showWhy, setShowWhy] = useState(false)
  const [swapping, setSwapping] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <Card className="relative overflow-hidden border-accent/20 shadow-raised">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-60 rounded-full bg-accent/15 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-2">
          <Badge tone="accent">{FOCUS_LABELS[workout.focus]}</Badge>
          <Badge>{INTENSITY_LABELS[workout.intensity]}</Badge>
          <Badge>{workout.blocks.reduce((n, b) => n + b.items.length, 0)} Übungen</Badge>
        </div>
        <p className="relative mt-4 font-display text-6xl leading-none font-bold">
          {workout.estimatedDurationMin}
          <span className="ml-1 text-xl font-semibold text-fg-muted">min</span>
        </p>
        <p className="relative mt-1 text-sm text-fg-muted">
          geschätzt · Ziel {workout.targetDurationMin} min
        </p>

        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          aria-expanded={showWhy}
          className="relative mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/25 bg-accent/10 px-4 text-sm font-semibold text-accent transition hover:bg-accent/15"
        >
          <InfoIcon width={18} height={18} />
          {showWhy ? 'Begründung ausblenden' : 'Warum dieses Training?'}
        </button>
        {showWhy && (
          <ul className="relative mt-3 flex animate-fade list-disc flex-col gap-1.5 pl-5 text-sm text-fg-muted marker:text-accent">
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

      {skills && (
        <SkillPracticeCard
          workout={workout}
          options={skills.options}
          onAdd={skills.onAdd}
          onRemove={skills.onRemove}
        />
      )}

      {movement && (
        <MovementPracticeCard
          workout={workout}
          exercises={movement.exercises}
          onAdd={movement.onAdd}
          onRemove={movement.onRemove}
        />
      )}

      {workout.blocks.map((block, blockIndex) => {
        const inCircuit = block.rounds !== undefined
        return (
          <Card key={block.type} className="p-0">
            <header className="flex items-center justify-between gap-3 border-b border-line px-5 pt-4 pb-3">
              <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold tracking-wide uppercase">
                <span
                  aria-hidden="true"
                  className={
                    block.type === 'main'
                      ? 'h-5 w-1 rounded-full bg-accent'
                      : block.type === 'conditioning'
                        ? 'h-5 w-1 rounded-full bg-hyrox'
                        : 'h-5 w-1 rounded-full bg-line-strong'
                  }
                />
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
                  <li
                    key={key}
                    className="px-5 py-3.5 transition-colors hover:bg-surface-raised/40"
                  >
                    <ItemRow
                      item={item}
                      inCircuit={inCircuit}
                      backTo={backTo}
                      isSwapping={swapping === key}
                      onToggleSwap={() => setSwapping(swapping === key ? null : key)}
                    />
                    {swapping === key && (
                      <div className="mt-3">
                        <SwapPicker
                          suggestions={alternativesFor(item.exerciseSlug)}
                          onPick={(suggestion) => {
                            onSwap(blockIndex, itemIndex, suggestion)
                            setSwapping(null)
                          }}
                        />
                      </div>
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
          to={
            item.role === 'movement'
              ? `/movement/exercise/${item.exerciseSlug}`
              : `/exercises/${item.exerciseSlug}`
          }
          state={{ backTo }}
          className="font-semibold transition-colors hover:text-accent"
        >
          {item.exerciseName}
          {hasMovementVideo(item.exerciseSlug) && (
            <span className="ml-1.5" aria-label="mit Video">
              🎥
            </span>
          )}
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
        className="grid size-11 shrink-0 place-items-center rounded-xl border border-transparent text-fg-muted transition hover:border-line hover:bg-surface-raised hover:text-fg aria-expanded:border-accent/30 aria-expanded:bg-accent/10 aria-expanded:text-accent"
      >
        <SwapIcon width={20} height={20} />
      </button>
    </div>
  )
}
