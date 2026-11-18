import { useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { useMovementVideo } from './useMovementVideo'
import { movementVideoFile } from './videos'

/**
 * Video einer Movement-Übung: stumm, in Schleife, im Hochformat begrenzt. Antippen hält
 * an bzw. spielt weiter. Ohne Video wird nichts angezeigt.
 */
export function MovementVideo({ slug, name }: { slug: string; name: string }) {
  const file = movementVideoFile(slug)
  if (!file) return null
  return <VideoPlayer key={file} file={file} name={name} />
}

function VideoPlayer({ file, name }: { file: string; name: string }) {
  const video = useMovementVideo(file)
  const [paused, setPaused] = useState(false)

  return (
    <div className="relative mx-auto flex max-h-[70vh] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-raised">
      {video.status === 'loading' && (
        <div
          role="status"
          className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 text-sm text-fg-muted"
        >
          <Spinner className="text-accent" />
          Video wird geladen …
        </div>
      )}
      {video.status === 'error' && (
        <p
          role="alert"
          className="flex aspect-[9/16] w-full items-center justify-center p-6 text-center text-sm text-fg-muted"
        >
          Das Video konnte nicht geladen werden. Ohne Internet funktionieren nur Videos, die schon
          einmal angesehen oder offline gespeichert wurden.
        </p>
      )}
      {video.status === 'ready' && (
        <>
          <video
            src={video.url}
            aria-label={`Video: ${name}`}
            className="max-h-[70vh] w-full object-contain"
            autoPlay
            loop
            muted
            playsInline
            onClick={(e) => {
              const el = e.currentTarget
              if (el.paused) void el.play()
              else el.pause()
            }}
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
          />
          {paused && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute grid size-16 place-items-center rounded-full bg-black/50 text-2xl text-white"
            >
              ▶
            </span>
          )}
        </>
      )}
    </div>
  )
}
