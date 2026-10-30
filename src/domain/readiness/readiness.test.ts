import { describe, expect, it } from 'vitest'
import { readinessEffect, readinessScore, readinessStatus, shiftIntensity } from './readiness'

const checkin = (value: number) =>
  ({
    kind: 'checkin',
    energy: value,
    soreness: value,
    sleepQuality: value,
    recovery: value,
  }) as const

describe('readinessScore', () => {
  it('verwendet für die Schnellauswahl feste Werte', () => {
    expect(readinessScore({ kind: 'quick', level: 'low' })).toBe(2)
    expect(readinessScore({ kind: 'quick', level: 'normal' })).toBe(3.5)
    expect(readinessScore({ kind: 'quick', level: 'high' })).toBe(4.5)
    expect(readinessScore(undefined)).toBe(3.5)
  })

  it('mittelt die vier Skalen und begrenzt auf 1–5', () => {
    expect(
      readinessScore({ kind: 'checkin', energy: 4, soreness: 2, sleepQuality: 3, recovery: 3 }),
    ).toBe(3)
    expect(readinessScore(checkin(9))).toBe(5)
  })
})

describe('readinessEffect', () => {
  it('schlägt unter 2,0 eine regenerative Einheit vor', () => {
    const effect = readinessEffect(checkin(1.5))
    expect(effect.recoverySuggested).toBe(true)
    expect(effect.intensityShift).toBe(-1)
    expect(effect.loadFactor).toBe(0.9)
  })

  it('reduziert zwischen 2,0 und 2,9 Intensität und Volumen', () => {
    const effect = readinessEffect({ kind: 'quick', level: 'low' })
    expect(effect).toMatchObject({
      intensityShift: -1,
      volumeFactor: 0.8,
      recoverySuggested: false,
    })
  })

  it('lässt ab 3,0 alles unverändert – auch bei sehr guter Tagesform', () => {
    for (const value of [3, 3.9, 4.5, 5]) {
      expect(readinessEffect(checkin(value))).toMatchObject({ intensityShift: 0, volumeFactor: 1 })
    }
  })
})

describe('shiftIntensity', () => {
  it('verschiebt und begrenzt die Stufe', () => {
    expect(shiftIntensity('hard', -1)).toBe('moderate')
    expect(shiftIntensity('easy', -1)).toBe('easy')
    expect(shiftIntensity('moderate', 5)).toBe('hard')
  })
})

describe('readinessStatus', () => {
  it('ordnet den Score wie der Generator ein', () => {
    expect(readinessStatus(1.75).level).toBe('recovery')
    expect(readinessStatus(2).level).toBe('reduced')
    expect(readinessStatus(2.99).level).toBe('reduced')
    expect(readinessStatus(3).level).toBe('normal')
    expect(readinessStatus(4).level).toBe('good')
  })
})
