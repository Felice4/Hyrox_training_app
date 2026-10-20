import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenSpinner } from '@/components/ui/Spinner'
import { useAuth } from './authContext'

/** Schützt alle Unterseiten: ohne Anmeldung geht es zur Login-Seite. */
export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') {
    return <FullScreenSpinner label="Anmeldung wird geprüft …" />
  }
  if (auth.status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
