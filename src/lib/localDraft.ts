/**
 * Kleine, fehlertolerante Hülle um localStorage für Formularentwürfe.
 * Der Speicher kann fehlen (privater Modus) oder voll sein – dann wird still verzichtet.
 */

export function loadDraft<T>(key: string, fallback: T, merge: (stored: unknown) => T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : merge(JSON.parse(raw))
  } catch {
    return fallback
  }
}

export function saveDraft(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Speicher nicht verfügbar – Entwurf geht bei einem Neuladen verloren, sonst kein Problem
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignorieren
  }
}
