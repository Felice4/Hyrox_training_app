import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeftIcon, TargetIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import { getLibraryExercise } from '@/data/exercises'
import { MILESTONE_AREA_LABELS } from '@/data/skills'
import {
  resolvedProgress,
  type MilestoneData,
  type MilestoneUnit,
  type ResolvedMilestone,
} from '@/domain/skills/milestones'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { describeMetric, describeMilestoneProgress, formatMilestoneValue } from './format'
import { parseTargetInput } from './milestoneForm'
import { ProgressBar } from './parts'
import { useMilestoneData } from './useMilestoneData'
import { useDeleteCustomMilestone, usePatchMilestone } from './useUserMilestones'

const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
})

/** Hand-Eintrag wird in der Einheit des Meilensteins geprüft. */
const MANUAL_KIND = { reps: 'max_reps', kg: 'max_weight', sec: 'best_time' } as const
const MANUAL_HINT: Record<MilestoneUnit, string> = {
  reps: 'Wiederholungen am Stück, z. B. 40',
  kg: 'Maximalgewicht in kg, z. B. 140',
  sec: 'Zeit als m:ss oder h:mm:ss, z. B. 3:42',
}

export function MilestoneDetailPage() {
  const { key = '' } = useParams()
  const milestoneData = useMilestoneData()
  const milestone = milestoneData.milestones?.find((m) => m.key === key)

  return (
    <>
      <Link
        to="/goals?tab=milestones"
        className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-fg-muted hover:text-fg"
      >
        <ChevronLeftIcon width={18} height={18} /> Meilensteine
      </Link>
      {milestoneData.isPending ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : milestoneData.isError || !milestoneData.data ? (
        <Card className="flex flex-col items-start gap-3 text-sm text-fg-muted">
          Der Meilenstein konnte nicht geladen werden.
          <Button variant="secondary" onClick={milestoneData.refetch}>
            Erneut versuchen
          </Button>
        </Card>
      ) : !milestone ? (
        <EmptyState icon={TargetIcon} title="Meilenstein nicht gefunden">
          <Link to="/goals?tab=milestones" className="text-accent">
            Zur Übersicht
          </Link>
        </EmptyState>
      ) : (
        <MilestoneContent milestone={milestone} data={milestoneData.data} />
      )}
    </>
  )
}

