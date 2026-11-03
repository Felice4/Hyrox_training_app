import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const THEME_COLOR = '#0a0a0b'

// https://vite.dev/config/ · https://vitest.dev/config/ · https://vite-pwa-org.netlify.app/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Neue Version erst nach Bestätigung laden (Hinweis in src/app/AppStatus.tsx)
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'HYROX Performance Coach',
        short_name: 'HYROX Coach',
        description: 'Persönlicher Trainingscoach für HYROX, Kraft und Ausdauer',
        lang: 'de',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: THEME_COLOR,
        theme_color: THEME_COLOR,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App-Hülle vorab speichern: Die App startet auch ohne Verbindung.
        // Daten aus Supabase werden bewusst nicht zwischengespeichert (immer aktuell, keine
        // Offline-Synchronisierung); ein laufendes Training sichert die App selbst lokal.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Schriftschnitte für Kyrillisch, Griechisch und Vietnamesisch lädt der Browser bei
        // Bedarf nach – sie müssen nicht vorab gespeichert werden
        globIgnores: ['**/*-cyrillic*.woff2', '**/*-greek*.woff2', '**/*-vietnamese*.woff2'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
