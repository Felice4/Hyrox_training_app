/**
 * Wertelisten der Übungsbibliothek mit deutschen Bezeichnungen.
 *
 * Neue Werte hier ergänzen: Array erweitern UND Bezeichnung im Label-Objekt eintragen
 * (TypeScript meldet fehlende Bezeichnungen). Werte nie umbenennen, wenn sie schon in der
 * Datenbank stehen – sonst passen gespeicherte Daten nicht mehr.
 */

export const CATEGORIES = [
  'hyrox',
  'strength',
  'endurance',
  'mobility',
  'warmup',
  'cooldown',
  'recovery',
] as const
export type Category = (typeof CATEGORIES)[number]
export const CATEGORY_LABELS: Record<Category, string> = {
  hyrox: 'HYROX',
  strength: 'Kraft',
  endurance: 'Ausdauer',
  mobility: 'Mobility',
  warmup: 'Warm-up',
  cooldown: 'Cool-down',
  recovery: 'Regeneration',
}

export const TRAINING_TYPES = [
  'strength',
  'hypertrophy',
  'power',
  'conditioning',
  'endurance',
  'mobility',
  'stability',
  'coordination',
  'skill',
] as const
export type TrainingType = (typeof TRAINING_TYPES)[number]
export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  strength: 'Maximalkraft',
  hypertrophy: 'Muskelaufbau',
  power: 'Explosivkraft',
  conditioning: 'Kraftausdauer',
  endurance: 'Ausdauer',
  mobility: 'Beweglichkeit',
  stability: 'Stabilität',
  coordination: 'Koordination',
  skill: 'Technik',
}

export const MOVEMENT_PATTERNS = [
  'squat',
  'hinge',
  'lunge',
  'push_horizontal',
  'push_vertical',
  'pull_horizontal',
  'pull_vertical',
  'carry',
  'core',
  'locomotion',
  'jump',
  'full_body',
  'isolation',
  'mobility',
] as const
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number]
export const MOVEMENT_PATTERN_LABELS: Record<MovementPattern, string> = {
  squat: 'Kniebeuge',
  hinge: 'Hüftbeugung',
  lunge: 'Ausfallschritt',
  push_horizontal: 'Drücken horizontal',
  push_vertical: 'Drücken vertikal',
  pull_horizontal: 'Ziehen horizontal',
  pull_vertical: 'Ziehen vertikal',
  carry: 'Tragen',
  core: 'Rumpf',
  locomotion: 'Fortbewegung',
  jump: 'Springen',
  full_body: 'Ganzkörper',
  isolation: 'Isolation',
  mobility: 'Mobilisation',
}

export const MUSCLE_GROUPS = [
  'chest',
  'front_delts',
  'side_delts',
  'rear_delts',
  'triceps',
  'biceps',
  'forearms',
  'lats',
  'upper_back',
  'traps',
  'lower_back',
  'abs',
  'obliques',
  'glutes',
  'quadriceps',
  'hamstrings',
  'adductors',
  'abductors',
  'hip_flexors',
  'calves',
] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Brust',
  front_delts: 'Vordere Schulter',
  side_delts: 'Seitliche Schulter',
  rear_delts: 'Hintere Schulter',
  triceps: 'Trizeps',
  biceps: 'Bizeps',
  forearms: 'Unterarme / Griff',
  lats: 'Latissimus',
  upper_back: 'Oberer Rücken',
  traps: 'Trapez',
  lower_back: 'Unterer Rücken',
  abs: 'Gerade Bauchmuskeln',
  obliques: 'Schräge Bauchmuskeln',
  glutes: 'Gesäß',
  quadriceps: 'Oberschenkel vorne',
  hamstrings: 'Oberschenkel hinten',
  adductors: 'Adduktoren',
  abductors: 'Abduktoren',
  hip_flexors: 'Hüftbeuger',
  calves: 'Waden',
}

