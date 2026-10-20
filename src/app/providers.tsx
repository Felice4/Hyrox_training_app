import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { queryClient } from '@/lib/queryClient'
import type { AppSupabaseClient } from '@/lib/supabase'
import { SupabaseContext } from './supabaseContext'

interface AppProvidersProps {
  supabase: AppSupabaseClient
  children: ReactNode
}

export function AppProviders({ supabase, children }: AppProvidersProps) {
  return (
    <SupabaseContext value={supabase}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </SupabaseContext>
  )
}
