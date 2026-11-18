import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeftIcon, ChevronRightIcon, MoveIcon, SearchIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import {
  MOVEMENT_GROUPS,
  MOVEMENT_GROUP_HINTS,
  MOVEMENT_GROUP_LABELS,
} from '@/data/exercises/vocabulary'
import { exercisesInGroup, isMovementExercise, matchesSearch } from '@/domain/movement/library'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { MovementListItem } from './MovementListItem'
import { useOfflineVideos } from './useMovementVideo'
import { useMovementPlan } from './useMovementPlan'

/** Movement Lab: Übersicht der Gruppen und Suche (docs/MOVEMENT.md). */
export function MovementLabPage() {
  const { catalog, isSyncing } = useExerciseCatalog()
  const exercises = (catalog.data?.exercises ?? []).filter(isMovementExercise)
  const { plan } = useMovementPlan()
  const [query, setQuery] = useState('')
  const selected = plan.items.length
  const searching = query.trim() !== ''
  const matches = exercises
    .filter((e) => matchesSearch(e, query))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

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
        title="Movement Lab"
        subtitle="Mobilität · Bewegung · Koordination – inspiriert von Grapplern, Wrestlern & Boxern"
      />

      <Link
        to="/movement/training"
        className="mb-4 flex min-h-16 items-center gap-4 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-3 transition hover:bg-accent/15"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">Mobility-Einheit starten</span>
          <span className="text-sm text-fg-muted">
            {selected > 0
              ? `${selected} ${selected === 1 ? 'Übung' : 'Übungen'} ausgewählt – anpassen und starten`
              : 'Übungen kombinieren und im Trainingsmodus absolvieren'}
          </span>
        </span>
        <ChevronRightIcon width={20} height={20} className="shrink-0 text-accent" />
      </Link>

      {catalog.isPending ? (
        <div role="status" className="flex flex-col items-center gap-3 py-12 text-fg-muted">
          <Spinner className="text-accent" />
          <span className="text-sm">
            {isSyncing ? 'Bibliothek wird eingerichtet …' : 'Übungen werden geladen …'}
          </span>
        </div>
      ) : catalog.isError ? (
        <p role="alert" className="text-sm text-danger">
          Die Übungen konnten nicht geladen werden. Bitte Internetverbindung prüfen.
        </p>
      ) : (
        <>
          {exercises.length > 0 && (
            <div className="mb-4">
              <TextField
                label="Suchen"
                type="search"
                placeholder="Übung suchen, z. B. Hüfte, Shrimp …"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                trailing={
                  <SearchIcon
                    width={18}
                    height={18}
                    className="mr-3 text-fg-muted"
                    aria-hidden="true"
                  />
                }
              />
            </div>
          )}

          {searching ? (
            <ul className="flex flex-col gap-2" aria-live="polite">
              {matches.map((exercise) => (
                <li key={exercise.id}>
                  <MovementListItem exercise={exercise} backTo="/movement" />
                </li>
              ))}
              {matches.length === 0 && (
                <li className="text-sm text-fg-muted">Keine Übung gefunden.</li>
              )}
            </ul>
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-line">
                {MOVEMENT_GROUPS.map((group) => {
                  const count = exercisesInGroup(exercises, group).length
                  return (
                    <li key={group}>
                      <Link
                        to={`/movement/${group}`}
                        className="group flex min-h-16 items-center gap-4 px-5 py-3 transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface-raised"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                          <MoveIcon width={20} height={20} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="font-medium">{MOVEMENT_GROUP_LABELS[group]}</span>
                          <span className="text-sm text-fg-muted">
                            {count === 1 ? '1 Übung' : `${count} Übungen`} ·{' '}
                            {MOVEMENT_GROUP_HINTS[group]}
                          </span>
                        </span>
                        <ChevronRightIcon
                          width={20}
                          height={20}
                          className="shrink-0 text-fg-muted transition group-hover:translate-x-0.5 group-hover:text-fg"
                        />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </>
      )}

      <OfflineVideosCard />

      <p className="mt-4 text-xs text-fg-muted">
        {exercises.length === 0 &&
          'Das Movement Lab ist noch leer – Übungen kommen nach und nach dazu. '}
        Movement-Übungen kannst du in der Trainingsvorschau ins Warm-up oder Cool-down einbauen. Der
        Trainingsgenerator plant sie nie automatisch ein.
      </p>
    </>
  )
}

/** „Alle Videos offline speichern" – einmal im WLAN, danach laufen sie im Studio ohne Netz. */
function OfflineVideosCard() {
  const { total, cached, saving, failed, saveAll } = useOfflineVideos()
  if (total === 0) return null
  const complete = cached === total
  return (
    <Card className="mt-4 flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">Videos offline</h2>
        <p className="text-sm text-fg-muted">
          {cached === undefined
            ? 'Wird geprüft …'
            : `${cached} von ${total} ${total === 1 ? 'Video' : 'Videos'} auf diesem Gerät gespeichert.`}{' '}
          Angesehene Videos werden automatisch gespeichert.
        </p>
      </div>
      {!complete && (
        <Button variant="secondary" loading={saving} onClick={() => void saveAll()}>
          Alle Videos offline speichern
        </Button>
      )}
      {failed > 0 && (
        <p role="alert" className="text-sm text-danger">
          {failed} {failed === 1 ? 'Video konnte' : 'Videos konnten'} nicht geladen werden. Bitte
          Internetverbindung prüfen und erneut versuchen.
        </p>
      )}
    </Card>
  )
}
