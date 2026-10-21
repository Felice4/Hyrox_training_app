import { HomeIcon } from '@/components/icons'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { useProfile } from '@/features/profile/useProfile'

export function DashboardPage() {
  const profile = useProfile()
  const name = profile.data?.display_name

  return (
    <>
      <PageHeader
        title={name ? `Hallo ${name}!` : 'Hallo!'}
        subtitle="Bereit für dein nächstes Training?"
      />
      <EmptyState icon={HomeIcon} title="Dashboard im Aufbau">
        Nächstes Training, Wochenübersicht und Fortschritte erscheinen hier ab Schritt 2.8.
      </EmptyState>
    </>
  )
}
