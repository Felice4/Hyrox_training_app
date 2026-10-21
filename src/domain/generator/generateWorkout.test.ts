import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/data/exercises/vocabulary'
import { generateWorkout } from './generateWorkout'
import { heavyLegDay, LIBRARY, makeInput } from './testFixtures'
import { FOCUSES, type GeneratedWorkout } from './types'

const bySlug = new Map(LIBRARY.map((e) => [e.slug, e]))
const allItems = (w: GeneratedWorkout) => w.blocks.flatMap((b) => b.items)
const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1)

describe('generateWorkout – Pflichttests (SPEC §15)', () => {
  it('1. berücksichtigt die angeforderte Dauer (±10 %) für alle Schwerpunkte', () => {
    const misses: string[] = []
    for (const focus of FOCUSES) {
      for (const durationMin of [30, 45, 60, 90]) {
        for (const seed of SEEDS) {
          const workout = generateWorkout(makeInput({ focus, durationMin }, { seed }))
          const deviation = Math.abs(workout.estimatedDurationMin - durationMin) / durationMin
          if (deviation > 0.1) {
            misses.push(
              `${focus} ${durationMin} min (Seed ${seed}): ${workout.estimatedDurationMin} min`,
            )
          }
        }
      }
    }
    expect(misses).toEqual([])
  })

  it('2. schließt nicht verfügbare Geräte aus', () => {
    const unavailable: Equipment[] = ['sled', 'barbell', 'rower', 'skierg']
    for (const focus of FOCUSES) {
      for (const seed of SEEDS) {
        const workout = generateWorkout(
          makeInput({ focus, unavailableEquipment: unavailable }, { seed }),
        )
        for (const item of allItems(workout)) {
          const equipment = bySlug.get(item.exerciseSlug)?.equipment ?? []
          expect(
            equipment.filter((e) => unavailable.includes(e)),
            item.exerciseSlug,
          ).toEqual([])
        }
      }
    }
  })

  it('2b. hält sich an die im Profil verfügbaren Geräte', () => {
    const input = makeInput({ focus: 'full_body' })
    input.profile = { ...input.profile, availableEquipment: ['dumbbell', 'bench', 'pullup_bar'] }
    for (const seed of SEEDS) {
      const workout = generateWorkout({ ...input, seed })
      for (const item of allItems(workout)) {
        const equipment = bySlug.get(item.exerciseSlug)?.equipment ?? []
        expect(
          equipment.every((e) => ['dumbbell', 'bench', 'pullup_bar'].includes(e)),
          item.exerciseSlug,
        ).toBe(true)
      }
    }
  })

  it('3. trainiert nach schwerem Beintraining keine Beine als Hauptmuskeln im Hauptteil', () => {
    for (const focus of ['strength', 'full_body', 'mixed'] as const) {
      for (const seed of SEEDS) {
        const workout = generateWorkout(makeInput({ focus }, { seed, history: [heavyLegDay()] }))
        const main = workout.blocks.find((b) => b.type === 'main')?.items ?? []
        for (const item of main) {
          const primary = bySlug.get(item.exerciseSlug)?.primaryMuscles ?? []
          expect(
            primary.filter((m) => ['quadriceps', 'glutes'].includes(m)),
            `${focus}/${seed}: ${item.exerciseSlug}`,
          ).toEqual([])
        }
        expect(workout.explanation.join(' ')).toContain('stark beansprucht')
      }
    }
  })
})

