import { describe, expect, it } from 'vitest'
import { EQUIPMENT } from '@/data/exercises/vocabulary'
import { EQUIPMENT_GROUPS } from './equipmentGroups'

describe('EQUIPMENT_GROUPS', () => {
  it('enthält jedes Gerät genau einmal', () => {
    const grouped = EQUIPMENT_GROUPS.flatMap((group) => group.items)
    expect(new Set(grouped).size).toBe(grouped.length)
    expect([...grouped].sort()).toEqual([...EQUIPMENT].sort())
  })
})
