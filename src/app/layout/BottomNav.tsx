import { Link, useLocation } from 'react-router'
import { cn } from '@/lib/cn'
import { isNavItemActive, NAV_ITEMS } from './navigation'

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item, pathname)
          const Icon = item.icon
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150',
                  isActive ? 'text-accent' : 'text-fg-muted hover:text-fg',
                )}
              >
                <Icon />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
