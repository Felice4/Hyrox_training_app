import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { z } from 'zod'
import { useSupabase } from '@/app/supabaseContext'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from './authContext'
import { toGermanAuthError } from './authErrors'
import { getRedirectTarget } from './redirect'

const loginSchema = z.object({
  email: z.email('Bitte eine gültige E-Mail-Adresse eingeben.'),
  password: z.string().min(1, 'Bitte das Passwort eingeben.'),
})

type FieldErrors = Partial<Record<'email' | 'password', string>>

export function LoginPage() {
  const supabase = useSupabase()
  const auth = useAuth()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Bereits angemeldet (auch direkt nach erfolgreichem Login) → weiter zur Zielseite
  if (auth.status === 'signedIn') {
    return <Navigate to={getRedirectTarget(location.state)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const parsed = loginSchema.safeParse({ email: email.trim(), password })
    if (!parsed.success) {
      const errors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if ((field === 'email' || field === 'password') && !errors[field]) {
          errors[field] = issue.message
        }
      }
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword(parsed.data)
    setSubmitting(false)
    if (error) {
      setFormError(toGermanAuthError(error))
    }
    // Erfolg: AuthProvider erhält SIGNED_IN, diese Seite leitet beim nächsten Rendern weiter
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <img src="/favicon.svg" alt="" width={64} height={64} className="mb-4" />
        <h1 className="font-display text-4xl font-bold tracking-wide uppercase">HYROX Coach</h1>
        <p className="mt-1 text-fg-muted">Melde dich an, um weiterzutrainieren.</p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="E-Mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
        />
        <TextField
          label="Passwort"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          trailing={
            <Button
              variant="ghost"
              className="min-h-10 px-3 text-sm"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Verbergen' : 'Anzeigen'}
            </Button>
          }
        />

        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
          >
            {formError}
          </p>
        )}

        <Button type="submit" fullWidth loading={submitting} className="mt-2">
          {submitting ? 'Anmelden …' : 'Anmelden'}
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-fg-muted">
        Private App – es gibt keine öffentliche Registrierung.
      </p>
    </main>
  )
}
