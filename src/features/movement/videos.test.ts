import { describe, expect, it } from 'vitest'
import { getLibraryExercise } from '@/data/exercises'
import { hasMovementVideo, MOVEMENT_VIDEOS, movementVideoFile } from './videos'

describe('Movement-Videos', () => {
  it('jedes Video gehört zu einer Übung des Movement Lab', () => {
    for (const [slug, file] of Object.entries(MOVEMENT_VIDEOS)) {
      expect(getLibraryExercise(slug)?.category, slug).toBe('movement')
      expect(file, slug).toMatch(/^[a-z0-9-]+\.mp4$/)
      expect(file.startsWith(slug), slug).toBe(true)
    }
  })

  it('jede Datei kommt nur einmal vor', () => {
    const files = Object.values(MOVEMENT_VIDEOS)
    expect(new Set(files).size).toBe(files.length)
  })

  it('ohne Eintrag kein Video – auch nicht über geerbte Schlüssel', () => {
    expect(hasMovementVideo('gibt-es-nicht')).toBe(false)
    expect(movementVideoFile('toString')).toBeUndefined()
  })
})
