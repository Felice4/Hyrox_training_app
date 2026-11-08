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
    <Card className="flex animate-enter flex-col items-center gap-3 py-12 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/20">
        <Icon width={30} height={30} />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="max-w-xs text-sm text-fg-muted">{children}</div>}
    </Card>
  )
}
