import type { ExerciseInput } from './schema'

/**
 * Movement Lab (docs/MOVEMENT.md): Mobility-, Bewegungs- und Koordinationsübungen,
 * viele inspiriert von Grapplern, Wrestlern und Boxern. Der Nutzer schickt Übungen samt
 * Video; sie werden hier eingetragen – in der App selbst kann niemand Übungen anlegen.
 *
 * Vorlage für eine neue Übung (Video: src/data/movement/videos.ts):
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
 *   },
 */
export const MOVEMENT_EXERCISES: ExerciseInput[] = []
