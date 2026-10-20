import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type BadgeTone = 'neutral' | 'accent' | 'hyrox'

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-raised text-fg-muted',
  accent: 'bg-accent/15 text-accent',
  hyrox: 'bg-hyrox/15 text-hyrox',
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  )
}
