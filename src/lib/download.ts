/**
 * Gibt eine Datei an den Nutzer weiter. Auf Touch-Geräten über das Teilen-Menü (iPhone:
 * „In Dateien sichern", als installierte App zuverlässiger als ein Download), sonst als
 * normaler Download.
 */
export async function saveFile(filename: string, content: string, type: string): Promise<void> {
  const file = new File([content], filename, { type })
  const touch = window.matchMedia('(pointer: coarse)').matches
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return
    } catch (error) {
      // Abbrechen im Teilen-Menü ist kein Fehler
      if (error instanceof DOMException && error.name === 'AbortError') return
      // Sonst auf den normalen Download ausweichen
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Kurz warten, damit der Browser die Datei sicher übernommen hat
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