export const EQUIPMENT = [
  'barbell',
  'ez_bar',
  'trap_bar',
  'dumbbell',
  'kettlebell',
  'weight_plate',
  'bench',
  'squat_rack',
  'smith_machine',
  'pullup_bar',
  'dip_station',
  'rings',
  'cable_machine',
  'lat_pulldown_machine',
  'seated_row_machine',
  'chest_press_machine',
  'shoulder_press_machine',
  'leg_press',
  'leg_curl_machine',
  'leg_extension_machine',
  'hip_thrust_machine',
  'calf_raise_machine',
  'ghd',
  'landmine',
  'suspension_trainer',
  'resistance_band',
  'medicine_ball',
  'wall_ball',
  'slam_ball',
  'sandbag',
  'sled',
  'battle_rope',
  'plyo_box',
  'jump_rope',
  'ab_wheel',
  'treadmill',
  'rower',
  'skierg',
  'assault_bike',
  'bike_erg',
  'foam_roller',
] as const
export type Equipment = (typeof EQUIPMENT)[number]
export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Langhantel',
  ez_bar: 'SZ-Stange',
  trap_bar: 'Trap Bar',
  dumbbell: 'Kurzhanteln',
  kettlebell: 'Kettlebells',
  weight_plate: 'Hantelscheiben',
  bench: 'Flachbank / Schrägbank',
  squat_rack: 'Kniebeugenständer / Rack',
  smith_machine: 'Multipresse',
  pullup_bar: 'Klimmzugstange',
  dip_station: 'Dip-Barren',
  rings: 'Turnringe',
  cable_machine: 'Kabelzug',
  lat_pulldown_machine: 'Latzugmaschine',
  seated_row_machine: 'Rudermaschine (Kraft)',
  chest_press_machine: 'Brustpresse',
  shoulder_press_machine: 'Schulterpresse',
  leg_press: 'Beinpresse',
  leg_curl_machine: 'Beinbeuger-Maschine',
  leg_extension_machine: 'Beinstrecker-Maschine',
  hip_thrust_machine: 'Hip-Thrust-Maschine',
  calf_raise_machine: 'Wadenmaschine',
  ghd: 'GHD / Rückenstrecker',
  landmine: 'Landmine',
  suspension_trainer: 'Schlingentrainer',
  resistance_band: 'Widerstandsband',
  medicine_ball: 'Medizinball',
  wall_ball: 'Wall Ball',
  slam_ball: 'Slam Ball',
  sandbag: 'Sandbag',
  sled: 'Schlitten (Sled)',
  battle_rope: 'Battle Rope',
  plyo_box: 'Sprungbox',
  jump_rope: 'Springseil',
  ab_wheel: 'Bauchroller',
  treadmill: 'Laufband',
  rower: 'Rudergerät (Ergometer)',
  skierg: 'SkiErg',
  assault_bike: 'Air Bike',
  bike_erg: 'Rad-Ergometer',
  foam_roller: 'Faszienrolle',
}

export const MEASUREMENTS = [
  'weight_reps',
  'reps',
  'weight_distance',
  'weight_time',
  'distance',
  'distance_time',
  'time',
  'calories',
] as const
export type Measurement = (typeof MEASUREMENTS)[number]
export const MEASUREMENT_LABELS: Record<Measurement, string> = {
  weight_reps: 'Gewicht × Wiederholungen',
  reps: 'Wiederholungen',
  weight_distance: 'Gewicht × Strecke',
  weight_time: 'Gewicht × Zeit',
  distance: 'Strecke',
  distance_time: 'Strecke und Zeit',
  time: 'Zeit',
  calories: 'Kalorien',
}

/** Die acht HYROX-Stationen plus Laufen, in Wettkampfreihenfolge. */
export const HYROX_STATIONS = [
  'run',
  'skierg',
  'sled_push',
  'sled_pull',
  'burpee_broad_jump',
  'row',
  'farmers_carry',
  'sandbag_lunges',
  'wall_balls',
] as const
export type HyroxStation = (typeof HYROX_STATIONS)[number]
export const HYROX_STATION_LABELS: Record<HyroxStation, string> = {
  run: 'Laufen',
  skierg: 'SkiErg',
  sled_push: 'Sled Push',
  sled_pull: 'Sled Pull',
  burpee_broad_jump: 'Burpee Broad Jumps',
  row: 'Rudern',
  farmers_carry: 'Farmers Carry',
  sandbag_lunges: 'Sandbag Lunges',
  wall_balls: 'Wall Balls',
}

/** Körperregionen, die eine Übung stark belastet (für Einschränkungen im Profil). */
export const STRESS_REGIONS = [
  'knee',
  'hip',
  'ankle',
  'lower_back',
  'shoulder',
  'elbow',
  'wrist',
] as const
export type StressRegion = (typeof STRESS_REGIONS)[number]
export const STRESS_REGION_LABELS: Record<StressRegion, string> = {
  knee: 'Knie',
  hip: 'Hüfte',
  ankle: 'Sprunggelenk',
  lower_back: 'Unterer Rücken',
  shoulder: 'Schulter',
  elbow: 'Ellbogen',
  wrist: 'Handgelenk',
}

export const DIFFICULTIES = [1, 2, 3] as const
export type Difficulty = (typeof DIFFICULTIES)[number]
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Einsteiger',
  2: 'Fortgeschritten',
  3: 'Erfahren',
}
