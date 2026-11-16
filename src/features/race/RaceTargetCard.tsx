import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { HYROX_STATION_LABELS } from '@/data/exercises/vocabulary'
import {
  bestRun1k,
  ESTIMATE_WINDOW_DAYS,
  estimateRaceTime,
  targetDiffers,
  targetPlan,
  type RaceEstimate,
} from '@/domain/race/estimate'
import type { Race } from '@/domain/race/race'
import { buildRunTestWorkout } from '@/domain/race/runTest'
import { trainingDivision } from '@/domain/race/sessions'
import { SIMULATION_FORMAT_LABELS } from '@/domain/simulation/formats'
import { createSession } from '@/domain/session/session'
import { formatShortDay } from '@/features/calendar/format'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { useProfileDetails } from '@/features/profile/useProfile'
import { useSimulations } from '@/features/simulation/useSimulations'
import {
  readActiveSession,
  useActiveSessionKey,
  writeActiveSession,
} from '@/features/training/useActiveSession'
import { cn } from '@/lib/cn'
import { addDays } from '@/lib/date'
import { formatDurationClock } from '@/lib/time'
import { formatTimeRange } from './format'
import { useUpdateRace } from './useRace'

const minutes = (sec: number) => `${Math.round(sec / 60)} min`

function sourceText(estimate: RaceEstimate): string {
  const { source } = estimate
  switch (source.kind) {
    case 'run_test':
      return `Aus deiner 1-km-Zeit (${formatDurationClock(source.runSec)}) und Richtwerten für die Stationen – nach der Simulation „Kurz“ wird es genauer.`
    case 'halves':
      return `Aus beiden Hälften der Simulation (zuletzt ${formatShortDay(source.date)}).`
    case 'simulation':
      return `Aus der Simulation ${SIMULATION_FORMAT_LABELS[source.format]} vom ${formatShortDay(source.date)}.`
  }
}

const SCOPE_NOTES: Record<RaceEstimate['scope'], string | null> = {
  race: null,
  team: 'Für euch als Team – vorausgesetzt, ihr seid ähnlich stark und teilt die Stationen.',
  own_legs: 'Nur deine 2 Runden (2 × 1 km + Station) – die Teamzeit hängt von allen vier ab.',
}

