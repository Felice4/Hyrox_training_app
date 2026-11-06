import { useState } from 'react'
import { Link } from 'react-router'
import { TargetIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/SelectField'
import { getSkill } from '@/data/skills'
import {
  skillPlacement,
  skillsInWorkout,
  type GeneratedWorkout,
  type SkillPractice,
} from '@/domain/generator'
import type { SkillOption } from './skillOptions'

const where = (skillSlug: string) => {
  const skill = getSkill(skillSlug)
  return skill && skillPlacement(skill) === 'cooldown' ? 'im Cool-down' : 'am Ende des Warm-ups'
}

/**
 * „Skill üben" in der Vorschau: Skill-Übungen der aktuellen Stufe für dieses Training
 * einbauen oder entfernen (docs/SKILLS.md §2).
 */
export function SkillPracticeCard({
  workout,
  options,
  onAdd,
  onRemove,
}: {
  workout: GeneratedWorkout
  options: readonly SkillOption[]
  onAdd: (practice: SkillPractice) => void
  onRemove: (skillSlug: string) => void
}) {
  const [open, setOpen] = useState(false)
  const included = skillsInWorkout(workout)
  const optionOf = (slug: string) => options.find((o) => o.practice.skillSlug === slug)
  const activeChoices = options.filter((o) => o.active && !included.includes(o.practice.skillSlug))
  const otherChoices = options.filter((o) => !o.active && !included.includes(o.practice.skillSlug))

  function add(practice: SkillPractice) {
    onAdd(practice)
    setOpen(false)
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <TargetIcon width={18} height={18} className="text-accent" />
          Skill üben
        </h2>
        {!open && (
          <Button variant="ghost" className="min-h-10 px-3 text-sm" onClick={() => setOpen(true)}>
            {included.length > 0 ? 'Anderen Skill' : 'Skill einbauen'}
          </Button>
        )}
      </div>

      {included.length === 0 && !open && (
        <p className="text-sm text-fg-muted">
          Baue die Übungen deiner aktuellen Skill-Stufe in dieses Training ein – kurz nach dem
          Warm-up, solange du frisch bist.
        </p>
      )}

      {included.length > 0 && (
        <ul className="flex flex-col gap-2">
          {included.map((slug) => {
            const option = optionOf(slug)
            return (
              <li
                key={slug}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised px-4 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {option?.name ?? getSkill(slug)?.name ?? slug}
                    {option && (
                      <span className="font-normal text-fg-muted">
                        {' '}
                        · Stufe {option.practice.stage}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-fg-muted">{where(slug)}</p>
                </div>
                <Button
                  variant="ghost"
                  className="min-h-10 shrink-0 px-3 text-sm"
                  onClick={() => onRemove(slug)}
                >
                  Entfernen
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {open && (
        <div className="flex flex-col gap-3">
          {activeChoices.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-fg-muted">Deine Skill-Ziele:</p>
              {activeChoices.map((option) => (
                <button
                  key={option.practice.skillSlug}
                  type="button"
                  onClick={() => add(option.practice)}
                  className="flex min-h-12 flex-col items-start justify-center rounded-xl bg-surface-raised px-4 py-2 text-left hover:bg-line"
                >
                  <span className="font-medium">
                    + {option.name} · Stufe {option.practice.stage}
                  </span>
                  <span className="text-xs text-fg-muted">
                    {option.stageTitle} · {where(option.practice.skillSlug)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-fg-muted">
              Du hast noch kein aktives Skill-Ziel.{' '}
              <Link to="/goals" className="font-medium text-accent">
                Ziele auswählen →
              </Link>
            </p>
          )}
          {otherChoices.length > 0 && (
            <SelectField<string>
              label="Anderer Skill"
              value=""
              options={[
                { value: '', label: 'Skill wählen …' },
                ...otherChoices.map((o) => ({
                  value: o.practice.skillSlug,
                  label: `${o.name} – Stufe ${o.practice.stage}`,
                })),
              ]}
              onChange={(slug) => {
                const option = optionOf(slug)
                if (option) add(option.practice)
              }}
            />
          )}
          <p className="text-xs text-fg-muted">
            Kraft- und Balance-Skills kommen ans Ende des Warm-ups, Beweglichkeit (Spagat, Brücke,
            Pike) ins Cool-down. Pro Training ein Skill je Stelle – ein neuer ersetzt den
            bisherigen.
          </p>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
        </div>
      )}
    </Card>
  )
}
