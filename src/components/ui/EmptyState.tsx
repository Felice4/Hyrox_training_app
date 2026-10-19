import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Card } from './Card'

interface EmptyStateProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  children?: ReactNode
}

/** Hinweis, wenn (noch) keine Inhalte vorhanden sind. */
export function EmptyState({ icon: Icon, title, children }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-surface-raised text-accent">
        <Icon width={28} height={28} />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="max-w-xs text-sm text-fg-muted">{children}</div>}
    </Card>
  )
}
