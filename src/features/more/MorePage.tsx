import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

/** Bereiche, die über „Mehr" erreichbar sein werden, mit dem Schritt, in dem sie entstehen. */
const UPCOMING_SECTIONS = [
  { label: 'Übungsbibliothek', step: 'Schritt 2.4' },
  { label: 'Profil & Ziele', step: 'Schritt 2.5' },
  { label: 'Datenexport', step: 'Schritt 4.3' },
  { label: 'Abmelden', step: 'Schritt 2.3' },
] as const

export function MorePage() {
  return (
    <>
      <PageHeader title="Mehr" subtitle="Bibliothek, Profil und Einstellungen" />
      <Card className="p-0">
        <ul className="divide-y divide-line">
          {UPCOMING_SECTIONS.map(({ label, step }) => (
            <li key={label} className="flex min-h-14 items-center justify-between px-5">
              <span className="text-fg-muted">{label}</span>
              <span className="rounded-full bg-surface-raised px-2.5 py-1 text-xs text-fg-muted">
                {step}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
