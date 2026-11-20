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
  {
    slug: 'movement-typewriter-pushup',
    name: 'Typewriter Push-ups (Seitliche Liegestütze)',
    description:
      'Verbesserung der Schulterstabilität, Rumpfspannung, Oberkörperkraft und kontrollierten Gewichtsverlagerung.',
    category: 'movement',
    movementGroups: ['core'],
    trainingTypes: ['stability', 'strength'],
    movementPattern: 'push_horizontal',
    primaryMuscles: ['chest', 'triceps', 'front_delts'],
    secondaryMuscles: ['abs', 'obliques'],
    difficulty: 3,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    stressRegions: ['shoulder', 'wrist'],
    instructions: [
      'Beginne in einer Liegestützposition mit etwas breiter aufgestellten Händen.',
      'Senke deinen Oberkörper Richtung Boden.',
      'Verlagere dein Gewicht abwechselnd nach links und rechts.',
      'Halte deinen Körper dabei möglichst tief und deinen Rumpf angespannt.',
      'Führe die Bewegung kontrolliert und fließend aus.',
    ],
    hyroxBenefit:
      'Unterstützt die Stabilität und Kraftausdauer des Oberkörpers, insbesondere beim Sled Push und bei Burpees.',
    techniqueCues: [
      'Halte deinen Rumpf angespannt und vermeide ein starkes Durchhängen der Hüfte.',
      'Verlagere dein Gewicht kontrolliert zwischen beiden Armen.',
      'Achte darauf, deine Schultern nicht zu überlasten.',
    ],
  },
  {
    slug: 'movement-deep-squat-thoracic-rotation',
    name: 'Deep Squat Thoracic Rotation',
    description:
      'Verbesserung der Beweglichkeit in Hüfte, Sprunggelenken und Brustwirbelsäule sowie der Rotationsfähigkeit des Oberkörpers.',
    category: 'movement',
    movementGroups: ['mobility'],
    trainingTypes: ['mobility'],
    movementPattern: 'mobility',
    primaryMuscles: ['upper_back', 'obliques', 'adductors'],
    secondaryMuscles: ['glutes', 'calves'],
    difficulty: 1,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    stressRegions: ['knee', 'ankle'],
    instructions: [
      'Stelle deine Füße etwas breiter als hüftbreit auf und gehe in eine tiefe Kniebeuge.',
      'Halte deine Fersen möglichst am Boden und positioniere eine Hand zur Stabilisierung vor dir.',
      'Drehe deinen Oberkörper kontrolliert zur Seite und strecke den anderen Arm Richtung Decke.',
      'Folge der Bewegung mit deinem Blick und kehre anschließend in die Ausgangsposition zurück.',
      'Wiederhole die Rotation auf der anderen Seite.',
    ],
    hyroxBenefit:
      'Fördert eine aufrechte und stabile Haltung in der tiefen Kniebeuge, insbesondere bei Wall Balls. Die verbesserte Hüft- und Sprunggelenksbeweglichkeit unterstützt außerdem Lunges und andere tiefe Bewegungspositionen.',
    techniqueCues: [
      'Halte die Fersen möglichst am Boden und die Knie in Richtung deiner Zehenspitzen.',
      'Rotiere hauptsächlich aus der Brustwirbelsäule, ohne die Bewegung zu erzwingen.',
      'Führe die Rotation langsam und kontrolliert aus.',
    ],
  },
  {
    slug: 'movement-180-squat-jump',
    name: '180° Squat Jumps',
    description: 'Explosive Sprünge aus der tiefen Hocke mit halber Drehung und weicher Landung.',
    category: 'movement',
    movementGroups: ['explosive', 'footwork'],
    trainingTypes: ['power', 'coordination'],
    movementPattern: 'jump',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['calves', 'hamstrings'],
    difficulty: 2,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    stressRegions: ['knee', 'ankle'],
    instructions: [
      'Beginne in einer tiefen Kniebeuge und berühre den Boden vor dir mit den Händen.',
      'Springe explosiv nach oben und drehe dich dabei um etwa 180 Grad.',
      'Lande weich in einer tiefen Kniebeuge.',
      'Wiederhole die Bewegung mit einem weiteren Richtungswechsel.',
    ],
    hyroxBenefit: 'Trainiert Sprungkraft, Landekontrolle und schnelle Richtungswechsel.',
  },
  {
    slug: 'movement-spiderman-pushup',
    name: 'Spiderman Push-ups',
    description: 'Liegestütz, bei dem das Knie seitlich zum Ellbogen geführt wird.',
    category: 'movement',
    movementGroups: ['core', 'ground'],
    trainingTypes: ['stability', 'strength'],
    movementPattern: 'push_horizontal',
    primaryMuscles: ['chest', 'triceps', 'obliques'],
    secondaryMuscles: ['front_delts', 'abs', 'hip_flexors'],
    difficulty: 2,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    stressRegions: ['shoulder', 'wrist'],
    instructions: [
      'Starte in der Liegestützposition.',
      'Während du deinen Oberkörper absenkst, führe ein Knie seitlich in Richtung des gleichseitigen Ellbogens.',
      'Drücke dich anschließend nach oben und bringe das Bein zurück.',
      'Wiederhole die Bewegung auf der anderen Seite.',
    ],
    hyroxBenefit:
      'Verbessert die Schulter- und Rumpfstabilität sowie die Körperkontrolle bei Burpees.',
  },
  {
    slug: 'movement-kneeling-squat-dumbbell-rotation',
    name: 'Kneeling-to-Squat Dumbbell Rotations',
    description:
      'Fließender Wechsel zwischen halbem Kniestand und breiter Kniebeuge mit Kurzhantel-Rotation.',
    category: 'movement',
    movementGroups: ['flow', 'core'],
    trainingTypes: ['coordination', 'stability'],
    movementPattern: 'full_body',
    primaryMuscles: ['obliques', 'quadriceps', 'glutes'],
    secondaryMuscles: ['adductors', 'front_delts', 'abs'],
    equipment: ['dumbbell'],
    difficulty: 2,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    stressRegions: ['knee'],
    instructions: [
      'Beginne im halben Kniestand und halte eine Kurzhantel mit beiden Händen vor deinem Körper.',
      'Richte dich in eine breite Kniebeuge auf.',
      'Führe die Hantel kontrolliert quer vor deinem Rumpf zur anderen Seite.',
      'Senke das gegenüberliegende Knie zum Boden und setze die Bewegung fließend fort.',
    ],
    hyroxBenefit:
      'Trainiert koordinierte Positionswechsel, Rumpfrotation und Stabilität bei Lunges.',
  },
  {
    slug: 'movement-squat-one-arm-kick-up',
    name: 'Squat to One-Arm Kick-up',
    description: 'Aus der tiefen Hocke einarmig stützen und die Hüfte kurz nach oben kicken.',
    category: 'movement',
    movementGroups: ['ground', 'balance'],
    trainingTypes: ['coordination', 'stability'],
    movementPattern: 'full_body',
    primaryMuscles: ['front_delts', 'triceps', 'abs'],
    secondaryMuscles: ['obliques', 'quadriceps', 'forearms'],
    difficulty: 3,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    stressRegions: ['shoulder', 'wrist'],
    instructions: [
      'Beginne in einer tiefen Hocke mit den Händen am Boden.',
      'Verlagere dein Gewicht auf eine Hand und stoße dich mit den Beinen kurz vom Boden ab, sodass sich deine Hüfte nach oben bewegt.',
      'Setze beide Füße kontrolliert wieder ab und kehre in die Hocke zurück.',
      'Wechsle anschließend die Stützseite.',
    ],
    hyroxBenefit:
      'Fördert die Körperkontrolle, Hand-Boden-Koordination und Orientierung bei schnellen Bodenbewegungen.',
  },
  {
    slug: 'movement-deep-squat-thoracic-mobility',
    name: 'Deep Squat Thoracic Mobility',
    description:
      'Mobilisation von Hüfte und Brustwirbelsäule: in der tiefen Kniebeuge den oberen Rücken runden und wieder aufrichten.',
    category: 'movement',
    movementGroups: ['mobility'],
    trainingTypes: ['mobility'],
    movementPattern: 'mobility',
    primaryMuscles: ['upper_back', 'adductors'],
    secondaryMuscles: ['glutes', 'calves'],
    difficulty: 1,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    stressRegions: ['knee', 'ankle'],
    instructions: [
      'Gehe in eine tiefe Kniebeuge und lege deine Hände locker hinter den Kopf.',
      'Runde deinen oberen Rücken und neige den Oberkörper kontrolliert nach vorne.',
      'Richte anschließend Brust und Oberkörper wieder auf, ohne die tiefe Kniebeuge zu verlassen.',
    ],
    hyroxBenefit:
      'Verbessert die Beweglichkeit und Oberkörperkontrolle in tiefen Kniebeugen, insbesondere bei Wall Balls.',
  },
  {
    slug: 'movement-pushup-downward-dog',
    name: 'Push-up to Downward Dog',
    description: 'Liegestütz, danach die Hüfte nach oben in den herabschauenden Hund schieben.',
    category: 'movement',
    movementGroups: ['core', 'mobility'],
    trainingTypes: ['stability', 'mobility'],
    movementPattern: 'push_horizontal',
    primaryMuscles: ['chest', 'triceps', 'front_delts'],
    secondaryMuscles: ['abs', 'hamstrings', 'calves'],
    difficulty: 1,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    stressRegions: ['shoulder', 'wrist'],
    instructions: [
      'Starte in der Liegestützposition und führe einen kontrollierten Liegestütz aus.',
      'Strecke anschließend die Arme und schiebe deine Hüfte nach oben und hinten, bis dein Körper ein umgedrehtes V bildet.',
      'Kehre in die Liegestützposition zurück und wiederhole den Ablauf.',
    ],
    hyroxBenefit:
      'Fördert Oberkörperkraft, Körperspannung und Schulterbeweglichkeit für Burpees und stabile Stützpositionen.',
  },
  {
    slug: 'movement-pushup-sit-through',
    name: 'Push-up to Alternating Sit-through',
    description:
      'Liegestütz, danach ein Bein mit Drehung unter dem Körper durchführen – abwechselnd links und rechts.',
    category: 'movement',
    movementGroups: ['ground', 'flow'],
    trainingTypes: ['coordination', 'stability'],
    movementPattern: 'full_body',
    primaryMuscles: ['chest', 'triceps', 'obliques'],
    secondaryMuscles: ['front_delts', 'abs', 'hip_flexors'],
    difficulty: 2,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    stressRegions: ['shoulder', 'wrist'],
    instructions: [
      'Beginne in einer stabilen Stützposition und führe einen Liegestütz aus.',
      'Drehe anschließend deinen Oberkörper zur Seite und führe ein Bein unter deinem Körper hindurch.',
      'Kehre in die Stützposition zurück.',
      'Wiederhole die Kombination auf der anderen Seite.',
    ],
    hyroxBenefit:
      'Verbessert die dynamische Bodenkoordination, Rumpfstabilität und schnelle Positionswechsel bei Burpees.',
  },
  {
    slug: 'movement-hindu-pushup',
    name: 'Hindu Push-ups',
    description:
      'Fließender Liegestütz vom umgedrehten V knapp über dem Boden nach vorne in die geöffnete Brust und zurück.',
    category: 'movement',
    movementGroups: ['flow', 'core'],
    trainingTypes: ['strength', 'mobility'],
    movementPattern: 'push_horizontal',
    primaryMuscles: ['chest', 'triceps', 'front_delts'],
    secondaryMuscles: ['abs', 'lower_back', 'hamstrings'],
    difficulty: 2,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    stressRegions: ['shoulder', 'wrist', 'lower_back'],
    instructions: [
      'Beginne mit breitem Stand und den Händen am Boden, während deine Hüfte nach oben zeigt.',
      'Beuge deine Arme und führe den Oberkörper in einer fließenden Bewegung knapp über dem Boden nach vorne.',
      'Strecke die Arme und öffne deine Brust.',
      'Schiebe anschließend die Hüfte zurück in die Ausgangsposition.',
    ],
    hyroxBenefit:
      'Verbessert Schulterbeweglichkeit, Oberkörperkraft und die kontrollierte Verbindung unterschiedlicher Bodenpositionen.',
  },
  {
    slug: 'movement-lunge-dumbbell-press',
    name: 'Alternating Lunge & Dumbbell Press',
    description:
      'Aus dem breiten Stand mit Drehung in den Ausfallschritt, zurück und die Kurzhantel über den Kopf drücken.',
    category: 'movement',
    movementGroups: ['flow', 'core'],
    trainingTypes: ['coordination', 'strength'],
    movementPattern: 'lunge',
    primaryMuscles: ['quadriceps', 'glutes', 'front_delts'],
    secondaryMuscles: ['triceps', 'obliques', 'adductors'],
    equipment: ['dumbbell'],
    difficulty: 2,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    stressRegions: ['knee', 'shoulder'],
    instructions: [
      'Stelle deine Füße breit auf und halte eine Kurzhantel mit beiden Händen auf Brusthöhe.',
      'Drehe dich in einen Ausfallschritt zur Seite und senke dein hinteres Knie kontrolliert Richtung Boden.',
      'Kehre in den breiten Stand zurück und drücke die Hantel über den Kopf.',
      'Wiederhole die Bewegung zur anderen Seite.',
    ],
    hyroxBenefit:
      'Verbindet Beinkraft, Schulterstabilität und koordinierte Ausfallschritte als Vorbereitung auf Sandbag Lunges und Wall Balls.',
  },
  {
    slug: 'movement-wide-stance-thoracic-rotation',
    name: 'Wide-Stance Thoracic Rotation',
    description:
      'Mobilisation von Brustwirbelsäule und hinterer Beinmuskulatur: im weiten Stand vorgebeugt den Brustkorb abwechselnd zur Seite drehen.',
    category: 'movement',
    movementGroups: ['mobility'],
    trainingTypes: ['mobility'],
    movementPattern: 'mobility',
    primaryMuscles: ['upper_back', 'hamstrings'],
    secondaryMuscles: ['obliques', 'adductors'],
    difficulty: 1,
    measurement: 'reps',
    loadParams: LOAD.movementReps,
    instructions: [
      'Stelle deine Füße weit auseinander und beuge deinen Oberkörper aus der Hüfte nach vorne.',
      'Führe einen Arm in Richtung des gegenüberliegenden Fußes und öffne den anderen Arm nach oben, während du deinen Brustkorb zur Seite drehst.',
      'Wechsle die Seite in einer kontrollierten Bewegung.',
    ],
    hyroxBenefit:
      'Fördert die Rotationsbeweglichkeit der Brustwirbelsäule und eignet sich besonders zur Vorbereitung auf das Training.',
  },
]
