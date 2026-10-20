import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-ext-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-ext-700.css'
import './styles/index.css'
import { App } from './app/App'
import { ConfigErrorScreen } from './app/ConfigErrorScreen'
import { parseEnv } from './lib/env'
import { createSupabaseClient } from './lib/supabase'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Element #root fehlt in index.html')
}

const envResult = parseEnv(import.meta.env)

createRoot(rootElement).render(
  <StrictMode>
    {envResult.ok ? (
      <App supabase={createSupabaseClient(envResult.env)} />
    ) : (
      <ConfigErrorScreen errors={envResult.errors} />
    )}
  </StrictMode>,
)
