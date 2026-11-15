import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MultiChoiceChips, SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { Stepper } from '@/components/ui/Stepper'
import { TextField } from '@/components/ui/TextField'
import { WEEKDAYS, WEEKDAY_SHORT_LABELS, type Weekday } from '@/domain/profile/vocabulary'
import {
  RACE_DAYS_MAX,
  RACE_DAYS_MIN,
  RACE_NAME_MAX,
  validateRaceInput,
  type RaceInput,
} from '@/domain/race/race'
import {
  categoriesFor,
  gendersFor,
  normalizeVariant,
  RACE_CATEGORY_LABELS,
  RACE_FORMATS,
  RACE_FORMAT_HINTS,
  RACE_FORMAT_LABELS,
  RACE_GENDER_LABELS,
  type RaceVariant,
} from '@/domain/race/variant'
import { formatDurationClock, parseDuration } from '@/lib/time'

const FORMAT_OPTIONS = RACE_FORMATS.map((f) => ({ value: f, label: RACE_FORMAT_LABELS[f] }))
const WEEKDAY_OPTIONS = WEEKDAYS.map((d) => ({ value: d, label: WEEKDAY_SHORT_LABELS[d] }))

/** Wettkampf anlegen oder bearbeiten (docs/RACE_PREP.md §1). */
export function RaceForm({
  initial,
  today,
  editing,
  saving,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial: RaceInput
  today: string
  editing: boolean
  saving: boolean
  saveLabel: string
  onSave: (input: RaceInput) => void
  onCancel?: () => void
}) {
  const [input, setInput] = useState(initial)
  const [targetText, setTargetText] = useState(
    initial.targetTimeSec === null ? '' : formatDurationClock(initial.targetTimeSec),
  )
  const [showErrors, setShowErrors] = useState(false)

  const targetValid = targetText.trim() === '' || parseDuration(targetText) !== null
  const errors = [
    ...validateRaceInput(input, today, { editing }),
    ...(targetValid ? [] : ['Gib die Zielzeit als Stunden:Minuten:Sekunden ein, z. B. 1:30:00.']),
  ]
  const update = (patch: Partial<RaceInput>) => setInput({ ...input, ...patch })
  const updateVariant = (patch: Partial<RaceVariant>) =>
    update(
      normalizeVariant({
        format: input.format,
        category: input.category,
        gender: input.gender,
        ...patch,
      }),
    )

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
        onSave({ ...input, name: input.name.trim() })
      }}
    >
      <Card className="flex flex-col gap-4">
        <TextField
          label="Name / Ort"
          placeholder="z. B. HYROX Wien"
          maxLength={RACE_NAME_MAX}
          value={input.name}
          onChange={(e) => update({ name: e.target.value })}
        />
        <TextField
          label="Datum"
          type="date"
          value={input.raceDate}
          onChange={(e) => update({ raceDate: e.target.value })}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <SingleChoiceChips
          label="Format"
          hint={RACE_FORMAT_HINTS[input.format]}
          options={FORMAT_OPTIONS}
          value={input.format}
          onChange={(format) => updateVariant({ format })}
        />
        <SingleChoiceChips
          label="Kategorie"
          hint={
            input.category === 'pro'
              ? 'Pro: deutlich schwerere Gewichte an Sleds, Farmers Carry, Lunges und Wall Balls.'
              : 'Open: die Standard-Kategorie – ideal für den ersten Wettkampf.'
          }
          options={categoriesFor(input.format).map((c) => ({
            value: c,
            label: RACE_CATEGORY_LABELS[c],
          }))}
          value={input.category}
          onChange={(category) => updateVariant({ category })}
        />
        <SingleChoiceChips
          label="Wertung"
          options={gendersFor(input.format, input.category).map((g) => ({
            value: g,
            label: RACE_GENDER_LABELS[g],
          }))}
          value={input.gender}
          onChange={(gender) => updateVariant({ gender })}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <Stepper
          label="Trainingstage pro Woche"
          value={input.daysPerWeek}
          onChange={(daysPerWeek) => update({ daysPerWeek })}
          min={RACE_DAYS_MIN}
          max={RACE_DAYS_MAX}
        />
        <MultiChoiceChips<Weekday>
          label="Mögliche Trainingstage"
          hint="Leer lassen, wenn jeder Tag geht. Trainer-Termine zählen mit."
          options={WEEKDAY_OPTIONS}
          values={input.weekdays.filter((d): d is Weekday => WEEKDAYS.includes(d as Weekday))}
          onChange={(weekdays) => update({ weekdays: [...weekdays].sort((a, b) => a - b) })}
        />
        <TextField
          label="Zielzeit (optional)"
          placeholder="z. B. 1:30:00"
          hint="Noch keine Ahnung? Leer lassen – die App schlägt dir nach dem Einstiegstest eine realistische Zielzeit vor."
          value={targetText}
          onChange={(e) => {
            setTargetText(e.target.value)
            update({ targetTimeSec: parseDuration(e.target.value) })
          }}
        />
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
