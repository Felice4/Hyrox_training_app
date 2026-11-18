import type { ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ChevronLeftIcon, MoveIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import {
  COMBAT_SPORT_LABELS,
  DIFFICULTY_LABELS,
  MEASUREMENT_LABELS,
  MOVEMENT_GROUP_LABELS,
} from '@/data/exercises/vocabulary'
import { addExercise } from '@/domain/movement/session'
import { describeLoad } from '@/features/exercises/format'
import { MovementVideo } from './MovementVideo'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { useMovementPlan } from './useMovementPlan'

const LINK_BUTTON =
  'inline-flex min-h-12 items-center rounded-xl border border-line-strong bg-surface-raised px-5 font-semibold shadow-card transition duration-200 hover:bg-surface-high active:scale-[0.97]'

function backTarget(state: unknown, fallback: string): string {
  if (typeof state === 'object' && state !== null && 'backTo' in state) {
    const backTo = state.backTo
    if (typeof backTo === 'string' && backTo.startsWith('/')) return backTo
  }
  return fallback
}

/** Eine Übung des Movement Lab im Detail (`/movement/exercise/:slug`). */
export function MovementExercisePage() {
  const params = useParams()
  const location = useLocation()
  const { catalog } = useExerciseCatalog()
  const { plan, update } = useMovementPlan()

  const exercise = catalog.data?.exercises.find(
    (e) => e.slug === params.slug && e.category === 'movement',
  )
  const fallback = exercise ? `/movement/${exercise.movementGroups[0]}` : '/movement'
  const backTo = backTarget(location.state, fallback)

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

  if (!exercise) {
    return (
      <>
        {backLink}
        <EmptyState icon={MoveIcon} title="Übung nicht gefunden">
          {catalog.isError
            ? 'Die Übungen konnten nicht geladen werden.'
            : 'Diese Übung gibt es (nicht mehr) im Movement Lab.'}
        </EmptyState>
      </>
    )
  }

  return (
    <article>
      {backLink}
      <header className="mb-5">
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge tone="accent">{DIFFICULTY_LABELS[exercise.difficulty]}</Badge>
          {exercise.movementGroups.map((group) => (
            <Badge key={group}>{MOVEMENT_GROUP_LABELS[group]}</Badge>
          ))}
        </div>
        <h1 className="font-display text-4xl leading-tight font-bold tracking-wide uppercase">
          {exercise.name}
        </h1>
        <p className="mt-2 text-fg-muted">{exercise.description}</p>
        {exercise.combatSports.length > 0 && (
          <p className="mt-2 text-sm text-fg-muted">
            Herkunft: {exercise.combatSports.map((s) => COMBAT_SPORT_LABELS[s]).join(' · ')}
          </p>
        )}
      </header>

      <div className="flex flex-col gap-4">
        <MovementVideo slug={exercise.slug} name={exercise.name} />
        <Section title="Ablauf">
          <ol className="flex flex-col gap-2">
            {exercise.instructions.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-raised text-xs font-semibold text-accent">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Empfohlene Dosierung">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {describeLoad(exercise.loadParams).map((line) => (
              <div key={line.label}>
                <dt className="text-xs text-fg-muted">{line.label}</dt>
                <dd className="font-display text-2xl font-semibold">{line.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-fg-muted">
            Erfassung im Training: {MEASUREMENT_LABELS[exercise.measurement]}.
          </p>
        </Section>

        <Card className="flex flex-col gap-3">
          {plan.items.some((item) => item.slug === exercise.slug) ? (
            <Link to="/movement/training" className={LINK_BUTTON}>
              ✓ In der Mobility-Einheit · ansehen
            </Link>
          ) : (
            <Button onClick={() => update((p) => addExercise(p, exercise))}>
              Zur Mobility-Einheit hinzufügen
            </Button>
          )}
          <p className="text-xs text-fg-muted">
            Ins Warm-up oder Cool-down eines Trainings baust du die Übung in der Trainingsvorschau
            über „Movement einbauen“ ein.
          </p>
        </Card>
      </div>
    </article>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 eyebrow">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </Card>
  )
}
