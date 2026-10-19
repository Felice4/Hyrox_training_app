import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-4xl font-bold tracking-wide uppercase">{title}</h1>
      {subtitle && <p className="mt-1 text-fg-muted">{subtitle}</p>}
    </header>
  )
}
