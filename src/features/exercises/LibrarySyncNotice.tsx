import { Button } from '@/components/ui/Button'
import { useLibrarySync } from './useLibrarySync'

/** Startet den Bibliotheksabgleich und zeigt nur bei einem Fehler einen Hinweis an. */
export function LibrarySyncNotice() {
  const sync = useLibrarySync()

  if (!sync.isError) return null

  return (
    <div
      role="alert"
      className="mb-4 flex flex-col gap-3 rounded-xl border border-hyrox/40 bg-hyrox/10 px-4 py-3 text-sm"
    >
      <p>Die Übungsbibliothek konnte nicht aktualisiert werden. Bitte Internetverbindung prüfen.</p>
      <Button
        variant="secondary"
        className="min-h-10 self-start px-4 text-sm"
        loading={sync.isFetching}
        onClick={() => void sync.refetch()}
      >
        Erneut versuchen
      </Button>
    </div>
  )
}
