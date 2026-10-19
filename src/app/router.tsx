import { createBrowserRouter } from 'react-router'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { GeneratorPage } from '@/features/generator/GeneratorPage'
import { MorePage } from '@/features/more/MorePage'
import { StatsPage } from '@/features/progress/StatsPage'
import { AppShell } from './layout/AppShell'
import { RouteErrorPage } from './RouteErrorPage'

/** Routen der App (siehe docs/ARCHITECTURE.md §5). Login und Routenschutz folgen in Schritt 2.3. */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'training', element: <GeneratorPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'more', element: <MorePage /> },
    ],
  },
])
