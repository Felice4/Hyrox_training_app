import { createBrowserRouter } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ExerciseDetailPage } from '@/features/exercises/ExerciseDetailPage'
import { ExerciseListPage } from '@/features/exercises/ExerciseListPage'
import { GeneratorPage } from '@/features/generator/GeneratorPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { RequireOnboarding } from '@/features/onboarding/RequireOnboarding'
import { MorePage } from '@/features/more/MorePage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { StatsPage } from '@/features/progress/StatsPage'
import { TrainingPage } from '@/features/training/TrainingPage'
import { AppShell } from './layout/AppShell'
import { RouteErrorPage } from './RouteErrorPage'

/**
 * Routen der App (siehe docs/ARCHITECTURE.md §5).
 * Alles außer /login erfordert eine Anmeldung (RequireAuth); die Hauptbereiche zusätzlich
 * ein abgeschlossenes Onboarding (RequireOnboarding).
 */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
      {
        element: <RequireOnboarding />,
        children: [
          // Trainingsmodus im Vollbild ohne Bottom-Navigation
          { path: '/training/active', element: <TrainingPage /> },
          {
            path: '/',
            element: <AppShell />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'training', element: <GeneratorPage /> },
              { path: 'calendar', element: <CalendarPage /> },
              { path: 'stats', element: <StatsPage /> },
              { path: 'more', element: <MorePage /> },
              { path: 'exercises', element: <ExerciseListPage /> },
              { path: 'exercises/:slug', element: <ExerciseDetailPage /> },
              { path: 'profile', element: <ProfilePage /> },
            ],
          },
        ],
      },
    ],
  },
])
