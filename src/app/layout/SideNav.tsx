import { Link, useLocation } from 'react-router'
import { cn } from '@/lib/cn'
import { isNavItemActive, NAV_ITEMS } from './navigation'

/** Seitenleiste ab Tablet-/Laptop-Breite (ersetzt dort die Bottom-Navigation). */
export function SideNav() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col gap-6 border-r border-line bg-surface px-3 py-6 md:flex"
    >
      <Link
        to="/"
        className="px-3 font-display text-2xl font-bold tracking-wide uppercase"
        aria-label="HYROX Coach – Start"
      >
        HYROX <span className="text-accent">Coach</span>
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
                  'flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-surface-raised text-accent'
                    : 'text-fg-muted hover:bg-surface-raised hover:text-fg',
                )}
              >
                <Icon width={22} height={22} />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
