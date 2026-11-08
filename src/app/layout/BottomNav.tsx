import { Link, useLocation } from 'react-router'
import { cn } from '@/lib/cn'
import { isNavItemActive, NAV_ITEMS } from './navigation'

/** Schwebende Navigationsleiste am Smartphone (Safe Area des iPhones beachtet). */
export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 rounded-2xl border border-line-strong/70 bg-surface/85 p-1 shadow-raised backdrop-blur-xl">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item, pathname)
          const Icon = item.icon
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors duration-200',
                  isActive ? 'text-accent' : 'text-fg-muted hover:text-fg',
                )}
              >
                <span
                  className={cn(
                    'grid h-7 w-12 place-items-center rounded-full transition duration-300 ease-out',
                    isActive ? 'bg-accent/15' : 'group-active:scale-90',
                  )}
                >
                  <Icon width={22} height={22} />
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
