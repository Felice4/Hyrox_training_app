import { ChartIcon } from '@/components/icons'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

export function StatsPage() {
  return (
    <>
      <PageHeader title="Statistik" subtitle="Fortschritt und Bestleistungen" />
      <EmptyState icon={ChartIcon} title="Statistiken im Aufbau">
        Diagramme zu Kraft, Ausdauer und HYROX-Stationen folgen in Phase 3.
      </EmptyState>
    </>
  )
}
