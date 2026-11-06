import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ExerciseDetailPage } from '@/features/exercises/ExerciseDetailPage'
import { ExerciseListPage } from '@/features/exercises/ExerciseListPage'
import { GeneratorPage } from '@/features/generator/GeneratorPage'
import { RequireOnboarding } from '@/features/onboarding/RequireOnboarding'
import { MorePage } from '@/features/more/MorePage'

import { AppShell } from './layout/AppShell'
import { RouteErrorPage } from './RouteErrorPage'

/**
 * Lädt eine Seite erst beim ersten Aufruf (eigenes JavaScript-Paket, kleinerer Start).
 * Der Service Worker speichert alle Pakete vorab – offline funktioniert es trotzdem.
 */
function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return () => load().then((m) => ({ Component: m[name] as ComponentType }))
}

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
      {
        path: '/onboarding',
        lazy: page(() => import('@/features/onboarding/OnboardingPage'), 'OnboardingPage'),
      },
      {
        element: <RequireOnboarding />,
        children: [
          // Trainingsmodus im Vollbild ohne Bottom-Navigation
          {
            path: '/training/active',
            lazy: page(() => import('@/features/training/TrainingPage'), 'TrainingPage'),
          },
          {
            path: '/',
            element: <AppShell />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'training', element: <GeneratorPage /> },
              {
                path: 'training/simulation',
                lazy: page(
                  () => import('@/features/simulation/SimulationSetupPage'),
                  'SimulationSetupPage',
                ),
              },
              { path: 'calendar', element: <CalendarPage /> },
              {
                path: 'calendar/planned/:id',
                lazy: page(
                  () => import('@/features/calendar/PlannedWorkoutPage'),
                  'PlannedWorkoutPage',
                ),
              },
              {
                path: 'calendar/new/:date',
                lazy: page(
                  () => import('@/features/calendar/NewPlannedWorkoutPage'),
                  'NewPlannedWorkoutPage',
                ),
              },
              // Diagramm-Bibliothek nur laden, wenn die Statistik geöffnet wird
              {
                path: 'stats',
                lazy: page(() => import('@/features/progress/StatsPage'), 'StatsPage'),
              },
              { path: 'more', element: <MorePage /> },
              {
                path: 'goals',
                lazy: page(() => import('@/features/goals/GoalsPage'), 'GoalsPage'),
              },
              {
                path: 'goals/milestones/new',
                lazy: page(() => import('@/features/goals/MilestoneFormPage'), 'MilestoneFormPage'),
              },
              {
                path: 'goals/milestones/:key',
                lazy: page(
                  () => import('@/features/goals/MilestoneDetailPage'),
                  'MilestoneDetailPage',
                ),
              },
              {
                path: 'goals/milestones/:key/edit',
                lazy: page(() => import('@/features/goals/MilestoneFormPage'), 'MilestoneFormPage'),
              },
              {
                path: 'goals/:slug',
                lazy: page(() => import('@/features/goals/SkillDetailPage'), 'SkillDetailPage'),
              },
              { path: 'exercises', element: <ExerciseListPage /> },
              {
                path: 'exercises/new',
                lazy: page(
                  () => import('@/features/exercises/ExerciseFormPage'),
                  'ExerciseFormPage',
                ),
              },
              { path: 'exercises/:slug', element: <ExerciseDetailPage /> },
              {
                path: 'exercises/:slug/edit',
                lazy: page(
                  () => import('@/features/exercises/ExerciseFormPage'),
                  'ExerciseFormPage',
                ),
              },
              {
                path: 'profile',
                lazy: page(() => import('@/features/profile/ProfilePage'), 'ProfilePage'),
              },
              {
                path: 'export',
                lazy: page(() => import('@/features/export/ExportPage'), 'ExportPage'),
              },
              {
                path: 'history',
                lazy: page(() => import('@/features/history/HistoryListPage'), 'HistoryListPage'),
              },
              {
                path: 'history/:id',
                lazy: page(
                  () => import('@/features/history/SessionDetailPage'),
                  'SessionDetailPage',
                ),
              },
            ],
          },
        ],
      },
    ],
  },
])
