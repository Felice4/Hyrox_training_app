import { describe, expect, it } from 'vitest'
import { getLibraryExercise } from '@/data/exercises'
import type { Measurement } from '@/data/exercises/vocabulary'
import {
  getMilestone,
  getSkill,
  getStage,
  MILESTONE_LIBRARY,
  milestoneSchema,
  SKILL_AREAS,
  SKILL_LIBRARY,
  skillExerciseSlugs,
  skillSchema,
  type Criterion,
  type MilestoneDefinition,
  type MilestoneMetric,
} from './index'
import { MILESTONES } from './milestones'
import { SKILLS } from './skills'

/** Welche Messarten zu einem Kriterium passen (sonst ist es nie automatisch prüfbar). */
const CRITERION_MEASUREMENTS: Record<Exclude<Criterion['kind'], 'manual'>, Measurement[]> = {
  reps: ['reps', 'weight_reps'],
  hold: ['time', 'weight_time'],
  distance: ['distance', 'distance_time', 'weight_distance'],
}

const METRIC_MEASUREMENTS: Record<Exclude<MilestoneMetric['kind'], 'hyrox_time'>, Measurement[]> = {
  max_reps: ['reps', 'weight_reps'],
  relative_strength: ['weight_reps'],
  best_time: ['distance_time'],
}

const duplicates = (values: readonly string[]) =>
  values.filter((value, index) => values.indexOf(value) !== index)

describe('Skill-Bibliothek', () => {
  it('jeder Skill erfüllt das Schema', () => {
    const problems = SKILLS.flatMap((skill) => {
      const result = skillSchema.safeParse(skill)
      return result.success
        ? []
        : result.error.issues.map((i) => `${skill.slug}: ${i.path.join('.')} – ${i.message}`)
    })
    expect(problems).toEqual([])
  })

  it('Slugs und Namen sind eindeutig', () => {
    expect(duplicates(SKILL_LIBRARY.map((s) => s.slug))).toEqual([])
    expect(duplicates(SKILL_LIBRARY.map((s) => s.name.toLowerCase()))).toEqual([])
  })

  it('alle Übungen der Stufen gibt es in der Übungsbibliothek', () => {
    const missing = SKILL_LIBRARY.flatMap((skill) =>
      skill.stages.flatMap((stage, i) =>
        [
          ...stage.exercises,
          ...stage.criteria.flatMap((c) => (c.kind === 'manual' ? [] : [c.exercise])),
        ]
          .filter((slug) => !getLibraryExercise(slug))
          .map((slug) => `${skill.slug} Stufe ${i + 1} → ${slug}`),
      ),
    )
    expect(missing).toEqual([])
  })

  it('Kriterien passen zur Messart der Übung', () => {
    const mismatches = SKILL_LIBRARY.flatMap((skill) =>
      skill.stages.flatMap((stage, i) =>
        stage.criteria.flatMap((c) => {
          if (c.kind === 'manual') return []
          const measurement = getLibraryExercise(c.exercise)?.measurement
          return measurement && CRITERION_MEASUREMENTS[c.kind].includes(measurement)
            ? []
            : [`${skill.slug} Stufe ${i + 1}: ${c.kind} bei ${c.exercise} (${measurement})`]
        }),
      ),
    )
    expect(mismatches).toEqual([])
  })

  it('ein Kriterium „manual" steht immer allein', () => {
    const mixed = SKILL_LIBRARY.flatMap((skill) =>
      skill.stages
        .map((stage, i) => ({ stage, i }))
        .filter(({ stage }) => stage.criteria.some((c) => c.kind === 'manual'))
        .filter(({ stage }) => stage.criteria.length > 1)
        .map(({ i }) => `${skill.slug} Stufe ${i + 1}`),
    )
    expect(mixed).toEqual([])
  })

  it('Kriterien-Übungen werden in der Stufe auch trainiert', () => {
    const untrained = SKILL_LIBRARY.flatMap((skill) =>
      skill.stages.flatMap((stage, i) =>
        stage.criteria
          .flatMap((c) => (c.kind === 'manual' ? [] : [c.exercise]))
          .filter((slug) => !stage.exercises.includes(slug))
          .map((slug) => `${skill.slug} Stufe ${i + 1} → ${slug}`),
      ),
    )
    expect(untrained).toEqual([])
  })

  it('keine doppelten Übungen innerhalb einer Stufe', () => {
    const problems = SKILL_LIBRARY.flatMap((skill) =>
      skill.stages
        .map((stage, i) => ({ i, dup: duplicates(stage.exercises) }))
        .filter(({ dup }) => dup.length > 0)
        .map(({ i }) => `${skill.slug} Stufe ${i + 1}`),
    )
    expect(problems).toEqual([])
  })

  it('Stufen werden innerhalb derselben Übung schwerer', () => {
    // Folgen zwei Stufen mit derselben Übung aufeinander, muss die Anforderung steigen
    // (Ausnahme: gleicher Wert mit Hinweis zur Ausführung, z. B. langsamere Negative).
    const problems = SKILL_LIBRARY.flatMap((skill) =>
      skill.stages.slice(1).flatMap((stage, index) => {
        const previous = skill.stages[index]!
        return stage.criteria.flatMap((c) => {
          if (c.kind === 'manual') return []
          const before = previous.criteria.find(
            (p) => p.kind === c.kind && 'exercise' in p && p.exercise === c.exercise,
          )
          if (!before) return []
          const value = (x: Criterion) =>
            x.kind === 'reps'
              ? x.reps
              : x.kind === 'hold'
                ? x.seconds
                : x.kind === 'distance'
                  ? x.meters
                  : 0
          const harder = value(c) > value(before) || (value(c) === value(before) && !!stage.note)
          return harder ? [] : [`${skill.slug} Stufe ${index + 2}`]
        })
      }),
    )
    expect(problems).toEqual([])
  })

  it('Voraussetzungen verweisen auf vorhandene Skills und Stufen', () => {
    const broken = SKILL_LIBRARY.filter((skill) => skill.requires).filter((skill) => {
      const required = getSkill(skill.requires!.skill)
      return !required || required.slug === skill.slug || !getStage(required, skill.requires!.stage)
    })
    expect(broken.map((s) => s.slug)).toEqual([])
  })

  it('jeder Bereich hat mindestens einen Skill', () => {
    const areas = new Set(SKILL_LIBRARY.map((s) => s.area))
    expect(SKILL_AREAS.filter((a) => !areas.has(a))).toEqual([])
  })

  it('enthält alle Skills aus docs/SKILLS.md', () => {
    expect(SKILL_LIBRARY.map((s) => s.slug).sort()).toEqual(
      [
        'back-flip',
        'back-lever',
        'box-jump',
        'bridge',
        'dragon-flag',
        'front-lever',
        'front-split',
        'handstand',
        'handstand-push-up',
        'handstand-walk',
        'human-flag',
        'l-sit',
        'muscle-up',
        'nordic-curl',
        'one-arm-pull-up',
        'pike',
        'pistol-squat',
        'side-split',
      ].sort(),
    )
  })

  it('Back Flip: die Salto-Stufen werden nur von Hand bestätigt', () => {
    const backFlip = getSkill('back-flip')!
    const last = backFlip.stages.slice(-2)
    expect(last.every((s) => s.criteria.every((c) => c.kind === 'manual'))).toBe(true)
    expect(backFlip.safety).toMatch(/Trainer/)
  })

  it('Skill-Übungen gehören zur Kategorie „skill" oder sind normale Grundübungen', () => {
    // Fortgeschrittene Progressionen (Schwierigkeit 3, nur für Skills) dürfen nicht im
    // normalen Training landen – sie stehen in der Kategorie „skill".
    const skillOnly = SKILL_LIBRARY.flatMap(skillExerciseSlugs)
      .map((slug) => getLibraryExercise(slug)!)
      .filter((e) => e.category === 'skill')
    expect(skillOnly.length).toBeGreaterThan(30)
    expect(getLibraryExercise('front-lever')?.category).toBe('skill')
    expect(getLibraryExercise('pull-up')?.category).toBe('strength')
  })

  it('getStage zählt ab 1 und lehnt ungültige Nummern ab', () => {
    const muscleUp = getSkill('muscle-up')!
    expect(getStage(muscleUp, 1)?.title).toBe('8 strikte Klimmzüge')
    expect(getStage(muscleUp, 7)?.title).toBe('5 Muscle-Ups am Stück')
    expect(getStage(muscleUp, 0)).toBeUndefined()
    expect(getStage(muscleUp, 8)).toBeUndefined()
    expect(getStage(muscleUp, 1.5)).toBeUndefined()
  })
})

