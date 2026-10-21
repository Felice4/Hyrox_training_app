import { Navigate, Outlet } from 'react-router'
import { Button } from '@/components/ui/Button'
import { FullScreenSpinner } from '@/components/ui/Spinner'
import { useProfile } from '@/features/profile/useProfile'

/** Leitet zum Onboarding, solange die Einrichtung nicht abgeschlossen ist. */
export function RequireOnboarding() {
  const profile = useProfile()

  if (profile.isPending) return <FullScreenSpinner label="Profil wird geladen …" />

  if (profile.isError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-3xl font-bold uppercase">Keine Verbindung</h1>
        <p className="text-fg-muted">Dein Profil konnte nicht geladen werden.</p>
        <Button loading={profile.isFetching} onClick={() => void profile.refetch()}>
          Erneut versuchen
        </Button>
      </main>
    )
  }

  if (!profile.data?.onboarding_completed_at) return <Navigate to="/onboarding" replace />

  return <Outlet />
}
