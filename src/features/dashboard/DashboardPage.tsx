import { HomeIcon } from '@/components/icons'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

export function DashboardPage() {
  return (
    <>
      <PageHeader title="Hallo!" subtitle="Bereit für dein nächstes Training?" />
      <EmptyState icon={HomeIcon} title="Dashboard im Aufbau">
        Nächstes Training, Wochenübersicht und Fortschritte erscheinen hier ab Schritt 2.8.
      </EmptyState>
    </>
  )
}