/** Einstiegstest, geschätzte Zielzeit und Zieltempo (docs/RACE_PREP.md §6). */
export function RaceTargetCard({ race, today }: { race: Race; today: string }) {
  const navigate = useNavigate()
  const details = useProfileDetails()
  const simulations = useSimulations()
  const { catalog } = useExerciseCatalog()
  const activeKey = useActiveSessionKey()
  const update = useUpdateRace()

  const division = trainingDivision(race, details.data?.profile?.sex)
  const run1k = bestRun1k(details.data?.records ?? [])
  const results = simulations.data ?? []
  const windowStart = addDays(today, -ESTIMATE_WINDOW_DAYS)
  const recentSimulation = results.some((s) => s.startedAt.slice(0, 10) >= windowStart)
  const estimate = estimateRaceTime({
    simulations: results,
    run1kSec: run1k,
    division,
    format: race.format,
    today,
  })
  const target = race.targetTimeSec
  const plan = target === null ? undefined : targetPlan(target, race.format, estimate)

  function startRunTest() {
    if (
      readActiveSession(activeKey) &&
      !window.confirm('Es läuft bereits ein Training. Dieses verwerfen und den Lauftest starten?')
    ) {
      return
    }
    const exercises = catalog.data?.exercises ?? []
    const session = createSession(
      buildRunTestWorkout(),
      new Date().toISOString(),
      () => crypto.randomUUID(),
      (slug) => exercises.find((e) => e.slug === slug)?.measurement ?? 'distance_time',
    )
    writeActiveSession(activeKey, session)
    void navigate('/training/active')
  }

  function adopt(sec: number) {
    update.mutate({
      id: race.id,
      planStart: race.planStart,
      input: {
        name: race.name,
        raceDate: race.raceDate,
        format: race.format,
        category: race.category,
        gender: race.gender,
        daysPerWeek: race.daysPerWeek,
        weekdays: race.weekdays,
        targetTimeSec: sec,
      },
    })
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="eyebrow">Zielzeit und Tempo</h2>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Einstiegstest</p>
        <ul className="flex flex-col gap-2 text-sm">
          <TestStep done={run1k !== null} title="1-km-Lauftest">
            {run1k !== null ? (
              <>
                Bestzeit {formatDurationClock(run1k)} – neu testen, wenn du schneller geworden bist.
              </>
            ) : (
              <>10 min einlaufen, dann 1 km zügig und gleichmäßig auf Zeit.</>
            )}
            <Button
              variant="secondary"
              className="mt-2 self-start"
              disabled={catalog.isPending}
              onClick={startRunTest}
            >
              Lauftest starten
            </Button>
          </TestStep>
          <TestStep done={recentSimulation} title="Simulation „Kurz“">
            8 × 500 m Lauf und halbe Stationen. Steht in Woche 1 auch im Plan.
            <Link
              to="/training/simulation?format=short"
              className="mt-1 inline-flex min-h-11 items-center self-start font-medium text-accent"
            >
              Zur Simulation →
            </Link>
          </TestStep>
        </ul>
      </div>

      {(details.isPending || simulations.isPending) && !estimate ? null : estimate ? (
        <div className="flex flex-col gap-1 rounded-xl bg-surface-high px-4 py-3">
          <p className="text-sm text-fg-muted">Geschätzte Zielzeit</p>
          <p className="font-display text-3xl font-bold">
            {formatTimeRange(estimate.lowSec, estimate.highSec)}
          </p>
          <p className="text-xs text-fg-muted">{sourceText(estimate)}</p>
          {SCOPE_NOTES[estimate.scope] && (
            <p className="text-xs text-fg-muted">{SCOPE_NOTES[estimate.scope]}</p>
          )}
          {(target === null || targetDiffers(target, estimate)) && (
            <Button
              variant="secondary"
              className="mt-2 self-start"
              loading={update.isPending}
              onClick={() => adopt(estimate.centerSec)}
            >
              {formatDurationClock(estimate.centerSec)} als Zielzeit übernehmen
            </Button>
          )}
          {target !== null && targetDiffers(target, estimate) && (
            <p className="text-xs text-fg-muted">
              Deine Zielzeit ({formatDurationClock(target)}) weicht von der Schätzung ab – passe sie
              an, wenn sich deine Form verändert hat.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-fg-muted">
          Nach dem Einstiegstest schätzt die App hier deine Zielzeit. Du kannst sie auch selbst
          unter „Wettkampf bearbeiten“ eintragen.
        </p>
      )}
      {update.isError && (
        <p role="alert" className="text-sm text-danger">
          Die Zielzeit konnte nicht gespeichert werden. Bitte versuche es erneut.
        </p>
      )}

      {plan && target !== null && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Zieltempo für {formatDurationClock(target)}</p>
          <ul className="divide-y divide-line text-sm">
            <Row label="Renntempo" value={`${formatDurationClock(plan.paceSecPerKm)} min/km`} />
            <Row
              label={race.format === 'relay' ? 'Laufen (2 km)' : 'Laufen (8 km)'}
              value={minutes(plan.runSec)}
            />
            <Row label="Roxzone (Wechselwege)" value={minutes(plan.roxzoneSec)} />
            <Row label="Stationen" value={minutes(plan.stationSec)} />
          </ul>
          {plan.stations.length > 0 && (
            <>
              <p className="text-sm font-semibold">Richtzeiten je Station</p>
              <ul className="divide-y divide-line text-sm">
                {plan.stations.map((s) => (
                  <Row
                    key={s.station}
                    label={HYROX_STATION_LABELS[s.station]}
                    value={formatDurationClock(s.sec)}
                  />
                ))}
              </ul>
            </>
          )}
          <p className="text-xs text-fg-muted/80">
            Das Renntempo steht in deinen Kompromiss-Läufen, Laufintervallen und Dauerläufen (nach
            „Woche neu planen“). Richtzeiten sind grobe Anhaltspunkte aus typischen Rennverläufen.
          </p>
        </div>
      )}
      <p className="text-xs text-fg-muted/80">
        Zwischencheck: Nach jeder Simulation im Plan rechnet die App die Schätzung neu. Gezählt
        werden die letzten {ESTIMATE_WINDOW_DAYS / 7} Wochen.
      </p>
    </Card>
  )
}

function TestStep({
  done,
  title,
  children,
}: {
  done: boolean
  title: string
  children: ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          done ? 'bg-accent text-on-accent' : 'border border-line text-fg-muted',
        )}
      >
        {done ? '✓' : ''}
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="font-medium">
          {title}
          <span className="sr-only">{done ? ' – erledigt' : ' – offen'}</span>
        </p>
        <div className="flex flex-col text-fg-muted">{children}</div>
      </div>
    </li>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-3 py-1.5">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </li>
  )
}
