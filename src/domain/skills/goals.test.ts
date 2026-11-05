import { describe, expect, it } from 'vitest'
import { getSkill, SKILL_LIBRARY } from '@/data/skills'
import {
  activateAt,
  canActivate,
  completeCurrentStage,
  requirementMet,
  skillState,
  suggestSkills,
  type SkillGoal,
} from './goals'

const goal = (skillSlug: string, status: SkillGoal['status'], completedStages = 0): SkillGoal => ({
  skillSlug,
  status,
  completedStages,
  activatedAt: null,
  achievedAt: null,
})

const muscleUp = getSkill('muscle-up')!
const handstand = getSkill('handstand')!
const hspu = getSkill('handstand-push-up')!

describe('skillState', () => {
  it('ohne Ziel: Stufe 1 ist dran', () => {
    const state = skillState(muscleUp, undefined)
    expect(state).toMatchObject({ status: 'none', completed: 0, total: 7, currentNumber: 1 })
    expect(state.current?.title).toBe('8 strikte Klimmzüge')
  })

  it('zählt geschaffte Stufen und nennt die nächste', () => {
    const state = skillState(muscleUp, goal('muscle-up', 'active', 2))
    expect(state.currentNumber).toBe(3)
    expect(state.current?.title).toBe('10 Dips an der Stange')
  })

  it('alle Stufen geschafft: keine aktuelle Stufe, Werte werden begrenzt', () => {
    const state = skillState(muscleUp, goal('muscle-up', 'achieved', 99))
    expect(state.completed).toBe(7)
    expect(state.currentNumber).toBeUndefined()
    expect(state.current).toBeUndefined()
  })
})

describe('Aktivieren', () => {
  it('erlaubt höchstens drei aktive Ziele', () => {
    const goals = [
      goal('muscle-up', 'active'),
      goal('side-split', 'active'),
      goal('l-sit', 'active'),
    ]
    expect(canActivate(handstand, goals)).toEqual({ ok: false, reason: 'limit' })
    expect(canActivate(handstand, goals.slice(0, 2))).toEqual({ ok: true })
  })

  it('Ziele auf „später" zählen nicht als aktiv', () => {
    const goals = [goal('muscle-up', 'later'), goal('side-split', 'later'), goal('l-sit', 'later')]
    expect(canActivate(handstand, goals)).toEqual({ ok: true })
  })

  it('prüft Voraussetzungen (Handstand-Liegestütz braucht Handstand Stufe 2)', () => {
    expect(requirementMet(hspu, [])).toBe(false)
    expect(canActivate(hspu, [goal('handstand', 'active', 1)])).toEqual({
      ok: false,
      reason: 'requirement',
    })
    expect(canActivate(hspu, [goal('handstand', 'active', 2)])).toEqual({ ok: true })
  })

  it('aktive und erreichte Ziele nicht erneut aktivieren', () => {
    expect(canActivate(muscleUp, [goal('muscle-up', 'active')]).ok).toBe(false)
    expect(canActivate(muscleUp, [goal('muscle-up', 'achieved', 7)]).ok).toBe(false)
  })

  it('Einstufung: Startstufe N bedeutet N − 1 geschaffte Stufen, begrenzt auf gültige Stufen', () => {
    expect(activateAt(muscleUp, 1)).toEqual({ status: 'active', completedStages: 0 })
    expect(activateAt(muscleUp, 4)).toEqual({ status: 'active', completedStages: 3 })
    expect(activateAt(muscleUp, 0)).toEqual({ status: 'active', completedStages: 0 })
    expect(activateAt(muscleUp, 20)).toEqual({ status: 'active', completedStages: 6 })
  })
})

describe('completeCurrentStage', () => {
  it('geht eine Stufe weiter und bleibt aktiv', () => {
    expect(completeCurrentStage(muscleUp, goal('muscle-up', 'active', 2))).toEqual({
      status: 'active',
      completedStages: 3,
    })
  })

  it('nach der letzten Stufe ist das Ziel erreicht', () => {
    expect(completeCurrentStage(muscleUp, goal('muscle-up', 'active', 6))).toEqual({
      status: 'achieved',
      completedStages: 7,
    })
  })
})

describe('suggestSkills', () => {
  it('ohne Ziele: Kraft/Balance und Beweglichkeit vorn, keine Fernziele, keine fehlenden Voraussetzungen', () => {
    const suggestions = suggestSkills(SKILL_LIBRARY, [])
    expect(suggestions).toHaveLength(3)
    expect(suggestions.some((s) => s.kind === 'mobility')).toBe(true)
    expect(suggestions.some((s) => s.kind === 'strength' || s.kind === 'balance')).toBe(true)
    expect(suggestions.some((s) => s.longTerm || s.requires)).toBe(false)
  })

  it('mit aktivem Kraft-Ziel wird Beweglichkeit zuerst vorgeschlagen', () => {
    const suggestions = suggestSkills(SKILL_LIBRARY, [goal('muscle-up', 'active')])
    expect(suggestions[0]?.kind).toBe('mobility')
    expect(suggestions.map((s) => s.slug)).not.toContain('muscle-up')
  })

  it('schlägt nichts vor, wenn drei Ziele aktiv sind', () => {
    const goals = [
      goal('muscle-up', 'active'),
      goal('side-split', 'active'),
      goal('l-sit', 'active'),
    ]
    expect(suggestSkills(SKILL_LIBRARY, goals)).toEqual([])
  })

  it('schlägt freigeschaltete Folge-Skills vor', () => {
    const slugs = suggestSkills(SKILL_LIBRARY, [goal('handstand', 'later', 2)], 20).map(
      (s) => s.slug,
    )
    expect(slugs).toContain('handstand-push-up')
    expect(slugs).not.toContain('handstand-walk')
  })
})
