import { useState } from 'react'
import type { TrainerAppointmentInput } from '@/api/weekPlans'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { Stepper } from '@/components/ui/Stepper'
import { TextField } from '@/components/ui/TextField'
import { FOCUSES, INTENSITIES } from '@/domain/generator'
import { MAX_TEXT_LENGTH } from '@/domain/manualEntry/entry'
import { FOCUS_LABELS, INTENSITY_LABELS } from '@/features/generator/labels'
import { validateAppointment } from './appointment'

const FOCUS_OPTIONS = FOCUSES.map((f) => ({ value: f, label: FOCUS_LABELS[f] }))
const INTENSITY_OPTIONS = INTENSITIES.map((i) => ({ value: i, label: INTENSITY_LABELS[i] }))
/** Trainer-Termin anlegen oder bearbeiten (docs/MANUAL_ENTRY.md §3). */
export function AppointmentForm({
  initial,
  today,
  saving,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial: TrainerAppointmentInput
  /** Lokales Datum – Termine in der Vergangenheit werden abgelehnt */
  today: string
  saving: boolean
  saveLabel: string
  onSave: (input: TrainerAppointmentInput) => void
  onCancel?: () => void
}) {
  const [input, setInput] = useState(initial)
  const [showErrors, setShowErrors] = useState(false)
  const errors = validateAppointment(input, today)
  const update = (patch: Partial<TrainerAppointmentInput>) => setInput({ ...input, ...patch })

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
        onSave({ ...input, title: input.title.trim(), coach: input.coach?.trim() || null })
      }}
    >
      <Card className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Titel"
            placeholder="z. B. HYROX Class"
            maxLength={MAX_TEXT_LENGTH}
            value={input.title}
            onChange={(e) => update({ title: e.target.value })}
          />
          <TextField
            label="Trainer / Studio (optional)"
            placeholder="z. B. Max, Box Nord"
            maxLength={MAX_TEXT_LENGTH}
            value={input.coach ?? ''}
            onChange={(e) => update({ coach: e.target.value })}
          />
        </div>
        <TextField
          label="Uhrzeit"
          type="time"
          value={input.startTime}
          onChange={(e) => update({ startTime: e.target.value })}
        />
        <Stepper
          label="Erwartete Dauer"
          value={input.durationMin}
          onChange={(durationMin) => update({ durationMin })}
          min={10}
          max={240}
          step={5}
          unit="min"
        />
        <SingleChoiceChips
          label="Schwerpunkt"
          options={FOCUS_OPTIONS}
          value={input.focus}
          onChange={(focus) => update({ focus })}
        />
        <SingleChoiceChips
          label="Erwartete Intensität"
          options={INTENSITY_OPTIONS}
          value={input.intensity}
          onChange={(intensity) => update({ intensity })}
        />
        <p className="text-xs text-fg-muted">
          Der Termin bleibt bei „Woche neu planen" erhalten; die übrigen Tage werden passend dazu
          verteilt.
        </p>
      </Card>
      {showErrors && errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
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
      {onCancel && (
        <Button variant="ghost" onClick={onCancel}>
          Abbrechen
        </Button>
      )}
    </form>
  )
}
