import { describe, expect, it } from 'vitest'
import { defaultAppointment, validateAppointment } from './appointment'

describe('validateAppointment', () => {
  it('Vorauswahl braucht nur noch einen Titel', () => {
    const input = defaultAppointment('2026-11-14')
    expect(input).toMatchObject({ focus: 'hyrox', intensity: 'hard', durationMin: 60 })
    expect(validateAppointment(input, '2026-11-12')).toEqual([
      'Titel angeben (z. B. „HYROX Class").',
    ])
    expect(validateAppointment({ ...input, title: 'HYROX Class' }, '2026-11-12')).toEqual([])
  })

  it('prüft Uhrzeit und Datum', () => {
    const input = { ...defaultAppointment('2026-11-11'), title: 'X', startTime: '24:00' }
    expect(validateAppointment(input, '2026-11-12')).toEqual([
      'Uhrzeit angeben.',
      'Termine lassen sich nur für heute oder später planen.',
    ])
  })
})
