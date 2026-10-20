import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { AppEnv } from './env'

/**
 * Supabase-Client – einzige Instanz der App.
 * Wird in main.tsx erst nach erfolgreicher Prüfung der Umgebungsvariablen erstellt.
 * Die Anmeldung bleibt im Browser gespeichert und wird automatisch erneuert.
 */
export function createSupabaseClient(env: AppEnv) {
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
}

export type AppSupabaseClient = ReturnType<typeof createSupabaseClient>
