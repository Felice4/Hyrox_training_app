/** Verbindet CSS-Klassen und lässt leere/falsche Werte weg: cn('a', isActive && 'b'). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
