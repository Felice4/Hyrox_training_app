import { createContext, useContext } from 'react'
import type { AppSupabaseClient } from '@/lib/supabase'

export const SupabaseContext = createContext<AppSupabaseClient | null>(null)

/** Liefert den Supabase-Client. Nur innerhalb von <AppProviders> verwendbar. */
export function useSupabase(): AppSupabaseClient {
  const client = useContext(SupabaseContext)
  if (!client) {
    throw new Error('useSupabase() außerhalb von <AppProviders> aufgerufen')
  }
  return client
}
