import { Link } from 'react-router'
import { ChevronLeftIcon, ChevronRightIcon, GloveIcon } from '@/components/icons'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { COMBAT_SPORTS, COMBAT_SPORT_LABELS } from '@/data/exercises/vocabulary'
import { drillsForSport } from '@/domain/combat/drills'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { useCombatPlan } from './useCombatPlan'

/** Kampfsport-Bibliothek: Übersicht der Sportarten (docs/COMBAT.md). */
export function CombatLibraryPage() {
  const { catalog, isSyncing } = useExerciseCatalog()
  const exercises = catalog.data?.exercises ?? []
  const { plan } = useCombatPlan()
  const selected = plan.items.length

  return (
    <>
      <Link
        to="/more"
        className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
      >
        <ChevronLeftIcon width={18} height={18} />
        Mehr
      </Link>
      <PageHeader
        title="Kampfsport"
        subtitle="Drills von Grundlagen bis Advanced – und deine eigenen aus Instagram & Co."
      />

      <Link
        to="/combat/training"
        className="mb-4 flex min-h-16 items-center gap-4 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-3 transition hover:bg-accent/15"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">Kampfsport-Training</span>
          <span className="text-sm text-fg-muted">
            {selected > 0
              ? `${selected} ${selected === 1 ? 'Drill' : 'Drills'} ausgewählt – anpassen und starten`
              : 'Drills aus mehreren Sportarten kombinieren und starten'}
          </span>
        </span>
        <ChevronRightIcon width={20} height={20} className="shrink-0 text-accent" />
      </Link>

      {catalog.isPending ? (
        <div role="status" className="flex flex-col items-center gap-3 py-12 text-fg-muted">
          <Spinner className="text-accent" />
          <span className="text-sm">
            {isSyncing ? 'Bibliothek wird eingerichtet …' : 'Drills werden geladen …'}
          </span>
        </div>
      ) : catalog.isError ? (
        <p role="alert" className="text-sm text-danger">
          Die Drills konnten nicht geladen werden. Bitte Internetverbindung prüfen.
        </p>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {COMBAT_SPORTS.map((sport) => {
              const drills = drillsForSport(exercises, sport)
              const own = drills.filter((d) => d.source === 'custom').length
              return (
                <li key={sport}>
                  <Link
                    to={`/combat/${sport}`}
                    className="group flex min-h-16 items-center gap-4 px-5 py-3 transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface-raised"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                      <GloveIcon width={20} height={20} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">{COMBAT_SPORT_LABELS[sport]}</span>
                      <span className="text-sm text-fg-muted">
                        {drills.length} Drills{own > 0 ? ` · ${own} eigene` : ''}
                      </span>
                    </span>
                    <ChevronRightIcon
                      width={20}
                      height={20}
                      className="text-fg-muted transition group-hover:translate-x-0.5 group-hover:text-fg"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <p className="mt-4 text-xs text-fg-muted">
        Drills, die zu mehreren Sportarten passen (z. B. Sprawl), stehen in jeder davon. Der
        Trainingsgenerator plant Kampfsport-Drills nicht automatisch ein.
      </p>
    </>
  )
}