describe('generateWorkout – weitere Eigenschaften', () => {
  it('ist deterministisch: gleicher Seed → gleiches Workout', () => {
    for (const focus of FOCUSES) {
      const a = generateWorkout(makeInput({ focus }, { seed: 99 }))
      const b = generateWorkout(makeInput({ focus }, { seed: 99 }))
      expect(a).toEqual(b)
    }
  })

  it('liefert mit anderem Seed Abwechslung', () => {
    const names = new Set(
      SEEDS.map((seed) =>
        allItems(generateWorkout(makeInput({ focus: 'strength' }, { seed })))
          .map((i) => i.exerciseSlug)
          .join(','),
      ),
    )
    expect(names.size).toBeGreaterThan(3)
  })

  it('enthält keine Übung doppelt', () => {
    for (const focus of FOCUSES) {
      for (const seed of SEEDS) {
        const slugs = allItems(
          generateWorkout(makeInput({ focus, durationMin: 90 }, { seed })),
        ).map((i) => i.exerciseSlug)
        expect(new Set(slugs).size).toBe(slugs.length)
      }
    }
  })

  it('baut jedes Workout aus Warm-up, Hauptteil und Cool-down', () => {
    for (const focus of FOCUSES) {
      const types = generateWorkout(makeInput({ focus })).blocks.map((b) => b.type)
      expect(types[0]).toBe('warmup')
      expect(types).toContain('main')
      expect(types.at(-1)).toBe('cooldown')
    }
  })

  it('plant HYROX als Zirkel aus Lauf und Stationen', () => {
    const workout = generateWorkout(makeInput({ focus: 'hyrox' }))
    const main = workout.blocks.find((b) => b.type === 'main')
    expect(main?.rounds).toBeGreaterThanOrEqual(2)
    const stations = main?.items.map((i) => bySlug.get(i.exerciseSlug)?.hyroxStation) ?? []
    expect(stations).toContain('run')
    expect(stations.filter((s) => s && s !== 'run').length).toBeGreaterThanOrEqual(1)
    for (const item of main?.items ?? []) expect(item.sets).toHaveLength(main?.rounds ?? 0)
  })

  it('berücksichtigt gewünschte HYROX-Stationen', () => {
    for (const seed of SEEDS) {
      const workout = generateWorkout(
        makeInput({ focus: 'hyrox', hyroxStations: ['sled_pull'] }, { seed }),
      )
      const stations = allItems(workout).map((i) => bySlug.get(i.exerciseSlug)?.hyroxStation)
      expect(stations).toContain('sled_pull')
    }
  })

  it('meidet Übungen, die eingeschränkte Körperregionen belasten', () => {
    const input = makeInput({ focus: 'hyrox' })
    input.profile = { ...input.profile, limitationRegions: ['knee'] }
    for (const seed of SEEDS) {
      for (const item of allItems(generateWorkout({ ...input, seed }))) {
        expect(bySlug.get(item.exerciseSlug)?.stressRegions, item.exerciseSlug).not.toContain(
          'knee',
        )
      }
    }
  })

  it('plant keine ausgeblendeten Übungen ein', () => {
    const exercises = LIBRARY.map((e) =>
      e.slug === 'back-squat' || e.slug === 'deadlift'
        ? { ...e, preference: 'hidden' as const }
        : e,
    )
    for (const seed of SEEDS) {
      const slugs = allItems(generateWorkout(makeInput({}, { seed, exercises }))).map(
        (i) => i.exerciseSlug,
      )
      expect(slugs).not.toContain('back-squat')
      expect(slugs).not.toContain('deadlift')
    }
  })

  it('senkt bei niedriger Tagesform die Intensität und erklärt das', () => {
    const workout = generateWorkout(
      makeInput({ intensity: 'hard', readiness: { kind: 'quick', level: 'low' } }),
    )
    expect(workout.intensity).toBe('moderate')
    expect(workout.explanation.join(' ')).toContain('Tagesform eher niedrig')
  })

  it('empfiehlt bei sehr niedriger Tagesform eine regenerative Einheit', () => {
    const workout = generateWorkout(
      makeInput({
        readiness: { kind: 'checkin', energy: 1, soreness: 2, sleepQuality: 1, recovery: 2 },
      }),
    )
    expect(workout.recoverySuggested).toBe(true)
  })

  it('erhöht die Intensität bei guter Tagesform nicht automatisch', () => {
    const workout = generateWorkout(
      makeInput({ intensity: 'moderate', readiness: { kind: 'quick', level: 'high' } }),
    )
    expect(workout.intensity).toBe('moderate')
  })

  it('macht Regeneration immer locker', () => {
    expect(generateWorkout(makeInput({ focus: 'recovery', intensity: 'hard' })).intensity).toBe(
      'easy',
    )
  })

  it('gibt ohne Verlauf keine Gewichte vor, sondern einen Hinweis', () => {
    const workout = generateWorkout(makeInput({ focus: 'strength' }))
    const main = workout.blocks.find((b) => b.type === 'main')?.items ?? []
    expect(main.length).toBeGreaterThan(0)
    for (const item of main) {
      expect(item.sets.every((s) => s.weightKg === undefined)).toBe(true)
      expect(item.note).toContain('Startgewicht')
    }
  })

  it('schlägt mit Verlauf ein Gewicht vor', () => {
    const history = [
      {
        startedAt: '2026-10-17T17:00:00.000Z',
        focus: 'strength' as const,
        durationMin: 60,
        sessionRpe: 7,
        exercises: LIBRARY.filter((e) => e.category === 'strength').map((e) => ({
          exerciseSlug: e.slug,
          sets: [{ setType: 'working' as const, completed: true, reps: 12, weightKg: 50, rpe: 7 }],
        })),
      },
    ]
    const workout = generateWorkout(makeInput({ focus: 'strength' }, { history }))
    const main = workout.blocks.find((b) => b.type === 'main')?.items ?? []
    expect(main.some((i) => i.sets.some((s) => s.weightKg !== undefined))).toBe(true)
  })

  it('erklärt jedes Workout mit mindestens einem Satz', () => {
    for (const focus of FOCUSES) {
      const workout = generateWorkout(makeInput({ focus }))
      expect(workout.explanation.length).toBeGreaterThan(0)
      expect(workout.explanation.at(-1)).toContain('Geschätzte Dauer')
    }
  })
})
