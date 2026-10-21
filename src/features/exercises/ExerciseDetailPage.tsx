import type { ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { BookIcon, ChevronLeftIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  HYROX_STATION_LABELS,
  MEASUREMENT_LABELS,
  MOVEMENT_PATTERN_LABELS,
  MUSCLE_GROUP_LABELS,
  PREFERENCE_LABELS,
  STRESS_REGION_LABELS,
  TRAINING_TYPE_LABELS,
} from '@/data/exercises/vocabulary'
import { describeLoad } from './format'
import { useExerciseCatalog } from './useExerciseCatalog'

/** Rücksprung zur Liste mit den zuletzt gewählten Filtern (falls von dort gekommen). */
function getBackTarget(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'backTo' in state) {
    const backTo = state.backTo
    if (typeof backTo === 'string' && (backTo.startsWith('/exercises') || backTo === '/training')) {
      return backTo
    }
  }
  return '/exercises'
}

export function ExerciseDetailPage() {
  const { slug } = useParams()
  const location = useLocation()
  const { catalog } = useExerciseCatalog()
  const backTo = getBackTarget(location.state)

  const backLink = (
    <Link
      to={backTo}
      className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
    >
      <ChevronLeftIcon width={18} height={18} />
      {backTo === '/training' ? 'Training' : 'Übungen'}
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
  const exercise = exercises.find((e) => e.slug === slug)

  if (!exercise) {
    return (
      <>
        {backLink}
        <EmptyState icon={BookIcon} title="Übung nicht gefunden">
          {catalog.isError
            ? 'Die Übungen konnten nicht geladen werden.'
            : 'Diese Übung gibt es (nicht mehr) in deiner Bibliothek.'}
        </EmptyState>
      </>
    )
  }

  const alternatives = exercise.alternatives
    .map((altSlug) => exercises.find((e) => e.slug === altSlug))
    .filter((alt) => alt !== undefined)

  return (
    <article>
      {backLink}

      <header className="mb-5">
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge tone="accent">{CATEGORY_LABELS[exercise.category]}</Badge>
          {exercise.hyroxStation && (
            <Badge tone="hyrox">Station: {HYROX_STATION_LABELS[exercise.hyroxStation]}</Badge>
          )}
          <Badge>{DIFFICULTY_LABELS[exercise.difficulty]}</Badge>
          {exercise.source === 'custom' && <Badge>Eigene Übung</Badge>}
          {exercise.preference !== 'neutral' && (
            <Badge>{PREFERENCE_LABELS[exercise.preference]}</Badge>
          )}
        </div>
        <h1 className="font-display text-4xl leading-tight font-bold tracking-wide uppercase">
          {exercise.name}
        </h1>
        <p className="mt-2 text-fg-muted">{exercise.description}</p>
      </header>

      <div className="flex flex-col gap-4">
        <Section title="Ausführung">
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

        <Section title="Empfohlene Belastung">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {describeLoad(exercise.loadParams).map((line) => (
              <div key={line.label}>
                <dt className="text-xs text-fg-muted">{line.label}</dt>
                <dd className="font-display text-2xl font-semibold">{line.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-fg-muted">
            Erfassung: {MEASUREMENT_LABELS[exercise.measurement]}. Der Trainingsgenerator wählt
            konkrete Werte passend zu Ziel und Tagesform.
          </p>
        </Section>

        <Section title="Muskeln">
          <TagList
            label="Hauptsächlich"
            items={exercise.primaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m])}
            highlight
          />
          {exercise.secondaryMuscles.length > 0 && (
            <TagList
              label="Unterstützend"
              items={exercise.secondaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m])}
            />
          )}
        </Section>

        <Section title="Details">
          <TagList
            label="Geräte"
            items={
              exercise.equipment.length > 0
                ? exercise.equipment.map((e) => EQUIPMENT_LABELS[e])
                : ['Ohne Geräte']
            }
          />
          <TagList
            label="Trainingsziele"
            items={exercise.trainingTypes.map((t) => TRAINING_TYPE_LABELS[t])}
          />
          <TagList
            label="Bewegungsmuster"
            items={[MOVEMENT_PATTERN_LABELS[exercise.movementPattern]]}
          />
          {exercise.stressRegions.length > 0 && (
            <TagList
              label="Belastet besonders"
              items={exercise.stressRegions.map((r) => STRESS_REGION_LABELS[r])}
            />
          )}
        </Section>

        {alternatives.length > 0 && (
          <Section title="Alternativen">
            <ul className="flex flex-col gap-2">
              {alternatives.map((alt) => (
                <li key={alt.slug}>
                  <Link
                    to={`/exercises/${alt.slug}`}
                    state={{ backTo }}
                    className="flex min-h-12 items-center justify-between rounded-xl bg-surface-raised px-4 hover:bg-line"
                  >
                    <span>{alt.name}</span>
                    <span className="text-xs text-fg-muted">{CATEGORY_LABELS[alt.category]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </article>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-fg-muted uppercase">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </Card>
  )
}

function TagList({
  label,
  items,
  highlight = false,
}: {
  label: string
  items: string[]
  highlight?: boolean
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-fg-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} tone={highlight ? 'accent' : 'neutral'}>
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}
