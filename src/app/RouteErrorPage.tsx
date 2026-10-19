import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

/** Wird bei unbekannten Adressen oder Fehlern beim Rendern einer Seite angezeigt. */
export function RouteErrorPage() {
  const error = useRouteError()
  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-4xl font-bold uppercase">
        {isNotFound ? 'Seite nicht gefunden' : 'Etwas ist schiefgelaufen'}
      </h1>
      <p className="text-fg-muted">
        {isNotFound
          ? 'Diese Adresse gibt es in der App nicht.'
          : 'Bitte lade die Seite neu. Wenn der Fehler bleibt, notiere, was du zuletzt getan hast.'}
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex min-h-12 items-center rounded-xl bg-accent px-6 font-semibold text-on-accent"
      >
        Zur Startseite
      </Link>
    </main>
  )
}
