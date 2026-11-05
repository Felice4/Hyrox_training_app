import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { SelectField } from '@/components/ui/SelectField'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import { MILESTONE_AREA_LABELS, MILESTONE_AREAS, type MilestoneArea } from '@/data/skills'
import { withTarget, type ResolvedMilestone } from '@/domain/skills/milestones'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import {
  CUSTOM_KIND_LABELS,
  CUSTOM_KINDS,
  DEFAULT_AREA,
  draftFromMetric,
  emptyDraft,
  exercisesForKind,
  formatTargetInput,
  parseTargetInput,
  TARGET_HINTS,
  validateDraft,
  type CustomKind,
  type DraftErrors,
  type MilestoneDraft,
} from './milestoneForm'
import { useMilestoneData } from './useMilestoneData'
import { usePatchMilestone, useSaveCustomMilestone } from './useUserMilestones'

/** Neuer eigener Meilenstein (`/goals/milestones/new`) oder Bearbeiten (`…/:key/edit`). */
export function MilestoneFormPage() {
  const { key } = useParams()
  const milestoneData = useMilestoneData()
  const milestone = key ? milestoneData.milestones?.find((m) => m.key === key) : undefined
  const back = key ? `/goals/milestones/${key}` : '/goals?tab=milestones'

  let content
  if (key && milestoneData.isPending) {
    content = (
      <div role="status" className="flex justify-center py-12">
        <Spinner className="text-accent" />
      </div>
    )
  } else if (key && !milestone) {
    content = (
      <Card className="text-sm text-fg-muted">
        Meilenstein nicht gefunden.{' '}
        <Link to="/goals?tab=milestones" className="text-accent">
          Zur Übersicht
        </Link>
      </Card>
    )
  } else if (milestone?.builtin) {
    content = <BuiltinForm milestone={milestone} back={back} />
  } else {
    content = <CustomForm key={milestone?.key ?? 'new'} milestone={milestone} back={back} />
  }

  return (
    <>
      <Link
        to={back}
        className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-fg-muted hover:text-fg"
      >
        <ChevronLeftIcon width={18} height={18} /> Zurück
      </Link>
      <PageHeader title={key ? 'Meilenstein ändern' : 'Eigener Meilenstein'} />
      {content}
    </>
  )
}

