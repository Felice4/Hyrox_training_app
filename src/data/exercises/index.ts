/**
 * Übungsbibliothek – zentrale Datenquelle im Code.
 *
 * So pflegst du die Bibliothek:
 * - Übung HINZUFÜGEN: Objekt in der passenden Datei (hyrox.ts, warmup.ts, …) ergänzen.
 *   Pflichtfelder und erlaubte Werte stehen in schema.ts und vocabulary.ts.
 * - Übung ÄNDERN: Felder anpassen. Den `slug` NIE ändern – er verknüpft die Übung
 *   mit gespeicherten Trainings.
 * - Übung ENTFERNEN: Objekt löschen. In der Datenbank wird sie nur archiviert,
 *   damit alte Trainings erhalten bleiben.
 * - Danach LIBRARY_VERSION um 1 erhöhen und `npm run test` ausführen.
 *   Die Tests prüfen alle Übungen (Felder, doppelte Slugs, Verweise auf Alternativen).
 */
import { COOLDOWN_EXERCISES } from './cooldown'
import { HYROX_EXERCISES } from './hyrox'
import { MOBILITY_EXERCISES } from './mobility'
import { exerciseDefinitionSchema, type ExerciseDefinition, type ExerciseInput } from './schema'
import { WARMUP_EXERCISES } from './warmup'

/** Bei JEDER Änderung an der Bibliothek um 1 erhöhen (löst den Abgleich mit der Datenbank aus). */
export const LIBRARY_VERSION = 1

/** Alle Übungen in Rohform, wie sie in den Dateien stehen. */
export const RAW_EXERCISES: readonly ExerciseInput[] = [
  ...HYROX_EXERCISES,
  ...WARMUP_EXERCISES,
  ...MOBILITY_EXERCISES,
  ...COOLDOWN_EXERCISES,
]

/** Geprüfte Übungen mit ergänzten Standardwerten. */
export const EXERCISE_LIBRARY: readonly ExerciseDefinition[] = RAW_EXERCISES.map((exercise) =>
  exerciseDefinitionSchema.parse(exercise),
)

const BY_SLUG = new Map(EXERCISE_LIBRARY.map((exercise) => [exercise.slug, exercise]))

export function getLibraryExercise(slug: string): ExerciseDefinition | undefined {
  return BY_SLUG.get(slug)
}

export type { ExerciseDefinition, ExerciseInput } from './schema'
