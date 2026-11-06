import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { OptionCards } from '@/components/ui/OptionCards'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  DIVISION_LABELS,
  DIVISIONS,
  SIMULATION_FORMAT_HINTS,
  SIMULATION_FORMAT_LABELS,
  SIMULATION_FORMATS,
  type Division,
  type SimulationFormat,
} from '@/domain/simulation/formats'
import {
  buildSegments,
  createSimulation,
  describeSegment,
  previousSimulation,
} from '@/domain/simulation/simulation'
import { useAuth } from '@/features/auth/authContext'
import { useExerciseCatalog } from '@/features/exercises/useExerciseCatalog'
import { useProfileDetails } from '@/features/profile/useProfile'
import { useTodayCheckin } from '@/features/readiness/useCheckin'
import {
  readActiveSession,
  useActiveSessionKey,
  writeActiveSession,
} from '@/features/training/useActiveSession'
import { toLocalIsoDate } from '@/lib/date'
import { loadDraft, saveDraft } from '@/lib/localDraft'
import { formatDurationClock } from '@/lib/time'
import { useSimulations } from './useSimulations'

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric' })

interface Choice {
  format: SimulationFormat
  division: Division
}

const choiceKey = (userId: string) => `hyrox-coach:simulation-choice:${userId}`

function restoreChoice(stored: unknown): Choice | null {
  if (typeof stored !== 'object' || stored === null) return null
  const { format, division } = stored as Record<string, unknown>
  return SIMULATION_FORMATS.includes(format as never) && DIVISIONS.includes(division as never)
    ? { format: format as SimulationFormat, division: division as Division }
    : null
}

/** Start einer HYROX-Simulation: Format und Division wählen (`/training/simulation`). */
export function SimulationSetupPage() {
  const auth = useAuth()
  const userId = auth.status === 'signedIn' ? auth.session.user.id : 'unbekannt'
  const navigate = useNavigate()
  const details = useProfileDetails()
  const { catalog } = useExerciseCatalog()
  const simulations = useSimulations()
  const activeKey = useActiveSessionKey()
  const checkin = useTodayCheckin(toLocalIsoDate())

  // Letzte Wahl merken; sonst Division aus dem Profil
  const [choice, setChoice] = useState<Choice>(() => {
    const stored = loadDraft(choiceKey(userId), null, restoreChoice)
    if (stored) return stored
    const female = details.data?.profile?.sex === 'female'
    return { format: 'full', division: female ? 'open_women' : 'open_men' }
  })
  const [openedAt] = useState(() => new Date().toISOString())
  const segments = buildSegments(choice.format, choice.division)
  const previous = previousSimulation(simulations.data ?? [], choice.format, openedAt)

  function start() {
    if (
      readActiveSession(activeKey) &&
      !window.confirm('Es läuft bereits ein Training. Dieses verwerfen und die Simulation starten?')
    ) {
      return
    }
    saveDraft(choiceKey(userId), choice)
    const exercises = catalog.data?.exercises ?? []
    const session = createSimulation(
      choice.format,
      choice.division,
      new Date().toISOString(),
      () => crypto.randomUUID(),
      (slug) => exercises.find((e) => e.slug === slug)?.measurement ?? 'distance_time',
    )
    writeActiveSession(activeKey, { ...session, readinessCheckinId: checkin.data?.id })
    void navigate('/training/active')
  }

  return (
    <>
      <Link
        to="/training"
        className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-fg-muted hover:text-fg"
      >
        <ChevronLeftIcon width={18} height={18} /> Training
      </Link>
      <PageHeader
        title="HYROX-Simulation"
        subtitle="Rennuhr mit Zwischenzeit für jeden Lauf und jede Station."
      />
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-5">
          <OptionCards<SimulationFormat>
            label="Format"
            value={choice.format}
            options={SIMULATION_FORMATS.map((format) => ({
              value: format,
              label: SIMULATION_FORMAT_LABELS[format],
              description: SIMULATION_FORMAT_HINTS[format],
            }))}
            onChange={(format) => setChoice((c) => ({ ...c, format }))}
          />
          <SingleChoiceChips<Division>
            label="Division (Gewichte)"
            value={choice.division}
            options={DIVISIONS.map((division) => ({
              value: division,
              label: DIVISION_LABELS[division],
            }))}
            onChange={(division) => setChoice((c) => ({ ...c, division }))}
          />
        </Card>

        <Card>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-fg-muted uppercase">Ablauf</h2>
            {previous && (
              <span className="text-sm text-fg-muted">
                Zuletzt {formatDurationClock(previous.totalSec)} am{' '}
                {dateFormat.format(new Date(previous.startedAt))}
              </span>
            )}
          </div>
          <ol className="divide-y divide-line">
            {segments.map((segment, index) => (
              <li key={index} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className={segment.kind === 'run' ? 'text-fg-muted' : 'font-semibold'}>
                  {segment.label}
                </span>
                <span className="text-right text-fg-muted">{describeSegment(segment)}</span>
              </li>
            ))}
          </ol>
        </Card>

        <p className="rounded-xl border border-hyrox/40 bg-hyrox/10 px-4 py-3 text-sm">
          Die Simulation enthält kein Warm-up – wärme dich vorher 10–15 Minuten auf und stelle die
          Gewichte bereit. Die Roxzone (Wechselweg) zählt zum Lauf.
        </p>

        <Button fullWidth className="min-h-14 text-lg" disabled={catalog.isPending} onClick={start}>
          Simulation vorbereiten
        </Button>
      </div>
    </>
  )
}
