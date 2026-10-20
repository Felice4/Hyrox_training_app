/// <reference types="vite/client" />

// Umgebungsvariablen der App (Werte in .env.local bzw. Cloudflare Pages, Vorlage: .env.example)
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
