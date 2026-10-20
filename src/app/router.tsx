import { createBrowserRouter } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { GeneratorPage } from '@/features/generator/GeneratorPage'
import { MorePage } from '@/features/more/MorePage'
import { StatsPage } from '@/features/progress/StatsPage'
import { AppShell } from './layout/AppShell'
import { RouteErrorPage } from './RouteErrorPage'

/**
 * Routen der App (siehe docs/ARCHITECTURE.md §5).
 * Alles außer /login erfordert eine Anmeldung (RequireAuth).
 */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'training', element: <GeneratorPage /> },
          { path: 'calendar', element: <CalendarPage /> },
          { path: 'stats', element: <StatsPage /> },
          { path: 'more', element: <MorePage /> },
        ],
      },
    ],
  },
])
