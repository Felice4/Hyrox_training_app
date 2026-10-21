import type { Equipment } from '@/data/exercises/vocabulary'

/** Gruppierung der Geräte für die Auswahl im Onboarding und Profil. */
export const EQUIPMENT_GROUPS: readonly { label: string; items: readonly Equipment[] }[] = [
  {
    label: 'HYROX & Cardio',
    items: [
      'sled',
      'skierg',
      'rower',
      'wall_ball',
      'sandbag',
      'treadmill',
      'assault_bike',
      'bike_erg',
    ],
  },
  {
    label: 'Freie Gewichte',
    items: [
      'barbell',
      'ez_bar',
      'trap_bar',
      'dumbbell',
      'kettlebell',
      'weight_plate',
      'bench',
      'squat_rack',
      'landmine',
    ],
  },
  {
    label: 'Maschinen & Kabelzug',
    items: [
      'cable_machine',
      'smith_machine',
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
    ],
  },
  {
    label: 'Körpergewicht & Kleingeräte',
    items: [
      'pullup_bar',
      'dip_station',
      'rings',
      'suspension_trainer',
      'resistance_band',
      'medicine_ball',
      'slam_ball',
      'battle_rope',
      'plyo_box',
      'jump_rope',
      'ab_wheel',
      'foam_roller',
    ],
  },
]
