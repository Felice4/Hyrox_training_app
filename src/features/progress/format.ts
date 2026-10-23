/** Minuten lesbar: „45 min", „12 h 05 min". */
export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes)
  if (total < 60) return `${total} min`
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')} min`
}
