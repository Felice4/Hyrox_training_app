import { LOAD } from './presets'
import type { ExerciseInput } from './schema'

/**
 * Movement Lab (docs/MOVEMENT.md): Mobility-, Bewegungs- und Koordinationsübungen,
 * viele inspiriert von Grapplern, Wrestlern und Boxern. Der Nutzer schickt Übungen samt
 * Video; sie werden hier eingetragen – in der App selbst kann niemand Übungen anlegen.
 *
 * Vorlage für eine neue Übung (Video: src/features/movement/videos.ts):
 *
 *   {
 *     slug: 'movement-hip-switch',          // Präfix „movement-", nie mehr ändern
 *     name: 'Hip Switches',
 *     description: 'Kurz: was die Übung bringt (10–400 Zeichen).',
 *     category: 'movement',
 *     movementGroups: ['mobility'],         // mind. eine Gruppe, siehe vocabulary.ts
 *     combatSports: ['bjj'],                // freiwillig: Herkunft
 *     trainingTypes: ['mobility'],
 *     movementPattern: 'mobility',
 *     primaryMuscles: ['hip_flexors'],
 *     difficulty: 1,                        // 1 Einsteiger · 2 Fortgeschritten · 3 Erfahren
 *     measurement: 'reps',                  // oder 'time'
 *     loadParams: LOAD.movementReps,        // oder movementTime / movementFlow
 *     instructions: ['Schritt 1 …', 'Schritt 2 …'],
 *     hyroxBenefit: 'Wobei die Übung für HYROX hilft.',  // freiwillig
 *     techniqueCues: ['Rumpf stabil halten.'],         // freiwillig
 *   },
 *
 * Vorgaben des Nutzers: „Beschreibung" → instructions (in Schritte geteilt),
 * „Trainingsziel" → description, „HYROX-Nutzen" → hyroxBenefit,
 * „Technikhinweise" → techniqueCues.
 */
export const MOVEMENT_EXERCISES: ExerciseInput[] = [
  {
    slug: 'movement-burpee-plate-overhead',
    name: 'Burpee with Plate to the ground overhead',
    description:
      'Verbesserung der Ganzkörperkoordination, Kraftausdauer und Geschwindigkeit beim Wechsel vom Boden in den Stand.',
    category: 'movement',
    movementGroups: ['ground'],
    trainingTypes: ['coordination', 'conditioning'],
    movementPattern: 'full_body',
    primaryMuscles: ['chest', 'quadriceps', 'glutes', 'front_delts'],
    secondaryMuscles: ['triceps', 'abs'],
    equipment: ['weight_plate'],
    difficulty: 2,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    stressRegions: ['shoulder', 'wrist'],
    instructions: [
      'Starte hinter einer Gewichtsscheibe und begib dich in die Liegestützposition.',
      'Führe einen Liegestütz aus.',
      'Bringe deine Füße wieder nach vorne und richte dich auf.',
      'Greife die Gewichtsscheibe mit beiden Händen und hebe sie über deinen Kopf.',
      'Lege sie anschließend kontrolliert auf dem Boden ab und wiederhole die Bewegung.',
    ],
    hyroxBenefit:
      'Unterstützt schnelle Burpee-Übergänge, insbesondere bei Burpee Broad Jumps, und trainiert die Rumpfstabilität unter Belastung.',
    techniqueCues: [
      'Halte beim Liegestütz deinen Rumpf stabil.',
      'Hebe die Gewichtsscheibe möglichst körpernah und kontrolliert über den Kopf.',
      'Achte beim Aufrichten auf einen stabilen Stand.',
    ],
  },
]
