import { Link } from 'react-router'
import type { ComponentType, SVGProps } from 'react'
import {
  BookIcon,
  CalendarIcon,
  ChevronRightIcon,
  DownloadIcon,
  FlagIcon,
  MoveIcon,
  TargetIcon,
  UserIcon,
} from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/features/auth/authContext'
import { useSignOut } from '@/features/auth/useSignOut'

const SECTIONS: { to: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { to: '/race', label: 'Wettkampfvorbereitung', icon: FlagIcon },
  { to: '/goals', label: 'Skill-Ziele & Meilensteine', icon: TargetIcon },
  { to: '/profile', label: 'Profil & Trainingsziele', icon: UserIcon },
  { to: '/history', label: 'Trainingshistorie', icon: CalendarIcon },
  { to: '/exercises', label: 'Übungsbibliothek HYROX', icon: BookIcon },
  { to: '/movement', label: 'Movement Lab', icon: MoveIcon },
  { to: '/export', label: 'Datenexport', icon: DownloadIcon },
]

export function MorePage() {
  const auth = useAuth()
  const { signOut, signingOut, error } = useSignOut()
  const email = auth.status === 'signedIn' ? auth.session.user.email : undefined

  return (
    <>
      <PageHeader title="Mehr" subtitle="Bibliothek, Profil und Einstellungen" />
      <Card className="p-0">
        <ul className="divide-y divide-line">
          {SECTIONS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="group flex min-h-16 items-center gap-4 px-5 transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface-raised"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                  <Icon width={20} height={20} />
                </span>
                <span className="flex-1 font-medium">{label}</span>
                <ChevronRightIcon
                  width={20}
                  height={20}
                  className="text-fg-muted transition group-hover:translate-x-0.5 group-hover:text-fg"
                />
              </Link>
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
