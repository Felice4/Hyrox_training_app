import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/features/auth/authContext'
import { useSignOut } from '@/features/auth/useSignOut'

/** Bereiche, die über „Mehr" erreichbar sein werden, mit dem Schritt, in dem sie entstehen. */
const UPCOMING_SECTIONS = [
  { label: 'Übungsbibliothek', step: 'Schritt 2.4' },
  { label: 'Profil & Ziele', step: 'Schritt 2.5' },
  { label: 'Datenexport', step: 'Schritt 4.3' },
] as const

export function MorePage() {
  const auth = useAuth()
  const { signOut, signingOut, error } = useSignOut()
  const email = auth.status === 'signedIn' ? auth.session.user.email : undefined

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

      <Card className="mt-4 flex flex-col gap-4">
        {email && (
          <p className="text-sm text-fg-muted">
            Angemeldet als <span className="text-fg">{email}</span>
          </p>
        )}
        <Button variant="secondary" fullWidth loading={signingOut} onClick={() => void signOut()}>
          Abmelden
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </Card>
    </>
  )
}
