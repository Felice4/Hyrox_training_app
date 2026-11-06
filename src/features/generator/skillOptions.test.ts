import { describe, expect, it } from 'vitest'
import { SKILL_LIBRARY } from '@/data/skills'
import type { SkillGoal } from '@/domain/skills/goals'
import { skillOptions } from './skillOptions'

const goal = (
  skillSlug: string,
  status: SkillGoal['status'],
  completedStages: number,
): SkillGoal => ({
  skillSlug,
  status,
  completedStages,
  activatedAt: null,
  achievedAt: null,
})

describe('Skill-Auswahl in der Vorschau', () => {
  it('aktive Ziele zuerst, mit ihrer aktuellen Stufe', () => {
    const options = skillOptions([goal('handstand', 'active', 2), goal('muscle-up', 'later', 1)])
    expect(options[0]).toMatchObject({
      practice: { skillSlug: 'handstand', stage: 3 },
      active: true,
    })
    expect(options.find((o) => o.practice.skillSlug === 'muscle-up')?.practice.stage).toBe(2)
    expect(options.find((o) => o.practice.skillSlug === 'front-lever')?.practice.stage).toBe(1)
  })

  it('erreichte Skills fehlen', () => {
    const options = skillOptions([goal('box-jump', 'achieved', 99)])
    expect(options.some((o) => o.practice.skillSlug === 'box-jump')).toBe(false)
    expect(options).toHaveLength(SKILL_LIBRARY.length - 1)
  })
})
