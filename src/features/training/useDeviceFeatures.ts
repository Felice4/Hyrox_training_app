import { useEffect, useState } from 'react'

/** Aktuelle Zeit, jede Sekunde neu – nur solange `active` (spart Akku). */
export function useNow(active: boolean): string {
  const [now, setNow] = useState(() => new Date().toISOString())
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(new Date().toISOString()), 1000)
    return () => window.clearInterval(timer)
  }, [active])
  return now
}

/**
 * Hält den Bildschirm während des Trainings an (Screen Wake Lock API, sofern der Browser
 * sie unterstützt). Nach einem App-Wechsel wird die Sperre neu angefordert.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | undefined
    let cancelled = false

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) void sentinel.release()
      } catch {
        // z. B. Energiesparmodus – dann eben ohne
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
    }
  }, [active])
}

/** Kurze Vibration als Signal (z. B. Pause vorbei), falls verfügbar. */
export function vibrate(pattern: number | number[] = [200, 100, 200]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // nicht unterstützt
  }
}
