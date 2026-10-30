import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MultiChoiceChips, SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { Stepper } from '@/components/ui/Stepper'
import {
  EQUIPMENT_LABELS,
  HYROX_STATIONS,
  HYROX_STATION_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type Equipment,
} from '@/data/exercises/vocabulary'
import { FOCUSES, INTENSITIES, type ReadinessInput, type WorkoutRequest } from '@/domain/generator'
import { readinessScore, readinessStatus } from '@/domain/readiness/readiness'
import { FOCUS_LABELS, INTENSITY_LABELS, READINESS_LABELS } from './labels'

type QuickReadiness = keyof typeof READINESS_LABELS

const FOCUS_OPTIONS = FOCUSES.map((f) => ({ value: f, label: FOCUS_LABELS[f] }))
const INTENSITY_OPTIONS = INTENSITIES.map((i) => ({ value: i, label: INTENSITY_LABELS[i] }))
const READINESS_OPTIONS = (Object.keys(READINESS_LABELS) as QuickReadiness[]).map((r) => ({
  value: r,
  label: READINESS_LABELS[r],
}))
const MUSCLE_OPTIONS = MUSCLE_GROUPS.map((m) => ({ value: m, label: MUSCLE_GROUP_LABELS[m] }))
const STATION_OPTIONS = HYROX_STATIONS.map((s) => ({ value: s, label: HYROX_STATION_LABELS[s] }))

interface GeneratorFormProps {
  initial: WorkoutRequest
  /** Geräte laut Profil – nur diese können „heute nicht verfügbar" sein */
  profileEquipment: readonly Equipment[]
  onSubmit: (request: WorkoutRequest) => void
  /** Check-in von heute – ersetzt die Schnellauswahl, solange er gewählt ist */
  checkin?: ReadinessInput | undefined
}

export function GeneratorForm({
  initial,
  profileEquipment,
  onSubmit,
  checkin,
}: GeneratorFormProps) {
  const [request, setRequest] = useState<WorkoutRequest>(initial)
  const [showMore, setShowMore] = useState(
    (initial.targetMuscles?.length ?? 0) > 0 ||
      (initial.hyroxStations?.length ?? 0) > 0 ||
      (initial.unavailableEquipment?.length ?? 0) > 0,
  )
  const update = (patch: Partial<WorkoutRequest>) => setRequest((r) => ({ ...r, ...patch }))
  const readiness: QuickReadiness =
    request.readiness?.kind === 'quick' ? request.readiness.level : 'normal'
  const showStations = request.focus === 'hyrox' || request.focus === 'mixed'

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-6">
        <SingleChoiceChips
          label="Schwerpunkt"
          options={FOCUS_OPTIONS}
          value={request.focus}
          onChange={(focus) => update({ focus })}
        />
        <Stepper
          label="Dauer"
          value={request.durationMin}
          onChange={(durationMin) => update({ durationMin })}
          min={20}
          max={150}
          step={5}
          unit="min"
        />
        {request.focus !== 'recovery' && (
          <SingleChoiceChips
            label="Intensität"
            options={INTENSITY_OPTIONS}
            value={request.intensity}
            onChange={(intensity) => update({ intensity })}
          />
        )}
        {request.readiness?.kind === 'checkin' ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-fg-muted">Tagesform</p>
            <p>
              Aus deinem Check-in:{' '}
              <span className="font-semibold">
                {readinessStatus(readinessScore(request.readiness)).label} (
                {String(readinessScore(request.readiness)).replace('.', ',')} / 5)
              </span>
            </p>
            <button
              type="button"
              className="min-h-11 self-start text-sm text-fg-muted underline"
              onClick={() => update({ readiness: { kind: 'quick', level: 'normal' } })}
            >
              Stattdessen Schnellauswahl
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <SingleChoiceChips
              label="Wie fühlst du dich heute?"
              options={READINESS_OPTIONS}
              value={readiness}
              onChange={(level) => update({ readiness: { kind: 'quick', level } })}
            />
            {checkin && (
              <button
                type="button"
                className="min-h-11 self-start text-sm text-accent"
                onClick={() => update({ readiness: checkin })}
              >
                Check-in von heute verwenden
              </button>
            )}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-6">
        <button
          type="button"
          className="-m-2 flex min-h-11 items-center justify-between rounded-lg p-2 text-left font-semibold"
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
        >
          Weitere Optionen
          <span className="text-sm font-normal text-fg-muted">
            {showMore ? 'Ausblenden' : 'Anzeigen'}
          </span>
        </button>
        {showMore && (
          <>
            <MultiChoiceChips
              label="Bestimmte Muskelgruppen (optional)"
              options={MUSCLE_OPTIONS}
              values={request.targetMuscles ?? []}
              onChange={(targetMuscles) => update({ targetMuscles })}
            />
            {showStations && (
              <MultiChoiceChips
                label="Bestimmte HYROX-Stationen (optional)"
                options={STATION_OPTIONS}
                values={request.hyroxStations ?? []}
                onChange={(hyroxStations) => update({ hyroxStations })}
              />
            )}
            <MultiChoiceChips
              label="Heute nicht verfügbar"
              hint="z. B. Schlitten belegt oder SkiErg defekt"
              options={profileEquipment.map((e) => ({ value: e, label: EQUIPMENT_LABELS[e] }))}
              values={request.unavailableEquipment ?? []}
              onChange={(unavailableEquipment) => update({ unavailableEquipment })}
            />
          </>
        )}
      </Card>

      <Button
        fullWidth
        className="min-h-14 text-lg"
        onClick={() =>
          onSubmit({
            ...request,
            // Stationen nur bei HYROX/Mixed sinnvoll
            hyroxStations: showStations ? request.hyroxStations : [],
          })
        }
      >
        Workout erstellen
      </Button>
    </div>
  )
}
