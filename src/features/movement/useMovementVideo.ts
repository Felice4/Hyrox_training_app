import { useEffect, useState } from 'react'
import { downloadMovementVideo } from '@/api/movementVideos'
import { useSupabase } from '@/app/supabaseContext'
import {
  cachedVideoFiles,
  pruneCachedVideos,
  readCachedVideo,
  storeCachedVideo,
} from './videoCache'
import { MOVEMENT_VIDEOS } from './videos'

/** Video aus dem Gerätespeicher – sonst herunterladen und für offline speichern. */
export async function loadMovementVideo(
  supabase: Parameters<typeof downloadMovementVideo>[0],
  file: string,
): Promise<Blob> {
  const cached = await readCachedVideo(file).catch(() => undefined)
  if (cached) return cached
  const blob = await downloadMovementVideo(supabase, file)
  await storeCachedVideo(file, blob).catch(() => undefined)
  return blob
}

export type MovementVideoState =
  { status: 'loading' } | { status: 'ready'; url: string } | { status: 'error' }

/**
 * Lädt das Video einer Datei als abspielbare Adresse (wird beim Verlassen freigegeben).
 * Bei anderer Datei die Komponente per `key` neu aufbauen.
 */
export function useMovementVideo(file: string): MovementVideoState {
  const supabase = useSupabase()
  const [state, setState] = useState<MovementVideoState>({ status: 'loading' })

  useEffect(() => {
    let url: string | undefined
    let cancelled = false
    loadMovementVideo(supabase, file).then(
      (blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setState({ status: 'ready', url })
      },
      () => !cancelled && setState({ status: 'error' }),
    )
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [supabase, file])

  return state
}

const VIDEO_FILES = Object.values(MOVEMENT_VIDEOS)

/** Alle Videos fürs Training offline speichern (z. B. im WLAN vor dem Studio). */
export function useOfflineVideos() {
  const supabase = useSupabase()
  const [cached, setCached] = useState<number | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(0)

  const countCached = () =>
    cachedVideoFiles()
      .catch(() => new Set<string>())
      .then((stored) => VIDEO_FILES.filter((file) => stored.has(file)).length)

  useEffect(() => {
    let cancelled = false
    void countCached().then((count) => !cancelled && setCached(count))
    return () => {
      cancelled = true
    }
  }, [])

  async function saveAll() {
    setSaving(true)
    setFailed(0)
    let errors = 0
    for (const file of VIDEO_FILES) {
      try {
        await loadMovementVideo(supabase, file)
      } catch {
        errors += 1
      }
    }
    // Ältere Fassungen ersetzter Videos freigeben
    await pruneCachedVideos(new Set(VIDEO_FILES)).catch(() => undefined)
    setFailed(errors)
    setSaving(false)
    setCached(await countCached())
  }

  return { total: VIDEO_FILES.length, cached, saving, failed, saveAll }
}