describe('Meilensteine', () => {
  it('jeder Meilenstein erfüllt das Schema', () => {
    const problems = MILESTONES.flatMap((m) => {
      const result = milestoneSchema.safeParse(m)
      return result.success
        ? []
        : result.error.issues.map((i) => `${m.slug}: ${i.path.join('.')} – ${i.message}`)
    })
    expect(problems).toEqual([])
  })

  it('Slugs und Namen sind eindeutig', () => {
    expect(duplicates(MILESTONE_LIBRARY.map((m) => m.slug))).toEqual([])
    expect(duplicates(MILESTONE_LIBRARY.map((m) => m.name))).toEqual([])
  })

  it('Übungen existieren und passen zur Messart', () => {
    const problems = MILESTONE_LIBRARY.flatMap((m) => {
      const metric = m.metric
      if (metric.kind === 'hyrox_time') return []
      const slugs = metric.kind === 'relative_strength' ? [metric.exercise] : metric.exercises
      return slugs
        .filter((slug) => {
          const measurement = getLibraryExercise(slug)?.measurement
          return !measurement || !METRIC_MEASUREMENTS[metric.kind].includes(measurement)
        })
        .map((slug) => `${m.slug} → ${slug}`)
    })
    expect(problems).toEqual([])
  })

  it('Reihen werden vom leichtesten zum schwersten Ziel schwerer', () => {
    const difficulty = (metric: MilestoneMetric) => {
      switch (metric.kind) {
        case 'max_reps':
          return metric.reps
        case 'relative_strength':
          return metric.factor
        case 'best_time':
          return -metric.maxSec
        case 'hyrox_time':
          return -metric.maxSec
      }
    }
    const series = new Map<string, MilestoneDefinition[]>()
    for (const m of MILESTONE_LIBRARY) series.set(m.series, [...(series.get(m.series) ?? []), m])
    const unsorted = [...series].filter(([, items]) =>
      items.some((m, i) => i > 0 && difficulty(m.metric) <= difficulty(items[i - 1]!.metric)),
    )
    expect(unsorted.map(([name]) => name)).toEqual([])
  })

  it('erzeugt die erwarteten Meilensteine', () => {
    expect(getMilestone('pull-ups-20')?.name).toBe('20 strikte Klimmzüge')
    expect(getMilestone('deadlift-2-5x-bodyweight')?.name).toBe('Kreuzheben 2,5 × Körpergewicht')
    expect(getMilestone('run-5k-sub-20')?.metric).toMatchObject({ distanceM: 5000, maxSec: 1200 })
    expect(getMilestone('hyrox-sub-80')?.name).toBe('HYROX unter 1:20 h')
  })
})
