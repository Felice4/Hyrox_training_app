import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { fetchExportData, type ExportData } from '@/api/export'
import { useSupabase } from '@/app/supabaseContext'
import { ChevronLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { toLocalIsoDate } from '@/lib/date'
import { saveFile } from '@/lib/download'
import { csvFiles } from './tables'

/** Export aller eigenen Trainingsdaten als JSON (komplett) und CSV (für Excel). */
export function ExportPage() {
  const supabase = useSupabase()
  const load = useMutation({ mutationFn: () => fetchExportData(supabase) })

  return (
    <>
      <Link
        to="/more"
        className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-fg-muted hover:text-fg"
      >
        <ChevronLeftIcon width={18} height={18} />
        Mehr
      </Link>
      <PageHeader title="Datenexport" subtitle="Deine Trainingsdaten als Datei" />

      {!load.data ? (
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-fg-muted">
            Lädt alle deine Daten aus der Datenbank: Trainings mit Übungen und Sätzen,
            Bestleistungen, Körperwerte, Tagesform, Wochenpläne, Profil und eigene Übungen. Die
            Dateien entstehen auf deinem Gerät.
          </p>
          <Button loading={load.isPending} onClick={() => load.mutate()}>
            Daten zusammenstellen
          </Button>
          {load.isError && (
            <p role="alert" className="text-sm text-danger">
              Die Daten konnten nicht geladen werden. Bitte Verbindung prüfen und erneut versuchen.
            </p>
          )}
        </Card>
      ) : (
        <Downloads data={load.data} />
      )}
    </>
  )
}

function Downloads({ data }: { data: ExportData }) {
  const [stamp] = useState(() => toLocalIsoDate())
  const [error, setError] = useState(false)
  const files = csvFiles(data, stamp)

  const save = (filename: string, content: string, type: string) => {
    setError(false)
    saveFile(filename, content, type).catch(() => setError(true))
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="font-semibold">Komplette Sicherung (JSON)</h2>
          <p className="text-sm text-fg-muted">
            Alle Daten in einer Datei – {data.sessions.length} Trainings, {data.records.length}{' '}
            Bestleistungen, {data.bodyMeasurements.length} Körpermessungen,{' '}
            {data.readinessCheckins.length} Check-ins, {data.plannedWorkouts.length} geplante
            Einheiten, {data.customExercises.length} eigene Übungen, {data.skillGoals.length}{' '}
            Skill-Ziele.
          </p>
        </div>
        <Button
          onClick={() =>
            save(
              `hyrox-coach-export-${stamp}.json`,
              JSON.stringify(data, null, 2),
              'application/json',
            )
          }
        >
          JSON herunterladen
        </Button>
      </Card>

      <Card className="flex flex-col gap-1 p-4">
        <h2 className="font-semibold">Tabellen für Excel (CSV)</h2>
        <p className="mb-2 text-xs text-fg-muted">
          Semikolon-getrennt mit Dezimalkomma – öffnet sich in Excel und Numbers direkt richtig.
        </p>
        <ul className="divide-y divide-line">
          {files.map((file) => (
            <li key={file.key} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="font-medium">
                  {file.label} <span className="text-sm text-fg-muted">· {file.rows} Zeilen</span>
                </p>
                <p className="text-xs text-fg-muted">{file.description}</p>
              </div>
              <Button
                variant="secondary"
                className="min-h-10 shrink-0 px-3 text-sm"
                disabled={file.rows === 0}
                onClick={() => save(file.filename, file.content, 'text/csv;charset=utf-8')}
              >
                CSV
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-danger">
          Die Datei konnte nicht gespeichert werden. Bitte versuche es erneut.
        </p>
      )}
      <p className="text-xs text-fg-muted">
        Die Dateien enthalten persönliche Gesundheits- und Trainingsdaten. Bewahre sie sicher auf.
      </p>
    </div>
  )
}
