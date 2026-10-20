import type { ComponentType, SVGProps } from 'react'
import { CalendarIcon, ChartIcon, DumbbellIcon, HomeIcon, MoreIcon } from '@/components/icons'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** true = nur bei exakt diesem Pfad aktiv (für „/"). */
  end?: boolean
  /** Weitere Bereiche, bei denen dieser Eintrag ebenfalls hervorgehoben wird. */
  alsoActiveFor?: readonly string[]
}

/** Einträge der Bottom-Navigation (siehe docs/ARCHITECTURE.md §5). Maximal 5. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Start', icon: HomeIcon, end: true },
  { to: '/training', label: 'Training', icon: DumbbellIcon },
  { to: '/calendar', label: 'Kalender', icon: CalendarIcon },
  { to: '/stats', label: 'Statistik', icon: ChartIcon },
  { to: '/more', label: 'Mehr', icon: MoreIcon, alsoActiveFor: ['/exercises'] },
]

function matchesPath(base: string, pathname: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`)
}

/** Ist der Eintrag für die aktuelle Adresse hervorzuheben? */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to
  return [item.to, ...(item.alsoActiveFor ?? [])].some((base) => matchesPath(base, pathname))
}
