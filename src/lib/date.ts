/** Lokales Datum als „JJJJ-MM-TT" (nicht UTC – sonst wäre kurz nach Mitternacht noch „gestern"). */
export function toLocalIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
