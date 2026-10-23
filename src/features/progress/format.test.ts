import { describe, expect, it } from 'vitest'
import { formatMinutes } from './format'

describe('formatMinutes', () => {
  it('zeigt Minuten und ab einer Stunde Stunden', () => {
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(60)).toBe('1 h')
    expect(formatMinutes(725.4)).toBe('12 h 05 min')
  })
})
