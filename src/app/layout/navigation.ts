import type { ComponentType, SVGProps } from 'react'
import { CalendarIcon, ChartIcon, DumbbellIcon, HomeIcon, MoreIcon } from '@/components/icons'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** true = nur bei exakt diesem Pfad aktiv (für „/"). */
  end?: boolean
}

/** Einträge der Bottom-Navigation (siehe docs/ARCHITECTURE.md §5). Maximal 5. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Start', icon: HomeIcon, end: true },
  { to: '/training', label: 'Training', icon: DumbbellIcon },
  { to: '/calendar', label: 'Kalender', icon: CalendarIcon },
  { to: '/stats', label: 'Statistik', icon: ChartIcon },
  { to: '/more', label: 'Mehr', icon: MoreIcon },
]
