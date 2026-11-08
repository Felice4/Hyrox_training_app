import { Outlet, useLocation } from 'react-router'
import { LibrarySyncNotice } from '@/features/exercises/LibrarySyncNotice'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'

/**
 * Rahmen für alle Hauptbereiche. Smartphone: Inhalt oben, Bottom-Navigation unten
 * (Safe Areas für iPhone beachtet). Ab `md` (Tablet/Laptop): Seitenleiste links und
 * breiterer Inhalt.
 */
export function AppShell() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-dvh md:pl-64">
      {/* Für Tastaturnutzer: Navigation überspringen (erscheint erst beim Fokussieren) */}
      <a
        href="#inhalt"
        className="sr-only z-30 rounded-xl bg-accent px-4 py-3 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Zum Inhalt springen
      </a>
      <SideNav />
      <main
        id="inhalt"
        tabIndex={-1}
        className="mx-auto w-full max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+7.5rem)] outline-none md:max-w-3xl md:px-10 md:pt-12 md:pb-16 xl:max-w-4xl"
      >
        <LibrarySyncNotice />
        {/* Sanfter Übergang beim Seitenwechsel */}
        <div key={pathname} className="animate-enter">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
