import { z } from 'zod'

/**
 * Prüft die Umgebungsvariablen aus `.env.local` (lokal) bzw. Cloudflare Pages (Deployment).
 * Erlaubt ist nur der öffentliche Schlüssel (publishable bzw. anon). Geheime Schlüssel
 * werden abgelehnt, damit sie nie ins Frontend gelangen.
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .url({
      protocol: /^https?$/,
      error: 'VITE_SUPABASE_URL fehlt oder ist keine gültige URL.',
    })
    // Häufiger Fehler: URL von der Data-API-Seite inkl. „/rest/v1/" kopiert
    // (Zod führt diese Prüfung auch bei ungültiger URL aus → erst prüfen, ob sie lesbar ist)
    .refine((url) => !URL.canParse(url) || new URL(url).pathname === '/', {
      error:
        'VITE_SUPABASE_URL darf nur die Basis-Adresse enthalten (https://….supabase.co), ohne „/rest/v1/" o. Ä.',
    })
    .transform((url) => url.replace(/\/$/, '')),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string({ error: 'VITE_SUPABASE_PUBLISHABLE_KEY fehlt.' })
    .trim()
    .min(20, 'VITE_SUPABASE_PUBLISHABLE_KEY ist zu kurz.')
    .refine((key) => !isSecretKey(key), {
      error:
        'VITE_SUPABASE_PUBLISHABLE_KEY ist ein GEHEIMER Schlüssel. Nur den publishable/anon Key verwenden!',
    }),
})

export interface AppEnv {
  supabaseUrl: string
  supabasePublishableKey: string
}

export type EnvResult = { ok: true; env: AppEnv } | { ok: false; errors: string[] }

export function parseEnv(raw: Record<string, unknown>): EnvResult {
  const result = envSchema.safeParse(raw)
  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((issue) => issue.message) }
  }
  return {
    ok: true,
    env: {
      supabaseUrl: result.data.VITE_SUPABASE_URL,
      supabasePublishableKey: result.data.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  }
}

/** Erkennt neue geheime Schlüssel (`sb_secret_…`) und alte `service_role`-JWTs. */
export function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  const payload = key.split('.')[1]
  if (!payload) return false
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as unknown
    return (
      typeof json === 'object' && json !== null && 'role' in json && json.role === 'service_role'
    )
  } catch {
    return false
  }
}
