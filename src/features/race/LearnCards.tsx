import { Link } from 'react-router'
import { ChevronDownIcon } from '@/components/icons'
import { Card } from '@/components/ui/Card'
import { isUnlocked, LEARN_CARDS, LEARN_STAGE_LABELS, reachedStage } from '@/domain/race/learn'
import { raceTimeline } from '@/domain/race/phases'
import type { Race } from '@/domain/race/race'

/** Wettkampf-Wissen: Lernkarten, passend zur Phase freigeschaltet (docs/RACE_PREP.md §6). */
export function LearnCards({ race, today }: { race: Race; today: string }) {
  const stage = reachedStage(raceTimeline(race), today)
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="eyebrow">Wettkampf-Wissen</h2>
      <ul className="flex flex-col gap-2">
        {LEARN_CARDS.map((card) =>
          isUnlocked(card, stage) ? (
            <li key={card.id}>
              <details className="group rounded-xl bg-surface-high px-4 py-1">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                  {card.title}
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="shrink-0 text-fg-muted transition group-open:rotate-180"
                  />
                </summary>
                <div className="flex flex-col gap-2 pb-3 text-sm text-fg-muted">
                  {card.paragraphs.map((text) => (
                    <p key={text}>{text}</p>
                  ))}
                  {card.links && (
                    <ul className="flex flex-wrap gap-x-4">
                      {card.links.map((link) => (
                        <li key={link.slug}>
                          <Link
                            to={`/exercises/${link.slug}`}
                            className="inline-flex min-h-11 items-center font-medium text-accent"
                          >
                            {link.label} →
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            </li>
          ) : (
            <li
              key={card.id}
              className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-dashed border-line px-4 text-sm text-fg-muted"
            >
              <span>{card.title}</span>
              <span className="shrink-0 text-xs">{LEARN_STAGE_LABELS[card.stage]}</span>
            </li>
          ),
        )}
      </ul>
    </Card>
  )
}
