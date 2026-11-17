import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ChevronLeftIcon, GloveIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import {
  COMBAT_LEVEL_LABELS,
  COMBAT_SPORT_LABELS,
  GI_MODE_LABELS,
  MEASUREMENT_LABELS,
} from '@/data/exercises/vocabulary'
import { describeLoad } from '@/features/exercises/format'
import { useSetArchived } from '@/features/exercises/useExerciseActions'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { parseSport } from './format'

const LINK_BUTTON =
  'inline-flex min-h-12 items-center rounded-xl border border-line-strong bg-surface-raised px-5 font-semibold shadow-card transition duration-200 hover:bg-surface-high active:scale-[0.97]'

function backTarget(state: unknown, fallback: string): string {
  if (typeof state === 'object' && state !== null && 'backTo' in state) {
    const backTo = state.backTo
    if (typeof backTo === 'string' && backTo.startsWith('/combat')) return backTo
  }
  return fallback
}

/** Ein Kampfsport-Drill im Detail (`/combat/:sport/drill/:slug`). */
export function CombatDrillPage() {
  const params = useParams()
  const sport = parseSport(params.sport)
  const location = useLocation()
  const navigate = useNavigate()
  const { catalog } = useExerciseCatalog()
  const archive = useSetArchived()
  const sportPath = sport ? `/combat/${sport}` : '/combat'
  const backTo = backTarget(location.state, sportPath)

  const backLink = (
    <Link
      to={backTo}
      className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
    >
      <ChevronLeftIcon width={18} height={18} />
      {sport ? COMBAT_SPORT_LABELS[sport] : 'Kampfsport'}
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

  const drill = catalog.data?.exercises.find(
    (e) => e.slug === params.slug && e.category === 'combat',
  )
  if (!sport || !drill) {
    return (
      <>
        {backLink}
        <EmptyState icon={GloveIcon} title="Drill nicht gefunden">
          {catalog.isError
            ? 'Die Drills konnten nicht geladen werden.'
            : 'Diesen Drill gibt es (nicht mehr) in deiner Bibliothek.'}
        </EmptyState>
      </>
    )
  }

  const isCustom = drill.source === 'custom'

  function archiveDrill() {
    if (!drill) return
    const confirmed = window.confirm(
      `„${drill.name}“ archivieren? Gespeicherte Trainings bleiben unverändert. Du kannst den Drill auf der Seite der Sportart wiederherstellen.`,
    )
    if (!confirmed) return
    archive.mutate(
      { id: drill.id, archived: true },
      { onSuccess: () => void navigate(sportPath, { replace: true }) },
    )
  }

  return (
    <article>
      {backLink}
      <header className="mb-5">
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge tone="accent">{COMBAT_LEVEL_LABELS[drill.difficulty]}</Badge>
          {drill.giMode && <Badge>{GI_MODE_LABELS[drill.giMode]}</Badge>}
          {isCustom && <Badge>Eigener Drill</Badge>}
        </div>
        <h1 className="font-display text-4xl leading-tight font-bold tracking-wide uppercase">
          {drill.name}
        </h1>
        {drill.description && <p className="mt-2 text-fg-muted">{drill.description}</p>}
        <p className="mt-2 text-sm text-fg-muted">
          {drill.combatSports.map((s) => COMBAT_SPORT_LABELS[s]).join(' · ')}
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {drill.instructions.length > 0 && (
          <Section title="Ablauf">
            <ol className="flex flex-col gap-2">
              {drill.instructions.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-raised text-xs font-semibold text-accent">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        <Section title={isCustom ? 'Deine Vorgabe' : 'Empfohlene Dosierung'}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {describeLoad(drill.loadParams).map((line) => (
              <div key={line.label}>
                <dt className="text-xs text-fg-muted">{line.label}</dt>
                <dd className="font-display text-2xl font-semibold">{line.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-fg-muted">
            Erfassung im Training: {MEASUREMENT_LABELS[drill.measurement]}.
          </p>
        </Section>

        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {isCustom ? (
              <>
                <Link to={`${sportPath}/drill/${drill.slug}/edit`} className={LINK_BUTTON}>
                  Bearbeiten
                </Link>
                <Button variant="ghost" loading={archive.isPending} onClick={archiveDrill}>
                  Archivieren
                </Button>
              </>
            ) : (
              <Link to={`${sportPath}/new?from=${drill.slug}`} className={LINK_BUTTON}>
                Als eigenen Drill kopieren
              </Link>
            )}
          </div>
          {!isCustom && (
            <p className="text-xs text-fg-muted">
              Bibliotheks-Drills werden mit App-Updates gepflegt. Als Kopie kannst du Sätze, Zeiten,
              Gewicht und Ablauf frei anpassen.
            </p>
          )}
          {archive.isError && (
            <p role="alert" className="text-sm text-danger">
              Archivieren fehlgeschlagen. Bitte versuche es erneut.
            </p>
          )}
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
