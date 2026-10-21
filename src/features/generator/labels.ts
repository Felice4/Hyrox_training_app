import type { BlockType, Focus, Intensity } from '@/domain/generator/types'

export const FOCUS_LABELS: Record<Focus, string> = {
  hyrox: 'HYROX',
  strength: 'Kraft',
  endurance: 'Ausdauer',
  full_body: 'Ganzkörper',
  mixed: 'Mixed',
  recovery: 'Regeneration',
}

export const INTENSITY_LABELS: Record<Intensity, string> = {
  easy: 'Leicht',
  moderate: 'Mittel',
  hard: 'Hart',
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  warmup: 'Warm-up',
  main: 'Hauptteil',
  accessory: 'Ergänzung',
  conditioning: 'Kondition',
  cooldown: 'Cool-down',
}

export const READINESS_LABELS = { low: 'Eher müde', normal: 'Normal', high: 'Topfit' } as const
