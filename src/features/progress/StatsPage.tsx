import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/cn'
import { toLocalIsoDate } from '@/lib/date'
import { ExerciseProgressView } from './ExerciseProgressView'
import { Overview } from './Overview'

const TABS = [
  { value: 'overview', label: 'Übersicht' },
  { value: 'exercises', label: 'Übungen' },
] as const

type Tab = (typeof TABS)[number]['value']

export function StatsPage() {
  const [today] = useState(() => toLocalIsoDate())
  const [params, setParams] = useSearchParams()
  const tab: Tab = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'overview'

  return (
    <>
      <PageHeader title="Statistik" subtitle="Fortschritt und Bestleistungen" />
      <div
        role="tablist"
        aria-label="Bereich"
        className="mb-4 grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-line bg-surface p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() =>
              setParams(t.value === 'overview' ? {} : { tab: t.value }, { replace: true })
            }
            className={cn(
              'min-h-11 rounded-lg text-sm font-semibold transition',
              tab === t.value ? 'bg-surface-raised text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview today={today} />}
      {tab === 'exercises' && <ExerciseProgressView today={today} />}
    </>
  )
}
