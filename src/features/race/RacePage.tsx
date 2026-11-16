import { useState } from 'react'
import { Link } from 'react-router'
import { FlagIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { HYROX_STATION_LABELS } from '@/data/exercises/vocabulary'
import {
  adjustPlanStart,
  daysUntil,
  PHASE_LABELS,
  planStartFor,
  raceTimeline,
  raceWeekOf,
  type RacePhase,
} from '@/domain/race/phases'
import { canEnterResult, defaultRaceInput, type Race, type RaceInput } from '@/domain/race/race'
import {
  RACE_SESSION_LABELS,
  raceWeekContext,
  raceWeekSessions,
  raceWeekWhy,
} from '@/domain/race/sessions'
import { RACE_FORMAT_HINTS, variantLabel, weightSets } from '@/domain/race/variant'
import { STATIONS } from '@/domain/simulation/formats'
import { formatLongDay, formatShortDay, formatWeek } from '@/features/calendar/format'
import { INTENSITY_LABELS } from '@/features/generator/labels'
import { useProfileDetails } from '@/features/profile/useProfile'
import { cn } from '@/lib/cn'
import { toLocalIsoDate } from '@/lib/date'
import { formatDurationClock } from '@/lib/time'
import { countdownLabel } from './format'
import { LearnCards } from './LearnCards'
import { RaceForm } from './RaceForm'
import { CompletedRace, RaceResultForm } from './RaceResult'
import { RaceTargetCard } from './RaceTargetCard'
import { useActiveRace, useCancelRace, useCreateRace, useUpdateRace } from './useRace'

/** Farbe je Phase – harte Phasen im HYROX-Gelb, ruhige gedämpft. */
const PHASE_TONE: Record<RacePhase, 'neutral' | 'accent' | 'hyrox'> = {
  base: 'accent',
  build: 'hyrox',
  deload: 'neutral',
  taper: 'accent',
  race: 'hyrox',
  recovery: 'neutral',
}

/** Wettkampfvorbereitung (`/race`, docs/RACE_PREP.md). */
export function RacePage() {
  const [today] = useState(() => toLocalIsoDate())
  const race = useActiveRace()
  // Nach einem abgeschlossenen Wettkampf: „Neuen Wettkampf anlegen“
  const [newRace, setNewRace] = useState(false)

  return (
    <>
      <PageHeader title="Wettkampf" subtitle="Gezielt auf deinen HYROX hin trainieren" />
      {race.isPending ? (
        <div role="status" className="flex justify-center py-12">
          <Spinner className="text-accent" />
        </div>
      ) : race.isError ? (
        <EmptyState icon={FlagIcon} title="Wettkampf konnte nicht geladen werden">
          <Button variant="secondary" className="mt-4" onClick={() => void race.refetch()}>
            Erneut versuchen
          </Button>
        </EmptyState>
      ) : race.data?.status === 'completed' && !newRace ? (
        <CompletedRace race={race.data} onNewRace={() => setNewRace(true)} />
      ) : race.data?.status === 'active' ? (
        <RaceOverview race={race.data} today={today} />
      ) : (
        <NewRace today={today} />
      )}
    </>
  )
}

function NewRace({ today }: { today: string }) {
  const details = useProfileDetails()
  const create = useCreateRace()

  if (details.isPending) {
    return (
      <div role="status" className="flex justify-center py-12">
        <Spinner className="text-accent" />
      </div>
    )
  }
  const profile = details.data?.profile
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2 text-sm text-fg-muted">
        <p className="font-semibold text-fg">So funktioniert’s</p>
        <p>
          Trag Datum und Art deines Wettkampfs ein. Die App teilt die Zeit bis dahin in Phasen –
          Aufbau, Spezifisch, Entlastung, Tapering und Wettkampfwoche – und zeigt dir, worauf es in
          jeder Woche ankommt.
        </p>
      </Card>
      {create.isError && (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          Der Wettkampf konnte nicht gespeichert werden. Bitte versuche es erneut.
        </p>
      )}
      <RaceForm
        initial={defaultRaceInput(today, {
          trainingDaysPerWeek: profile?.training_days_per_week,
          preferredWeekdays: profile?.preferred_weekdays,
        })}
        today={today}
        editing={false}
        saving={create.isPending}
        saveLabel="Wettkampf anlegen"
        onSave={(input) => create.mutate({ input, planStart: planStartFor(today) })}
      />
    </div>
  )
}

