/** Wird angezeigt, wenn die Supabase-Umgebungsvariablen fehlen oder ungültig sind. */
export function ConfigErrorScreen({ errors }: { errors: string[] }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="font-display text-3xl font-bold uppercase">Konfiguration fehlt</h1>
      <ul className="list-disc space-y-1 pl-5 text-danger">
        {errors.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
      <p className="text-fg-muted">
        Lokal: Datei <code className="text-fg">.env.local</code> nach Vorlage von{' '}
        <code className="text-fg">.env.example</code> anlegen und den Entwicklungsserver neu
        starten. Deployment: Variablen in Cloudflare Pages eintragen und neu bereitstellen.
      </p>
    </main>
  )
}
