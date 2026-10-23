import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { toLocalIsoDate } from '@/lib/date'
import { Overview } from './Overview'

export function StatsPage() {
  const [today] = useState(() => toLocalIsoDate())
  return (
    <>
      <PageHeader title="Statistik" subtitle="Fortschritt und Bestleistungen" />
      <Overview today={today} />
    </>
  )
}