function RaceOverview({ race, today }: { race: Race; today: string }) {
  const [editing, setEditing] = useState(false)
  const update = useUpdateRace()
  const cancel = useCancelRace()

  if (editing) {
    return (
      <div className="flex flex-col gap-4">
        {update.isError && (
          <p
            role="alert"
            className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
          >
            Die Änderungen konnten nicht gespeichert werden. Bitte versuche es erneut.
          </p>
        )}
        <RaceForm
          initial={toInput(race)}
          today={today}
          editing
          saving={update.isPending}
          saveLabel="Änderungen speichern"
          onCancel={() => setEditing(false)}
          onSave={(input) =>
            update.mutate(
              { id: race.id, input, planStart: adjustPlanStart(race.planStart, input.raceDate) },
              { onSuccess: () => setEditing(false) },
            )
          }
        />
      </div>
    )
  }

  const timeline = raceTimeline(race)
  const current = raceWeekOf(timeline, today)
  const days = daysUntil(race.raceDate, today)
  const context = raceWeekContext(timeline, today)
  const sessions = context ? raceWeekSessions(context, race, 60) : []
  const why = raceWeekWhy(race, today) ?? []

  return (
    <div className="flex flex-col gap-4">
      <Card className="relative flex flex-col gap-1 overflow-hidden border-hyrox/30 shadow-raised">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-hyrox/15 blur-3xl"
        />
        <p className="relative text-sm text-fg-muted">
          {race.name} · {formatLongDay(race.raceDate)}
        </p>
        <p className="relative font-display text-5xl leading-none font-bold uppercase">
          {countdownLabel(days)}
        </p>
        <p className="relative text-sm text-fg-muted">
          {variantLabel(race)}
          {race.targetTimeSec !== null && ` · Ziel ${formatDurationClock(race.targetTimeSec)}`}
        </p>
      </Card>

      {canEnterResult(race, today) && <RaceResultForm race={race} today={today} />}

      {cancel.isError && (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.
        </p>
      )}

      <Card className="flex flex-col gap-2">
        <h2 className="eyebrow">Diese Woche</h2>
        {current ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={PHASE_TONE[current.phase]}>{PHASE_LABELS[current.phase]}</Badge>
              {current.number !== null && (
                <span className="text-sm text-fg-muted">
                  Woche {current.number} von {current.total}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold">Warum diese Woche?</p>
              {why.map((line) => (
                <p key={line} className="text-fg-muted">
                  {line}
                </p>
              ))}
            </div>
            {sessions.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {sessions.map((session, index) => (
                  <li key={`${session.type}-${index}`} className="flex justify-between gap-3">
                    <span>{RACE_SESSION_LABELS[session.type]}</span>
                    <span className="text-fg-muted">{INTENSITY_LABELS[session.intensity]}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : timeline[0] && today < timeline[0].weekStart ? (
          <p className="text-sm text-fg-muted">
            Dein Plan startet am {formatShortDay(timeline[0].weekStart)}. Bis dahin trainierst du
            wie gewohnt.
          </p>
        ) : (
          <p className="text-sm text-fg-muted">
            Der Wettkampf liegt hinter dir. Trag oben dein Ergebnis ein – danach plant die App
            wieder normal.
          </p>
        )}
        <Link
          to="/calendar"
          className="inline-flex min-h-11 items-center self-start text-sm font-medium text-accent"
        >
          Im Kalender „Woche planen“ bzw. „neu planen“ →
        </Link>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="eyebrow">Dein Plan</h2>
        <ol className="flex flex-col gap-1.5">
          {timeline.map((week) => {
            const isCurrent = week.weekStart === current?.weekStart
            const isPast = week.weekStart < (current?.weekStart ?? today) && !isCurrent
            return (
              <li
                key={week.weekStart}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl px-3 py-2',
                  isCurrent ? 'bg-surface-high ring-1 ring-accent/40' : isPast && 'opacity-55',
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {week.number === null ? 'Danach' : `Woche ${week.number}`}
                    {isCurrent && <span className="ml-2 text-xs text-accent">Jetzt</span>}
                  </p>
                  <p className="truncate text-xs text-fg-muted">{formatWeek(week.weekStart)}</p>
                </div>
                <Badge tone={PHASE_TONE[week.phase]}>{PHASE_LABELS[week.phase]}</Badge>
              </li>
            )
          })}
        </ol>
      </Card>

      <RaceTargetCard race={race} today={today} />

      <LearnCards race={race} today={today} />

      <WeightsCard race={race} />

      <Button variant="secondary" onClick={() => setEditing(true)}>
        Wettkampf bearbeiten
      </Button>
      <Button
        variant="ghost"
        loading={cancel.isPending}
        onClick={() => {
          if (window.confirm('Wettkampf absagen? Danach plant die App wieder normal.')) {
            cancel.mutate(race.id)
          }
        }}
      >
        Wettkampf absagen
      </Button>
    </div>
  )
}

function WeightsCard({ race }: { race: Race }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="eyebrow">Stationen und Gewichte</h2>
      <p className="text-sm text-fg-muted">{RACE_FORMAT_HINTS[race.format]}</p>
      {weightSets(race).map((set) => (
        <div key={set.division} className="flex flex-col gap-1">
          {set.label && <p className="text-sm font-semibold">{set.label}</p>}
          <ul className="divide-y divide-line text-sm">
            {STATIONS.map((station) => (
              <li key={station.station} className="flex justify-between gap-3 py-1.5">
                <span>
                  {HYROX_STATION_LABELS[station.station]}
                  <span className="text-fg-muted">
                    {' · '}
                    {station.reps !== undefined ? `${station.reps} Wdh.` : `${station.distanceM} m`}
                  </span>
                </span>
                <span className="text-right font-semibold">
                  {station.weightKg
                    ? `${station.weightNote === 'je Hand' ? '2 × ' : ''}${station.weightKg[set.division]} kg`
                    : '–'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {race.format === 'double' && race.gender === 'mixed' && (
        <p className="text-xs text-fg-muted/80">
          Mixed Doubles: laut gängigen Übersichten mit den Gewichten der Männer – prüfe das im
          Athletenguide deines Events.
        </p>
      )}
      <p className="text-xs text-fg-muted/80">
        Sled-Gewichte inklusive Schlitten. Quelle: offizielles HYROX-Regelwerk 2025/26.
      </p>
    </Card>
  )
}

function toInput(race: Race): RaceInput {
  return {
    name: race.name,
    raceDate: race.raceDate,
    format: race.format,
    category: race.category,
    gender: race.gender,
    daysPerWeek: race.daysPerWeek,
    weekdays: race.weekdays,
    targetTimeSec: race.targetTimeSec,
  }
}
