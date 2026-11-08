import { Link, useLocation } from 'react-router'
import { cn } from '@/lib/cn'
import { isNavItemActive, NAV_ITEMS } from './navigation'

/** Seitenleiste ab Tablet-/Laptop-Breite (ersetzt dort die Bottom-Navigation). */
export function SideNav() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col gap-8 border-r border-line bg-surface/70 px-4 py-7 backdrop-blur-xl md:flex"
    >
      <Link
        to="/"
        className="flex items-center gap-3 rounded-xl px-2"
        aria-label="HYROX Coach – Start"
      >
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-xl bg-accent font-display text-2xl font-bold text-on-accent shadow-glow"
        >
          H
        </span>
        <span className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          HYROX <span className="text-accent">Coach</span>
        </span>
      </Link>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item, pathname)
          const Icon = item.icon
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium transition duration-200',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-fg-muted hover:bg-surface-raised hover:text-fg',
                )}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-full bg-accent"
                  />
                )}
                <Icon width={22} height={22} />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
      <p className="mt-auto px-3 text-xs text-fg-muted">Train hard. Race smart.</p>
    </nav>
  )
}
