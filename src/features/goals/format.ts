import { getSkill, type SkillDefinition } from '@/data/skills'
import type { SkillGoalStatus } from '@/domain/skills/goals'
import type { MilestoneProgress, MilestoneUnit } from '@/domain/skills/milestones'
import { formatDurationClock } from '@/lib/time'

export const STATUS_LABELS: Record<SkillGoalStatus, string> = {
  active: 'Aktiv',
  later: 'Später',
  achieved: 'Erreicht',
}

const kg = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

/** 12 → „12 Wdh.", 167.5 → „167,5 kg", 1380 → „23:00". */
export function formatMilestoneValue(value: number, unit: MilestoneUnit): string {
  switch (unit) {
    case 'reps':
      return `${value} Wdh.`
    case 'kg':
      return `${kg.format(value)} kg`
    case 'sec':
      return formatDurationClock(value)
  }
}

/** Kurzer Stand, z. B. „150 von 168 kg" oder „Bestzeit 23:00 · Ziel 22:00". */
export function describeMilestoneProgress(progress: MilestoneProgress): string {
  const { current, target, unit } = progress
  if (progress.missingBodyWeight) return 'Körpergewicht eintragen, um das Ziel zu berechnen'
  if (current === null) return 'Noch kein Wert'
  if (target === null) return formatMilestoneValue(current, unit)
  if (unit === 'sec') {
    return `Bestzeit ${formatMilestoneValue(current, unit)} · Ziel ${formatMilestoneValue(target, unit)}`
  }
  if (unit === 'kg') return `${kg.format(current)} von ${kg.format(target)} kg`
  return `${current} von ${target} Wdh.`
}

/** „Voraussetzung: Freistehender Handstand, Stufe 2" */
export function requirementText(skill: SkillDefinition): string {
  if (!skill.requires) return ''
  const required = getSkill(skill.requires.skill)
  return `Voraussetzung: ${required?.name ?? skill.requires.skill}, Stufe ${skill.requires.stage}`
}
