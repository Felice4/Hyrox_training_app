import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type BadgeTone = 'neutral' | 'accent' | 'hyrox'

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-high text-fg-muted ring-line-strong',
  accent: 'bg-accent/12 text-accent ring-accent/25',
  hyrox: 'bg-hyrox/12 text-hyrox ring-hyrox/25',
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  )
}
