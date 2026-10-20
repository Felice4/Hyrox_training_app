import { Outlet } from 'react-router'
import { LibrarySyncNotice } from '@/features/exercises/LibrarySyncNotice'
import { BottomNav } from './BottomNav'

/** Rahmen für alle Hauptbereiche: Inhalt oben, Bottom-Navigation unten (Safe Areas für iPhone beachtet). */
export function AppShell() {
  return (
    <div className="min-h-dvh">
      <main className="mx-auto w-full max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)]">
        <LibrarySyncNotice />
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
