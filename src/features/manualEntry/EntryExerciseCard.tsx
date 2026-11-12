import { useId, useState } from 'react'
import { Card } from '@/components/ui/Card'
import {
  ENTRY_BLOCKS,
  setHasValue,
  type EntryBlock,
  type EntryExercise,
} from '@/domain/manualEntry/entry'
import { MEASURED_FIELDS } from '@/domain/session/session'
import type { SetValues } from '@/domain/session/types'
import { parseDecimal } from '@/features/profile/draft'
import { BLOCK_LABELS } from '@/features/generator/labels'
import { cn } from '@/lib/cn'
import { formatDurationClock, parseDuration } from '@/lib/time'

const FIELD_LABELS: Record<keyof SetValues, string> = {
  weightKg: 'kg',
  reps: 'Wdh.',
  distanceM: 'm',
  durationSec: 'Zeit',
  calories: 'kcal',
}

const formatNumber = (value: number | undefined) =>
  value === undefined ? '' : String(Math.round(value * 100) / 100).replace('.', ',')

const inputClass =
  'h-11 w-full min-w-0 rounded-lg border border-line bg-surface px-2 text-center font-semibold tabular-nums text-fg outline-none placeholder:font-normal placeholder:text-fg-muted/70 focus:border-accent aria-invalid:border-danger'

/** Kompaktes Zahlenfeld (Dezimalkomma erlaubt); übernimmt den Wert beim Verlassen. */
function NumberCell({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? formatNumber(value)
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      autoComplete="off"
      placeholder={label}
      value={text}
      onFocus={() => setDraft(formatNumber(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const parsed = parseDecimal(text)
        if (parsed === undefined) onChange(undefined)
        else if (!Number.isNaN(parsed) && parsed >= 0) onChange(parsed)
        setDraft(null)
      }}
      className={inputClass}
    />
  )
}

/** Kompaktes Zeitfeld (m:ss bzw. h:mm:ss). */
function DurationCell({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const text = draft ?? (value === undefined ? '' : formatDurationClock(value))
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      autoComplete="off"
      placeholder="m:ss"
      value={text}
      aria-invalid={invalid || undefined}
      onFocus={() => setDraft(value === undefined ? '' : formatDurationClock(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (text.trim() === '') {
          setInvalid(false)
          onChange(undefined)
          setDraft(null)
          return
        }
        const parsed = parseDuration(text)
        setInvalid(parsed === null)
        if (parsed !== null) {
          onChange(parsed)
          setDraft(null)
        }
      }}
      className={inputClass}
    />
  )
}

/** Eine Übung im Eintrag: Block, Sätze mit den passenden Feldern, verschieben, entfernen. */
export function EntryExerciseCard({
  exercise,
  index,
  count,
  onBlock,
  onSet,
  onAddSet,
  onRemoveSet,
  onMove,
  onRemove,
}: {
  exercise: EntryExercise
  index: number
  count: number
  onBlock: (block: EntryBlock) => void
  onSet: (setId: string, patch: SetValues) => void
  onAddSet: () => void
  onRemoveSet: (setId: string) => void
  onMove: (by: -1 | 1) => void
  onRemove: () => void
}) {
  const blockId = useId()
  const fields = MEASURED_FIELDS[exercise.measurement]
  const iconButton =
    'grid size-10 shrink-0 place-items-center rounded-lg text-fg-muted transition hover:bg-surface-high hover:text-fg disabled:opacity-30'

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow">Übung {index + 1}</p>
          <h3 className="font-semibold">{exercise.exerciseName}</h3>
        </div>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            className={iconButton}
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label={`${exercise.exerciseName} nach oben`}
          >
            ↑
          </button>
          <button
            type="button"
            className={iconButton}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            aria-label={`${exercise.exerciseName} nach unten`}
          >
            ↓
          </button>
          <button
            type="button"
            className={cn(iconButton, 'hover:text-danger')}
            onClick={onRemove}
            aria-label={`${exercise.exerciseName} entfernen`}
          >
            ✕
          </button>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-labelledby={blockId}
        className="flex flex-wrap items-center gap-1.5"
      >
        <span id={blockId} className="mr-1 text-xs text-fg-muted">
          Block
        </span>
        {ENTRY_BLOCKS.map((block) => (
          <button
            key={block}
            type="button"
            role="radio"
            aria-checked={exercise.block === block}
            onClick={() => onBlock(block)}
            className={cn(
              'min-h-9 rounded-full border px-3 text-sm transition',
              exercise.block === block
                ? 'border-accent bg-accent/15 text-fg'
                : 'border-line text-fg-muted hover:text-fg',
            )}
          >
            {BLOCK_LABELS[block]}
          </button>
        ))}
      </div>

      <ol className="flex flex-col gap-2">
        {exercise.sets.map((set, setIndex) => (
          <li
            key={set.id}
            className={cn(
              'grid items-center gap-2',
              fields.length === 1
                ? 'grid-cols-[3.5rem_1fr_2.5rem]'
                : 'grid-cols-[3.5rem_1fr_1fr_2.5rem]',
            )}
          >
            <span
              className={cn(
                'text-sm',
                setHasValue(exercise.measurement, set.values) ? 'text-fg-muted' : 'text-hyrox',
              )}
            >
              Satz {setIndex + 1}
            </span>
            {fields.map((field) =>
              field === 'durationSec' ? (
                <DurationCell
                  key={field}
                  label={`Satz ${setIndex + 1} Zeit`}
                  value={set.values.durationSec}
                  onChange={(v) => onSet(set.id, { durationSec: v })}
                />
              ) : (
                <NumberCell
                  key={field}
                  label={`Satz ${setIndex + 1} ${FIELD_LABELS[field]}`}
                  value={set.values[field]}
                  onChange={(v) => onSet(set.id, { [field]: v })}
                />
              ),
            )}
            <button
              type="button"
              className={cn(iconButton, 'hover:text-danger')}
              onClick={() => onRemoveSet(set.id)}
              aria-label={`Satz ${setIndex + 1} entfernen`}
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      <p className="-mt-1 text-xs text-fg-muted">
        {fields.map((f) => FIELD_LABELS[f]).join(' · ')}
        {fields.includes('durationSec') && ' (m:ss)'}
      </p>
      <button
        type="button"
        onClick={onAddSet}
        className="min-h-11 rounded-xl border border-dashed border-line-strong text-sm font-medium text-fg-muted transition hover:border-accent hover:text-fg"
      >
        + Satz
      </button>
    </Card>
  )
}
