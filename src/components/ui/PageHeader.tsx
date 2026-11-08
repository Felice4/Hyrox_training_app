import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-[2.5rem] leading-none font-bold tracking-wide uppercase md:text-5xl">
        {title}
      </h1>
      <span aria-hidden="true" className="mt-3 block h-1 w-10 rounded-full bg-accent" />
      {subtitle && <p className="mt-3 max-w-prose text-fg-muted">{subtitle}</p>}
    </header>
  )
}
