import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import { BookIcon, ChevronLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MultiChoiceChips, SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SelectField } from '@/components/ui/SelectField'
import { Spinner } from '@/components/ui/Spinner'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  HYROX_STATIONS,
  HYROX_STATION_LABELS,
  MEASUREMENTS,
  MEASUREMENT_LABELS,
  MOVEMENT_PATTERNS,
  MOVEMENT_PATTERN_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  STRESS_REGIONS,
  STRESS_REGION_LABELS,
  TRAINING_TYPES,
  TRAINING_TYPE_LABELS,
  type HyroxStation,
} from '@/data/exercises/vocabulary'
import {
  MAIN_LOAD_FIELD,
  MAIN_LOAD_LABEL,
  draftFromExercise,
  draftToExercise,
  emptyDraft,
  newCustomSlug,
  withMeasurement,
  type CustomExerciseDraft,
  type DraftErrors,
} from './customForm'
import { useExerciseCatalog } from './useExerciseCatalog'
import { useCreateCustomExercise, useUpdateCustomExercise } from './useExerciseActions'

const options = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] }))

const MUSCLE_OPTIONS = options(MUSCLE_GROUPS, MUSCLE_GROUP_LABELS)
const EQUIPMENT_OPTIONS = options(EQUIPMENT, EQUIPMENT_LABELS).sort((a, b) =>
  a.label.localeCompare(b.label, 'de'),
)

/**
 * Eigene Übung anlegen (`/exercises/new`, optional `?from=<slug>` als Kopie einer
 * Bibliotheksübung) oder bearbeiten (`/exercises/:slug/edit`).
 */
export function ExerciseFormPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const { catalog } = useExerciseCatalog()
  const copyFrom = params.get('from')

  const backTo = slug ? `/exercises/${slug}` : copyFrom ? `/exercises/${copyFrom}` : '/exercises'
  const backLink = (
    <Link
      to={backTo}
      className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
    >
      <ChevronLeftIcon width={18} height={18} />
      Zurück
    </Link>
  )

  if (catalog.isPending) {
    return (
      <>
        {backLink}
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      </>
    )
  }

  const exercises = catalog.data?.exercises ?? []
  const editing = slug ? exercises.find((e) => e.slug === slug) : undefined
  const source = copyFrom ? exercises.find((e) => e.slug === copyFrom) : undefined

  if (catalog.isError || (slug && (!editing || editing.source !== 'custom'))) {
    return (
      <>
        {backLink}
        <EmptyState icon={BookIcon} title="Übung kann nicht bearbeitet werden">
          {catalog.isError
            ? 'Die Übungen konnten nicht geladen werden.'
            : 'Nur eigene Übungen sind bearbeitbar. Bibliotheksübungen kannst du als eigene kopieren.'}
        </EmptyState>
      </>
    )
  }

  return (
    <>
      {backLink}
      <PageHeader
        title={editing ? 'Übung bearbeiten' : 'Eigene Übung'}
        subtitle={source ? `Kopie von „${source.name}"` : undefined}
      />
      <ExerciseForm
        key={editing?.id ?? source?.id ?? 'neu'}
        editing={editing}
        initial={
          editing
            ? draftFromExercise(editing, false)
            : source
              ? draftFromExercise(source, true)
              : emptyDraft()
        }
      />
    </>
  )
}

