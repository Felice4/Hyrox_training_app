import { useState } from 'react'
import { MovementVideo } from './MovementVideo'
import { hasMovementVideo } from './videos'

/** „▶ Video" zum Aufklappen – im Trainingsmodus, damit man kurz nachsehen kann. */
export function VideoToggle({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false)
  if (!hasMovementVideo(slug)) return null
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-accent/25 bg-accent/10 px-4 text-sm font-semibold text-accent transition hover:bg-accent/15"
      >
        {open ? '✕ Video schließen' : '▶ Video'}
      </button>
      {open && <MovementVideo slug={slug} name={name} />}
    </div>
  )
}