function MilestoneContent({
  milestone,
  data,
}: {
  milestone: ResolvedMilestone
  data: MilestoneData
}) {
  const { catalog } = useExerciseCatalog()
  const patch = usePatchMilestone()
  const remove = useDeleteCustomMilestone()
  const navigate = useNavigate()
  const progress = resolvedProgress(milestone, data)
  const definition = milestone.definition

  const nameOf = (slug: string) =>
    catalog.data?.exercises.find((e) => e.slug === slug)?.name ??
    getLibraryExercise(slug)?.name ??
    slug

  function resetCount() {
    if (
      !window.confirm(
        `„${definition.name}" ab heute neu zählen? Ältere Trainings und Bestleistungen zählen für diesen Meilenstein dann nicht mehr (in der Statistik bleiben sie erhalten).`,
      )
    ) {
      return
    }
    patch.mutate({
      milestone,
      patch: { countedFrom: new Date().toISOString(), manual: null },
    })
  }

  return (
    <>
      <PageHeader title={definition.name} subtitle={MILESTONE_AREA_LABELS[definition.area]} />
      <div className="mb-4 flex flex-wrap gap-2">
        {!milestone.builtin && <Badge>Eigener Meilenstein</Badge>}
        {milestone.customized && <Badge>Geändert</Badge>}
        {milestone.hidden && <Badge>Ausgeblendet</Badge>}
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          {progress.achieved && (
            <p className="font-display text-2xl font-bold text-hyrox uppercase">🏅 Geschafft!</p>
          )}
          <ProgressBar
            ratio={progress.ratio}
            tone={progress.achieved ? 'done' : 'accent'}
            label={`${definition.name}: ${Math.round(progress.ratio * 100)} %`}
          />
          <p className="font-semibold">{describeMilestoneProgress(progress)}</p>
          <p className="text-sm text-fg-muted">{describeMetric(definition.metric, nameOf)}</p>
          {milestone.countedFrom && (
            <p className="text-sm text-fg-muted">
              Zählt ab {dateFormat.format(new Date(milestone.countedFrom))} – ältere Werte bleiben
              unberücksichtigt.
            </p>
          )}
          {milestone.customized && milestone.original && (
            <p className="text-xs text-fg-muted">Standard: {milestone.original.name}</p>
          )}
          {progress.missingBodyWeight && (
            <Link to="/stats?tab=body" className="text-sm font-medium text-accent">
              Körpergewicht eintragen →
            </Link>
          )}
        </Card>

        <ManualEntry milestone={milestone} unit={progress.unit} />

        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-fg-muted uppercase">Anpassen</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/goals/milestones/${milestone.key}/edit`}
              className="inline-flex min-h-12 items-center rounded-xl border border-line bg-surface-raised px-5 font-semibold hover:bg-line"
            >
              {milestone.builtin ? 'Name und Ziel ändern' : 'Bearbeiten'}
            </Link>
            <Button variant="secondary" loading={patch.isPending} onClick={resetCount}>
              Ab heute neu zählen
            </Button>
            <Button
              variant="secondary"
              disabled={patch.isPending}
              onClick={() => patch.mutate({ milestone, patch: { hidden: !milestone.hidden } })}
            >
              {milestone.hidden ? 'Wieder einblenden' : 'Ausblenden'}
            </Button>
            {milestone.builtin && (milestone.customized || milestone.countedFrom) && (
              <Button
                variant="ghost"
                disabled={patch.isPending}
                onClick={() => {
                  if (window.confirm('Name, Ziel und Zählbeginn auf den Standard zurücksetzen?')) {
                    patch.mutate({
                      milestone,
                      patch: { name: null, metric: null, countedFrom: null },
                    })
                  }
                }}
              >
                Standard wiederherstellen
              </Button>
            )}
            {!milestone.builtin && (
              <Button
                variant="ghost"
                loading={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Meilenstein „${definition.name}" löschen?`)) {
                    remove.mutate(milestone.key, {
                      onSuccess: () => void navigate('/goals?tab=milestones'),
                    })
                  }
                }}
              >
                Löschen
              </Button>
            )}
          </div>
          {(patch.isError || remove.isError) && (
            <p role="alert" className="text-sm text-danger">
              Speichern fehlgeschlagen. Bitte versuche es erneut.
            </p>
          )}
        </Card>
      </div>
    </>
  )
}

/** Stand von Hand eintragen, z. B. nach einem Test außerhalb der App. */
function ManualEntry({ milestone, unit }: { milestone: ResolvedMilestone; unit: MilestoneUnit }) {
  const patch = usePatchMilestone()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | undefined>()

  function submit() {
    const value = parseTargetInput(MANUAL_KIND[unit], input)
    if (value === null) {
      setError(`Ungültig – ${MANUAL_HINT[unit]}.`)
      return
    }
    setError(undefined)
    patch.mutate(
      { milestone, patch: { manual: { value, at: new Date().toISOString() } } },
      { onSuccess: () => setInput('') },
    )
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">Stand von Hand eintragen</h2>
        <p className="text-sm text-fg-muted">
          Zum Beispiel nach einem Test außerhalb der App. Es zählt immer der bessere Wert aus
          Training und Hand-Eintrag.
        </p>
      </div>
      {milestone.manual && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            Eingetragen: <strong>{formatMilestoneValue(milestone.manual.value, unit)}</strong> am{' '}
            {dateFormat.format(new Date(milestone.manual.at))}
          </span>
          <Button
            variant="ghost"
            className="min-h-10 px-3 text-sm"
            disabled={patch.isPending}
            onClick={() => patch.mutate({ milestone, patch: { manual: null } })}
          >
            Entfernen
          </Button>
        </div>
      )}
      <form
        className="flex flex-col items-start gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="w-full">
          <TextField
            label={unit === 'sec' ? 'Zeit' : unit === 'kg' ? 'Gewicht (kg)' : 'Wiederholungen'}
            inputMode={unit === 'sec' ? 'text' : 'decimal'}
            placeholder={unit === 'sec' ? 'm:ss' : undefined}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            error={error}
            hint={MANUAL_HINT[unit]}
          />
        </div>
        <Button type="submit" loading={patch.isPending} disabled={input.trim() === ''}>
          Speichern
        </Button>
      </form>
    </Card>
  )
}
