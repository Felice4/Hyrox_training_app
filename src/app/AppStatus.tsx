import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

/** Wie oft die App im Hintergrund nach einer neuen Version sucht. */
const UPDATE_CHECK_MS = 60 * 60 * 1000

/**
 * Hinweise am oberen Rand: keine Verbindung und neue App-Version. Ein Update wird nie
 * ungefragt eingespielt – ein laufendes Training ist zwar lokal gesichert, soll aber
 * nicht mitten im Satz neu geladen werden.
 */
export function AppStatus() {
  const online = useOnlineStatus()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => {
        // Nur mit Verbindung suchen, sonst schlägt die Anfrage ohnehin fehl
        if (navigator.onLine) void registration.update()
      }, UPDATE_CHECK_MS)
    },
  })
  const [updating, setUpdating] = useState(false)

  if (online && !needRefresh && !offlineReady) return null

  return (
    <div className="fixed inset-x-0 top-0 z-40 flex flex-col items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:left-60">
      {!online && (
        <p
          role="status"
          className="w-full max-w-xl rounded-xl border border-hyrox/50 bg-surface-raised px-4 py-2.5 text-sm shadow-lg"
        >
          <span className="font-semibold text-hyrox">Offline.</span> Ein laufendes Training wird
          lokal gesichert und lässt sich speichern, sobald du wieder online bist. Neue Daten werden
          erst dann geladen.
        </p>
      )}
      {needRefresh && (
        <div
          role="status"
          className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-accent/50 bg-surface-raised px-4 py-2.5 text-sm shadow-lg"
        >
          <span>
            <span className="font-semibold text-accent">Neue Version verfügbar.</span> Dein
            laufendes Training bleibt erhalten.
          </span>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              className="min-h-10 rounded-lg px-2 text-fg-muted hover:text-fg"
              onClick={() => setNeedRefresh(false)}
            >
              Später
            </button>
            <button
              type="button"
              className="min-h-10 rounded-lg bg-accent px-3 font-semibold text-on-accent disabled:opacity-50"
              disabled={updating}
              onClick={() => {
                setUpdating(true)
                void updateServiceWorker(true)
              }}
            >
              Aktualisieren
            </button>
          </div>
        </div>
      )}
      {offlineReady && !needRefresh && (
        <div
          role="status"
          className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-sm shadow-lg"
        >
          <span>Die App ist jetzt auch ohne Verbindung startbar.</span>
          <button
            type="button"
            className="min-h-10 shrink-0 rounded-lg px-2 text-fg-muted hover:text-fg"
            onClick={() => setOfflineReady(false)}
          >
            OK
          </button>
        </div>
      )}
    </div>
  )
}
