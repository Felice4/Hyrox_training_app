/**
 * Offline-Speicher der Movement-Videos auf dem Gerät (Cache Storage). Ein Video wird nach
 * dem ersten Laden gespeichert und danach ohne Internet abgespielt. Schlüssel ist der
 * Dateiname – neue Fassungen bekommen einen neuen Namen (siehe videos.ts).
 */

const CACHE_NAME = 'movement-videos-v1'
const keyOf = (file: string) => `${location.origin}/__movement-videos/${encodeURIComponent(file)}`

const supported = () => typeof caches !== 'undefined'

export async function readCachedVideo(file: string): Promise<Blob | undefined> {
  if (!supported()) return undefined
  const cache = await caches.open(CACHE_NAME)
  const response = await cache.match(keyOf(file))
  return response ? response.blob() : undefined
}

export async function storeCachedVideo(file: string, blob: Blob): Promise<void> {
  if (!supported()) return
  const cache = await caches.open(CACHE_NAME)
  await cache.put(keyOf(file), new Response(blob, { headers: { 'Content-Type': 'video/mp4' } }))
}

/** Dateinamen der gespeicherten Videos. */
export async function cachedVideoFiles(): Promise<Set<string>> {
  if (!supported()) return new Set()
  const cache = await caches.open(CACHE_NAME)
  const keys = await cache.keys()
  return new Set(
    keys.map((request) => decodeURIComponent(request.url.split('/__movement-videos/')[1] ?? '')),
  )
}

/** Entfernt gespeicherte Videos, die nicht mehr verwendet werden (ältere Fassungen). */
export async function pruneCachedVideos(keep: ReadonlySet<string>): Promise<void> {
  if (!supported()) return
  const cache = await caches.open(CACHE_NAME)
  for (const request of await cache.keys()) {
    const file = decodeURIComponent(request.url.split('/__movement-videos/')[1] ?? '')
    if (!keep.has(file)) await cache.delete(request)
  }
}
