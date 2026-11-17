import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import type { CatalogExercise } from '@/api/exercises'
import { ChevronLeftIcon, GloveIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MultiChoiceChips, SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import {
  COMBAT_LEVEL_LABELS,
  COMBAT_SPORTS,
  COMBAT_SPORT_LABELS,
  GI_MODES,
  GI_MODE_LABELS,
  type CombatSport,
} from '@/data/exercises/vocabulary'
import {
  useCreateCustomExercise,
  useUpdateCustomExercise,
} from '@/features/exercises/useExerciseActions'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import {
  DRILL_MEASUREMENTS,
  DRILL_MEASUREMENT_LABELS,
  draftFromDrill,
  drillDraftToExercise,
  emptyDrillDraft,
  isTimed,
  isWeighted,
  newDrillSlug,
  type CombatDrillDraft,
  type DrillDraftErrors,
} from './drillForm'
import { parseSport } from './format'

/**
 * Eigenen Drill anlegen (`/combat/:sport/new`, optional `?from=<slug>` als Kopie) oder
 * bearbeiten (`/combat/:sport/drill/:slug/edit`).
 */
export function CombatDrillFormPage() {
  const params = useParams()
  const sport = parseSport(params.sport)
  const [search] = useSearchParams()
  const { catalog } = useExerciseCatalog()
  const copyFrom = search.get('from')
  const sportPath = sport ? `/combat/${sport}` : '/combat'

  const backTo = params.slug
    ? `${sportPath}/drill/${params.slug}`
    : copyFrom
      ? `${sportPath}/drill/${copyFrom}`
      : sportPath
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
  const editing = params.slug ? exercises.find((e) => e.slug === params.slug) : undefined
  const source = copyFrom ? exercises.find((e) => e.slug === copyFrom) : undefined
  const invalidEdit =
    params.slug !== undefined &&
    (!editing || editing.source !== 'custom' || editing.category !== 'combat')

  if (!sport || catalog.isError || invalidEdit) {
    return (
      <>
        {backLink}
        <EmptyState icon={GloveIcon} title="Drill kann nicht bearbeitet werden">
          {catalog.isError
            ? 'Die Drills konnten nicht geladen werden.'
            : 'Nur eigene Drills sind bearbeitbar. Bibliotheks-Drills kannst du als eigene kopieren.'}
        </EmptyState>
      </>
    )
  }

  return (
    <>
      {backLink}
      <PageHeader
        title={editing ? 'Drill bearbeiten' : 'Eigener Drill'}
        subtitle={
          source
            ? `Kopie von „${source.name}“`
            : editing
              ? undefined
              : 'Zum Beispiel einen Drill, den du auf Instagram gesehen hast.'
        }
      />
      <DrillForm
        key={editing?.id ?? source?.id ?? 'neu'}
        sport={sport}
        editing={editing}
        initial={
          editing
            ? draftFromDrill(editing, false)
            : source?.category === 'combat'
              ? draftFromDrill(source, true)
              : emptyDrillDraft(sport)
        }
      />
    </>
  )
}

function DrillForm({
  sport,
  editing,
  initial,
}: {
  sport: CombatSport
  editing: CatalogExercise | undefined
  initial: CombatDrillDraft
}) {
  const navigate = useNavigate()
  const create = useCreateCustomExercise()
  const update = useUpdateCustomExercise()
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<DrillDraftErrors>({})
  const set = (patch: Partial<CombatDrillDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const busy = create.isPending || update.isPending

  function submit() {
    const slug = editing?.slug ?? newDrillSlug(crypto.randomUUID())
    const result = drillDraftToExercise(draft, slug)
    if (!result.ok) {
      setErrors(result.errors)
      window.scrollTo({ top: 0 })
      return
    }
    setErrors({})
    // Nach dem Speichern zur Sportart, in der der Drill steht
    const target = draft.sports.includes(sport) ? sport : draft.sports[0]
    const done = () => void navigate(`/combat/${target}/drill/${slug}`, { replace: true })
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
          placeholder="z. B. Slip – Roll – Step-out"
          value={draft.name}
          maxLength={80}
          error={errors.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <MultiChoiceChips
          label="Kampfsportarten"
          hint="Der Drill erscheint in jeder gewählten Sportart."
          options={COMBAT_SPORTS.map((value) => ({ value, label: COMBAT_SPORT_LABELS[value] }))}
          values={draft.sports}
          error={errors.sports}
          onChange={(sports) => set({ sports })}
        />
        {draft.sports.includes('bjj') && (
          <SingleChoiceChips
            label="BJJ: Gi oder NoGi"
            options={GI_MODES.map((value) => ({ value, label: GI_MODE_LABELS[value] }))}
            value={draft.giMode}
            onChange={(giMode) => set({ giMode })}
          />
        )}
        <SingleChoiceChips
          label="Stufe"
          options={([1, 2, 3] as const).map((value) => ({
            value,
            label: COMBAT_LEVEL_LABELS[value],
          }))}
          value={draft.level}
          onChange={(level) => set({ level })}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <SingleChoiceChips
          label="Erfassung im Training"
          options={DRILL_MEASUREMENTS.map((value) => ({
            value,
            label: DRILL_MEASUREMENT_LABELS[value],
          }))}
          value={draft.measurement}
          onChange={(measurement) => set({ measurement })}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Sätze / Runden"
            inputMode="numeric"
            value={draft.sets}
            error={errors.sets}
            onChange={(e) => set({ sets: e.target.value })}
          />
          {isTimed(draft.measurement) ? (
            <TextField
              label="Dauer je Runde"
              placeholder="2:00"
              inputMode="numeric"
              value={draft.duration}
              error={errors.duration}
              trailing={<span className="pr-3 text-sm text-fg-muted">min</span>}
              onChange={(e) => set({ duration: e.target.value })}
            />
          ) : (
            <TextField
              label="Wiederholungen"
              inputMode="numeric"
              value={draft.reps}
              error={errors.reps}
              onChange={(e) => set({ reps: e.target.value })}
            />
          )}
          {isWeighted(draft.measurement) && (
            <TextField
              label="Gewicht"
              placeholder="z. B. 12,5"
              inputMode="decimal"
              value={draft.weightKg}
              error={errors.weightKg}
              trailing={<span className="pr-3 text-sm text-fg-muted">kg</span>}
              onChange={(e) => set({ weightKg: e.target.value })}
            />
          )}
          <TextField
            label="Pause"
            inputMode="numeric"
            value={draft.restSec}
            error={errors.restSec}
            trailing={<span className="pr-3 text-sm text-fg-muted">s</span>}
            onChange={(e) => set({ restSec: e.target.value })}
          />
        </div>
        <p className="text-xs text-fg-muted">
          Diese Werte übernimmt das Kampfsport-Training als Vorgabe; im Training kannst du sie
          anpassen.
        </p>
      </Card>

      <Card className="flex flex-col gap-4">
        <TextArea
          label="Beschreibung (optional)"
          placeholder="Worum geht es bei dem Drill? Woher stammt er?"
          value={draft.description}
          maxLength={400}
          onChange={(e) => set({ description: e.target.value })}
        />
        <TextArea
          label="Ablauf (optional, ein Schritt pro Zeile)"
          value={draft.instructions}
          rows={5}
          onChange={(e) => set({ instructions: e.target.value })}
        />
      </Card>

      {(create.isError || update.isError) && (
        <p role="alert" className="text-sm text-danger">
          Speichern fehlgeschlagen. Bitte versuche es erneut.
        </p>
      )}
      <Button fullWidth className="min-h-14 text-lg" loading={busy} onClick={submit}>
        {editing ? 'Änderungen speichern' : 'Drill anlegen'}
      </Button>
    </div>
  )
}
