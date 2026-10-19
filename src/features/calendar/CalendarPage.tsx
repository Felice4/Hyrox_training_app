import { CalendarIcon } from '@/components/icons'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

export function CalendarPage() {
  return (
    <>
      <PageHeader title="Kalender" subtitle="Geplante und absolvierte Einheiten" />
      <EmptyState icon={CalendarIcon} title="Kalender im Aufbau">
        Wochenplan sowie Monats- und Wochenansicht folgen in Phase 3.
      </EmptyState>
    </>
  )
}