/** Standard-Meilenstein: nur Name und Ziel änderbar, die Messung bleibt. */
function BuiltinForm({ milestone, back }: { milestone: ResolvedMilestone; back: string }) {
  const original = milestone.original!
  const metric = milestone.definition.metric
  const patch = usePatchMilestone()
  const navigate = useNavigate()
  const [name, setName] = useState(milestone.definition.name)
  const [target, setTarget] = useState(formatTargetInput(metric))
  const [errors, setErrors] = useState<DraftErrors>({})

  function submit() {
    const trimmed = name.trim()
    const value = parseTargetInput(metric.kind, target)
    const next: DraftErrors = {}
    if (trimmed.length < 3 || trimmed.length > 60) next.name = 'Name mit 3 bis 60 Zeichen.'
    if (value === null) next.target = `Ungültig – ${TARGET_HINTS[metric.kind]}.`
    setErrors(next)
    if (value === null || Object.keys(next).length > 0) return

    const newMetric = withTarget(original.metric, value)
    const sameTarget = JSON.stringify(newMetric) === JSON.stringify(original.metric)
    patch.mutate(
      {
        milestone,
        patch: {
          name: trimmed === original.name ? null : trimmed,
          metric: sameTarget ? null : newMetric,
        },
      },
      { onSuccess: () => void navigate(back) },
    )
  }

  return (
    <Card>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          hint={`Standard: ${original.name}`}
        />
        <TextField
          label="Ziel"
          value={target}
          inputMode={
            metric.kind === 'best_time' || metric.kind === 'hyrox_time' ? 'text' : 'decimal'
          }
          onChange={(e) => setTarget(e.target.value)}
          error={errors.target}
          hint={TARGET_HINTS[metric.kind]}
        />
        <p className="text-sm text-fg-muted">
          Tipp: Passe den Namen an das neue Ziel an, z. B. „50 Wall Balls am Stück".
        </p>
        {patch.isError && (
          <p role="alert" className="text-sm text-danger">
            Speichern fehlgeschlagen. Bitte versuche es erneut.
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={patch.isPending}>
            Speichern
          </Button>
          <Link
            to={back}
            className="inline-flex min-h-12 items-center rounded-xl px-5 font-semibold text-fg-muted hover:bg-surface-raised hover:text-fg"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </Card>
  )
}

function CustomForm({
  milestone,
  back,
}: {
  milestone: ResolvedMilestone | undefined
  back: string
}) {
  const { catalog } = useExerciseCatalog()
  const save = useSaveCustomMilestone()
  const navigate = useNavigate()
  const [id] = useState(() => milestone?.key ?? crypto.randomUUID())
  const [draft, setDraft] = useState<MilestoneDraft>(() =>
    milestone
      ? draftFromMetric(
          milestone.definition.name,
          milestone.definition.area,
          milestone.definition.metric,
        )
      : emptyDraft(),
  )
  const [errors, setErrors] = useState<DraftErrors>({})

  const exercises = (catalog.data?.exercises ?? []).filter((e) => !e.isArchived)
  const options = exercisesForKind(exercises, draft.kind)
  const update = (changes: Partial<MilestoneDraft>) => setDraft((d) => ({ ...d, ...changes }))

  function submit() {
    const result = validateDraft(draft, new Set(exercises.map((e) => e.slug)))
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    save.mutate(
      { id, name: result.name, area: result.area, metric: result.metric },
      { onSuccess: () => void navigate(`/goals/milestones/${id}`) },
    )
  }

  if (catalog.isPending) {
    return (
      <div role="status" className="flex justify-center py-12">
        <Spinner className="text-accent" />
      </div>
    )
  }

  return (
    <Card>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <TextField
          label="Name"
          placeholder="z. B. 100 Wall Balls am Stück"
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          error={errors.name}
        />
        <SelectField<CustomKind>
          label="Was wird gemessen?"
          value={draft.kind}
          options={CUSTOM_KINDS.map((kind) => ({ value: kind, label: CUSTOM_KIND_LABELS[kind] }))}
          onChange={(kind) =>
            update({
              kind,
              area: DEFAULT_AREA[kind],
              target: '',
              exercise: exercisesForKind(exercises, kind).some((e) => e.slug === draft.exercise)
                ? draft.exercise
                : '',
            })
          }
        />
        <div className="flex flex-col gap-1.5">
          <SelectField<string>
            label="Übung"
            value={draft.exercise}
            options={[
              { value: '', label: 'Bitte wählen …' },
              ...options.map((e) => ({ value: e.slug, label: e.name })),
            ]}
            onChange={(exercise) => update({ exercise })}
          />
          {errors.exercise && <p className="text-sm text-danger">{errors.exercise}</p>}
        </div>
        {draft.kind === 'best_time' && (
          <TextField
            label="Strecke (m)"
            inputMode="numeric"
            value={draft.distanceM}
            onChange={(e) => update({ distanceM: e.target.value })}
            error={errors.distanceM}
            hint="Es zählen nur Trainings mit genau dieser Strecke, z. B. 1000."
          />
        )}
        <TextField
          label="Ziel"
          inputMode={draft.kind === 'best_time' ? 'text' : 'decimal'}
          value={draft.target}
          onChange={(e) => update({ target: e.target.value })}
          error={errors.target}
          hint={TARGET_HINTS[draft.kind]}
        />
        <SelectField<MilestoneArea>
          label="Bereich"
          value={draft.area}
          options={MILESTONE_AREAS.map((area) => ({
            value: area,
            label: MILESTONE_AREA_LABELS[area],
          }))}
          onChange={(area) => update({ area })}
        />
        {save.isError && (
          <p role="alert" className="text-sm text-danger">
            Speichern fehlgeschlagen. Bitte versuche es erneut.
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>
            Speichern
          </Button>
          <Link
            to={back}
            className="inline-flex min-h-12 items-center rounded-xl px-5 font-semibold text-fg-muted hover:bg-surface-raised hover:text-fg"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </Card>
  )
}
