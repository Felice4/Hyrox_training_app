import { RouterProvider } from 'react-router/dom'
import type { AppSupabaseClient } from '@/lib/supabase'
import { AppProviders } from './providers'
import { router } from './router'

export function App({ supabase }: { supabase: AppSupabaseClient }) {
  return (
    <AppProviders supabase={supabase}>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
