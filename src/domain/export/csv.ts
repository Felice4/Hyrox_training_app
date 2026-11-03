/**
 * CSV für Excel mit deutschen Einstellungen: Semikolon als Trenner, Dezimalkomma,
 * UTF-8 mit BOM (sonst zeigt Excel Umlaute falsch an), Zeilenende CRLF.
 */

export type CsvValue = string | number | boolean | null | undefined

export interface CsvColumn<T> {
  header: string
  value: (row: T) => CsvValue
}

const BOM = '﻿'

function formatCell(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'ja' : 'nein'
  const text = typeof value === 'number' ? String(value).replace('.', ',') : value
  // Felder mit Trenner, Anführungszeichen oder Zeilenumbruch in Anführungszeichen setzen
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [
    columns.map((c) => formatCell(c.header)).join(';'),
    ...rows.map((row) => columns.map((c) => formatCell(c.value(row))).join(';')),
  ]
  return BOM + lines.join('\r\n') + '\r\n'
}
