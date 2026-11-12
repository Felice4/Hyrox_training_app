import { useState } from 'react'
import type { CatalogExercise } from '@/api/exercises'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { Stepper } from '@/components/ui/Stepper'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import { FOCUSES } from '@/domain/generator'
import {
  addExercise,
  addSet,
  ENTRY_SOURCES,
  MAX_DURATION_MIN,
  MAX_TEXT_LENGTH,
  moveExercise,
  removeExercise,
  removeSet,
  setBlock,
  updateSet,
  validateEntry,
  type ManualEntry,
} from '@/domain/manualEntry/entry'
import { FOCUS_LABELS } from '@/features/generator/labels'
import { RpePicker } from '@/features/training/inputs/RpePicker'
import { EntryExerciseCard } from './EntryExerciseCard'
import { ExercisePicker } from './ExercisePicker'
import { SOURCE_LABELS } from './labels'

const FOCUS_OPTIONS = FOCUSES.map((f) => ({ value: f, label: FOCUS_LABELS[f] }))

const SOURCE_OPTIONS = ENTRY_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))

const newId = () => crypto.randomUUID()

/**
 * Formular „Training eintragen" (docs/MANUAL_ENTRY.md §2): Art, Allgemeines, Übungen mit
 * Sätzen, Anstrengung und Notiz. Jede Änderung geht sofort an `onChange` (lokaler Entwurf).
 */
export function EntryForm({
  entry,
  today,
  exercises,
  canChangeSource,
  saving,
  saveLabel,
  onChange,
  onSave,
}: {
  entry: ManualEntry
  today: string
  exercises: readonly CatalogExercise[]
  /** Beim Bearbeiten bleibt die Art fest */
  canChangeSource: boolean
  saving: boolean
  saveLabel: string
  onChange: (entry: ManualEntry) => void
  onSave: () => void
}) {
  const [picking, setPicking] = useState(entry.exercises.length === 0)
  const [showErrors, setShowErrors] = useState(false)
  const errors = validateEntry(entry, today)
  const update = (patch: Partial<ManualEntry>) => onChange({ ...entry, ...patch })

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (errors.length > 0) {
          setShowErrors(true)
          return
        }
        onSave()
      }}
    >
      <Card className="flex flex-col gap-4">
        {canChangeSource && (
          <SingleChoiceChips
            label="Art"
            options={SOURCE_OPTIONS}
            value={entry.source}
            onChange={(source) =>
              update({ source, focus: source === 'trainer' ? 'hyrox' : entry.focus })
            }
          />
        )}
        {entry.source === 'trainer' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Titel"
              placeholder="z. B. HYROX Class"
              maxLength={MAX_TEXT_LENGTH}
              value={entry.title ?? ''}
              onChange={(e) => update({ title: e.target.value })}
            />
            <TextField
              label="Trainer / Studio (optional)"
              placeholder="z. B. Max, Box Nord"
              maxLength={MAX_TEXT_LENGTH}
              value={entry.coach ?? ''}
              onChange={(e) => update({ coach: e.target.value })}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Datum"
            type="date"
            max={today}
            value={entry.date}
            onChange={(e) => update({ date: e.target.value })}
          />
          <TextField
            label="Beginn"
            type="time"
            value={entry.time}
            onChange={(e) => update({ time: e.target.value })}
          />
        </div>
        <Stepper
          label="Dauer"
          value={entry.durationMin}
          onChange={(durationMin) => update({ durationMin })}
          min={5}
          max={MAX_DURATION_MIN}
          step={5}
          unit="min"
        />
        <SingleChoiceChips
          label="Schwerpunkt"
          options={FOCUS_OPTIONS}
          value={entry.focus}
          onChange={(focus) => update({ focus })}
        />
      </Card>

      <section className="flex flex-col gap-3" aria-label="Übungen">
        <h2 className="eyebrow px-1">Übungen und Sätze</h2>
        {entry.exercises.map((exercise, index) => (
          <EntryExerciseCard
            key={exercise.id}
            exercise={exercise}
            index={index}
            count={entry.exercises.length}
            onBlock={(block) => onChange(setBlock(entry, exercise.id, block))}
            onSet={(setId, patch) => onChange(updateSet(entry, exercise.id, setId, patch))}
            onAddSet={() => onChange(addSet(entry, exercise.id, newId))}
            onRemoveSet={(setId) => onChange(removeSet(entry, exercise.id, setId))}
            onMove={(by) => onChange(moveExercise(entry, exercise.id, by))}
            onRemove={() => onChange(removeExercise(entry, exercise.id))}
          />
        ))}
        {picking ? (
          <ExercisePicker
            exercises={exercises}
            onPick={(exercise) => {
              onChange(
                addExercise(
                  entry,
                  { slug: exercise.slug, name: exercise.name, measurement: exercise.measurement },
                  newId,
                  exercise.category === 'warmup'
                    ? 'warmup'
                    : exercise.category === 'cooldown' || exercise.category === 'mobility'
                      ? 'cooldown'
                      : 'main',
                ),
              )
              setPicking(false)
            }}
            onClose={() => setPicking(false)}
          />
        ) : (
          <Button variant="secondary" onClick={() => setPicking(true)}>
            + Übung hinzufügen
          </Button>
        )}
      </section>

      <Card className="flex flex-col gap-4">
        <RpePicker
          label="Anstrengung des Trainings (RPE)"
          value={entry.sessionRpe}
          onChange={(sessionRpe) => update({ sessionRpe })}
        />
        <TextArea
          label="Notiz (optional)"
          maxLength={2000}
          rows={3}
          value={entry.notes ?? ''}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </Card>

      {/* Fehlerliste erst nach dem ersten Speicherversuch; verschwindet, sobald alles passt */}
      {showErrors && errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
          <p className="mb-1 text-sm font-semibold">Bitte noch ergänzen:</p>
          <ul className="list-disc pl-5 text-sm">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <Button type="submit" fullWidth loading={saving}>
        {saveLabel}
      </Button>
    </form>
  )
}
