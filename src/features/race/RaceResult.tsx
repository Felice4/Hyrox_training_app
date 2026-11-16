import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/TextField'
import { HYROX_STATION_LABELS } from '@/data/exercises/vocabulary'
import { recoveryEnd, RESULT_SPLIT_COUNT, validateResult, type Race } from '@/domain/race/race'
import { raceResultSummary } from '@/domain/race/result'
import { trainingDivision } from '@/domain/race/sessions'
import { variantLabel } from '@/domain/race/variant'
import { buildSegments } from '@/domain/simulation/simulation'
import { formatLongDay, formatShortDay } from '@/features/calendar/format'
import { useProfileDetails } from '@/features/profile/useProfile'
import { formatDurationClock, parseDuration } from '@/lib/time'
import { useCompleteRace } from './useRace'

const signed = (sec: number) => `${sec > 0 ? '+' : '−'}${formatDurationClock(Math.abs(sec))}`

/** Ergebnis eintragen – ab dem Wettkampftag (docs/RACE_PREP.md §7). */
export function RaceResultForm({ race, today }: { race: Race; today: string }) {
  const complete = useCompleteRace()
  const [timeText, setTimeText] = useState('')
  const [withSplits, setWithSplits] = useState(false)
  const [splitTexts, setSplitTexts] = useState<string[]>(() => Array(RESULT_SPLIT_COUNT).fill(''))
  const [showErrors, setShowErrors] = useState(false)

  const segments = buildSegments('full', 'open_men')
  const timeSec = parseDuration(timeText)
  const splits = withSplits
    ? splitTexts.map((t) => (t.trim() === '' ? null : parseDuration(t)))
    : []
  const invalidSplit =
    withSplits && splitTexts.some((t, i) => t.trim() !== '' && splits[i] === null)
  const errors = [
    ...(timeText.trim() !== '' && timeSec === null
      ? ['Die Gesamtzeit hat kein gültiges Format.']
      : []),
    ...(invalidSplit ? ['Eine Zwischenzeit hat kein gültiges Format (z. B. 4:35).'] : []),
    ...validateResult(timeSec, splits),
  ]
  const splitSum = splits.reduce<number>((sum, s) => sum + (s ?? 0), 0)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (errors.length > 0 || timeSec === null) {
      setShowErrors(true)
      return
    }
    complete.mutate({
      raceId: race.id,
      today,
      resultTimeSec: timeSec,
      splits: splits.every((s) => s === null) ? [] : (splits as number[]),
    })
  }

  return (
    <Card className="flex flex-col gap-4 border-hyrox/30">
      <h2 className="eyebrow">Ergebnis eintragen</h2>
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <TextField
          label="Gesamtzeit"
          placeholder="z. B. 1:28:45"
          inputMode="numeric"
          value={timeText}
          onChange={(e) => setTimeText(e.target.value)}
          hint={
            race.format === 'single'
              ? 'Ist sie schneller als deine bisherige HYROX-Bestzeit, wird sie zur neuen Bestzeit im Profil.'
              : 'Die Teamzeit wird gespeichert; die Bestzeit im Profil gilt nur für Singles.'
          }
        />
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-[var(--color-accent)]"
            checked={withSplits}
            onChange={(e) => setWithSplits(e.target.checked)}
          />
          Zwischenzeiten eintragen (optional, aus der Ergebnisliste)
        </label>
        {withSplits && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-fg-muted">
              Wie bei der Simulation: Die Roxzone zählt zum Lauf davor. Format m:ss.
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {segments.map((segment, index) => (
                <TextField
                  key={index}
                  label={segment.label}
                  placeholder="m:ss"
                  inputMode="numeric"
                  value={splitTexts[index] ?? ''}
                  onChange={(e) =>
                    setSplitTexts((texts) =>
                      texts.map((t, i) => (i === index ? e.target.value : t)),
                    )
                  }
                />
              ))}
            </div>
            {splitSum > 0 && (
              <p className="text-sm text-fg-muted">Summe: {formatDurationClock(splitSum)}</p>
            )}
          </div>
        )}
        {showErrors && errors.length > 0 && (
          <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
            <ul className="list-disc pl-5 text-sm">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        {complete.isError && (
          <p role="alert" className="text-sm text-danger">
            Das Ergebnis konnte nicht gespeichert werden. Bitte versuche es erneut.
          </p>
        )}
        <Button type="submit" fullWidth loading={complete.isPending}>
          Ergebnis speichern und Wettkampf abschließen
        </Button>
      </form>
    </Card>
  )
}

/** Abgeschlossener Wettkampf in der Erholungswoche: Ergebnis, Auswertung, Ausblick. */
export function CompletedRace({ race, onNewRace }: { race: Race; onNewRace: () => void }) {
  const details = useProfileDetails()
  const division = trainingDivision(race, details.data?.profile?.sex)
  const summary = raceResultSummary(race, division)
  const best = details.data?.profile?.hyrox_best_time_sec ?? null
  const isBest = race.format === 'single' && summary !== undefined && best === summary.timeSec

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
        <p className="relative font-display text-5xl leading-none font-bold">
          {summary ? formatDurationClock(summary.timeSec) : 'Geschafft'}
        </p>
        <div className="relative flex flex-wrap items-center gap-2 text-sm text-fg-muted">
          <span>{variantLabel(race)}</span>
          {isBest && <Badge tone="hyrox">Neue Bestzeit</Badge>}
        </div>
        {summary?.targetDeltaSec !== undefined && race.targetTimeSec !== null && (
          <p className="relative text-sm">
            Ziel {formatDurationClock(race.targetTimeSec)} ·{' '}
            {summary.targetDeltaSec <= 0 ? (
              <span className="font-semibold text-accent">
                {signed(summary.targetDeltaSec)} schneller als geplant
              </span>
            ) : (
              <span>{signed(summary.targetDeltaSec)} über dem Ziel</span>
            )}
          </p>
        )}
      </Card>

      {summary?.stats && (
        <Card className="flex flex-col gap-2">
          <h2 className="eyebrow">Auswertung</h2>
          <ul className="divide-y divide-line text-sm">
            <Row label="Laufen inkl. Roxzone" value={formatDurationClock(summary.stats.runSec)} />
            {summary.stats.runPacePerKmSec !== undefined && (
              <Row
                label="Ø je km"
                value={`${formatDurationClock(summary.stats.runPacePerKmSec)} min/km`}
              />
            )}
            <Row label="Stationen" value={formatDurationClock(summary.stats.stationSec)} />
            {summary.stats.slowestStation && (
              <Row
                label={`Längste Station: ${HYROX_STATION_LABELS[summary.stats.slowestStation.station]}`}
                value={formatDurationClock(summary.stats.slowestStation.sec)}
              />
            )}
          </ul>
          <p className="text-xs text-fg-muted">
            Die längste Station ist ein guter Schwerpunkt für die nächste Vorbereitung.
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-2 text-sm">
        <h2 className="eyebrow">Wie geht’s weiter?</h2>
        <p>
          Bis {formatShortDay(recoveryEnd(race.raceDate))} plant der Kalender eine{' '}
          <strong>Erholungswoche</strong> mit lockeren Läufen („Woche neu planen“). Danach plant die
          App wieder normal nach deinen Zielen.
        </p>
        <Link
          to="/calendar"
          className="inline-flex min-h-11 items-center self-start font-medium text-accent"
        >
          Zum Kalender →
        </Link>
      </Card>

      <Button variant="secondary" onClick={onNewRace}>
        Neuen Wettkampf anlegen
      </Button>
    </div>
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
