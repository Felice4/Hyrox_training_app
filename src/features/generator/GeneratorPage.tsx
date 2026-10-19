import { DumbbellIcon } from '@/components/icons'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

export function GeneratorPage() {
  return (
    <>
      <PageHeader title="Training" subtitle="Workout erstellen und starten" />
      <EmptyState icon={DumbbellIcon} title="Trainingsgenerator im Aufbau">
        Workouts nach Dauer, Schwerpunkt und Tagesform erzeugen – ab Schritt 2.6.
      </EmptyState>
    </>
  )
}