function ExerciseForm({
  editing,
  initial,
}: {
  editing: CatalogExercise | undefined
  initial: CustomExerciseDraft
}) {
  const navigate = useNavigate()
  const create = useCreateCustomExercise()
  const update = useUpdateCustomExercise()
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<DraftErrors>({})
  const set = (patch: Partial<CustomExerciseDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const mainField = MAIN_LOAD_FIELD[draft.measurement]
  const busy = create.isPending || update.isPending

  function submit() {
    const slug = editing?.slug ?? newCustomSlug(crypto.randomUUID())
    const result = draftToExercise(draft, slug)
    if (!result.ok) {
      setErrors(result.errors)
      window.scrollTo({ top: 0 })
      return
    }
    setErrors({})
    const done = () => void navigate(`/exercises/${slug}`, { replace: true })
    if (editing) update.mutate({ id: editing.id, exercise: result.exercise }, { onSuccess: done })
    else create.mutate(result.exercise, { onSuccess: done })
  }

  return (
    <div className="flex flex-col gap-4">
      {Object.keys(errors).length > 0 && (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {errors.form ?? 'Bitte die markierten Angaben prüfen.'}
        </p>
      )}

      <Card className="flex flex-col gap-5">
        <TextField
          label="Name"
          value={draft.name}
          maxLength={80}
          error={errors.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <SingleChoiceChips
          label="Kategorie"
          options={options(CATEGORIES, CATEGORY_LABELS)}
          value={draft.category}
          onChange={(category) => set({ category })}
        />
        {draft.category === 'hyrox' && (
          <SelectField<HyroxStation | ''>
            label="HYROX-Station (optional)"
            value={draft.hyroxStation}
            options={[
              { value: '', label: 'Keine' },
              ...options(HYROX_STATIONS, HYROX_STATION_LABELS),
            ]}
            onChange={(hyroxStation) => set({ hyroxStation })}
          />
        )}
        <SingleChoiceChips
          label="Erfassung im Training"
          options={options(MEASUREMENTS, MEASUREMENT_LABELS)}
          value={draft.measurement}
          onChange={(measurement) => setDraft((d) => withMeasurement(d, measurement))}
        />
        <MultiChoiceChips
          label="Trainingsziele"
          options={options(TRAINING_TYPES, TRAINING_TYPE_LABELS)}
          values={draft.trainingTypes}
          error={errors.trainingTypes}
          onChange={(trainingTypes) => set({ trainingTypes })}
        />
        <SelectField
          label="Bewegungsmuster"
          value={draft.movementPattern}
          options={options(MOVEMENT_PATTERNS, MOVEMENT_PATTERN_LABELS)}
          onChange={(movementPattern) => set({ movementPattern })}
        />
        <SingleChoiceChips
          label="Schwierigkeit"
          options={([1, 2, 3] as const).map((value) => ({
            value,
            label: DIFFICULTY_LABELS[value],
          }))}
          value={draft.difficulty}
          onChange={(difficulty) => set({ difficulty })}
        />
      </Card>

      <Card className="flex flex-col gap-5">
        <MultiChoiceChips
          label="Hauptmuskeln"
          options={MUSCLE_OPTIONS}
          values={draft.primaryMuscles}
          error={errors.primaryMuscles}
          onChange={(primaryMuscles) => set({ primaryMuscles })}
        />
        <MultiChoiceChips
          label="Unterstützende Muskeln (optional)"
          options={MUSCLE_OPTIONS.filter((m) => !draft.primaryMuscles.includes(m.value))}
          values={draft.secondaryMuscles}
          onChange={(secondaryMuscles) => set({ secondaryMuscles })}
        />
        <MultiChoiceChips
          label="Geräte"
          hint="Nichts gewählt = ohne Geräte. Der Generator plant die Übung nur, wenn alle gewählten Geräte verfügbar sind."
          options={EQUIPMENT_OPTIONS}
          values={draft.equipment}
          onChange={(equipment) => set({ equipment })}
        />
        <MultiChoiceChips
          label="Belastet besonders (optional)"
          hint="Wird bei Beschwerden in diesen Bereichen gemieden."
          options={options(STRESS_REGIONS, STRESS_REGION_LABELS)}
          values={draft.stressRegions}
          onChange={(stressRegions) => set({ stressRegions })}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="font-semibold">Empfohlene Belastung</h2>
          <p className="text-xs text-fg-muted">
            Bereiche von–bis; der Generator wählt daraus passend zu Ziel und Tagesform.
          </p>
        </div>
        <RangeInput
          label="Sätze"
          unit=""
          value={draft.sets}
          error={errors.sets}
          onChange={(sets) => set({ sets })}
        />
        <RangeInput
          label={MAIN_LOAD_LABEL[mainField].label}
          unit={MAIN_LOAD_LABEL[mainField].unit}
          value={draft.main}
          error={errors.main}
          onChange={(main) => set({ main })}
        />
        <RangeInput
          label="Pause"
          unit="s"
          value={draft.rest}
          error={errors.rest}
          onChange={(rest) => set({ rest })}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <TextArea
          label="Beschreibung (optional)"
          value={draft.description}
          maxLength={400}
          onChange={(e) => set({ description: e.target.value })}
        />
        <TextArea
          label="Ausführung (optional, ein Hinweis pro Zeile)"
          value={draft.instructions}
          rows={4}
          onChange={(e) => set({ instructions: e.target.value })}
        />
      </Card>

      {(create.isError || update.isError) && (
        <p role="alert" className="text-sm text-danger">
          Speichern fehlgeschlagen. Bitte versuche es erneut.
        </p>
      )}
      <Button fullWidth className="min-h-14 text-lg" loading={busy} onClick={submit}>
        {editing ? 'Änderungen speichern' : 'Übung anlegen'}
      </Button>
    </div>
  )
}

function RangeInput({
  label,
  unit,
  value,
  error,
  onChange,
}: {
  label: string
  unit: string
  value: [string, string]
  error: string | undefined
  onChange: (value: [string, string]) => void
}) {
  const trailing = unit ? <span className="pr-3 text-sm text-fg-muted">{unit}</span> : undefined
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextField
        label={`${label} von`}
        inputMode="numeric"
        value={value[0]}
        error={error}
        trailing={trailing}
        onChange={(e) => onChange([e.target.value, value[1]])}
      />
      <TextField
        label="bis"
        inputMode="numeric"
        value={value[1]}
        trailing={trailing}
        onChange={(e) => onChange([value[0], e.target.value])}
      />
    </div>
  )
}
