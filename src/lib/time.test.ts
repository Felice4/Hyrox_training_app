import { describe, expect, it } from 'vitest'
import { formatDurationClock, parseDuration } from './time'

describe('parseDuration', () => {
  it('liest m:ss und h:mm:ss', () => {
    expect(parseDuration('4:05')).toBe(245)
    expect(parseDuration('22:30')).toBe(1350)
    expect(parseDuration('1:12:30')).toBe(4350)
  })

  it('liest reine Sekunden', () => {
    expect(parseDuration('90')).toBe(90)
  })

  it('erlaubt Leerzeichen am Rand', () => {
    expect(parseDuration(' 3:30 ')).toBe(210)
  })

  it('lehnt ungültige Eingaben ab', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('abc')).toBeNull()
    expect(parseDuration('4:75')).toBeNull()
    expect(parseDuration('1:2:3:4')).toBeNull()
    expect(parseDuration('0:00')).toBeNull()
    expect(parseDuration('-3:00')).toBeNull()
  })
})

describe('formatDurationClock', () => {
  it('formatiert Minuten und Stunden', () => {
    expect(formatDurationClock(245)).toBe('4:05')
    expect(formatDurationClock(4350)).toBe('1:12:30')
    expect(formatDurationClock(59)).toBe('0:59')
  })

  it('ist die Umkehrung von parseDuration', () => {
    for (const text of ['4:05', '22:30', '1:12:30']) {
      expect(formatDurationClock(parseDuration(text) ?? 0)).toBe(text)
    }
  })
})
