import { describe, expect, it } from 'vitest'
import { toCsv, type CsvColumn } from './csv'

interface Row {
  name: string
  kg?: number
  done: boolean
}

describe('toCsv', () => {
  const columns: CsvColumn<Row>[] = [
    { header: 'Übung', value: (r) => r.name },
    { header: 'Gewicht (kg)', value: (r) => r.kg },
    { header: 'Geschafft', value: (r) => r.done },
  ]

  it('schreibt BOM, Semikolon, Dezimalkomma und CRLF', () => {
    const csv = toCsv([{ name: 'Kniebeuge', kg: 102.5, done: true }], columns)
    expect(csv).toBe('﻿Übung;Gewicht (kg);Geschafft\r\nKniebeuge;102,5;ja\r\n')
  })

  it('maskiert Trenner, Anführungszeichen und Zeilenumbrüche; leere Werte bleiben leer', () => {
    const csv = toCsv([{ name: 'Press "eng"; kniend\nNotiz', done: false }], columns)
    expect(csv.split('\r\n')[1]).toBe('"Press ""eng""; kniend\nNotiz";;nein')
  })
})
