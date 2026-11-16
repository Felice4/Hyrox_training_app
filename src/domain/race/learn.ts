import { addDays, weekStartOf } from '@/lib/date'
import type { RacePhase, RaceWeek } from './phases'

/**
 * Wettkampf-Wissen: kurze Lernkarten, die passend zur Phase freigeschaltet werden
 * (docs/RACE_PREP.md §6). Allgemeine Hinweise – keine Ernährungs- oder Medizinberatung.
 */

/** Stufen der Freischaltung in Reihenfolge des Plans. */
export const LEARN_STAGES = ['start', 'build', 'taper', 'race'] as const
export type LearnStage = (typeof LEARN_STAGES)[number]

export const LEARN_STAGE_LABELS: Record<LearnStage, string> = {
  start: 'ab Planbeginn',
  build: 'ab der spezifischen Phase',
  taper: 'ab dem Tapering',
  race: 'ab der Wettkampfwoche',
}

/** Stufe, die eine Phase freischaltet (Entlastung zählt wie die Phase davor). */
const PHASE_STAGE: Record<RacePhase, LearnStage | null> = {
  base: 'start',
  deload: null,
  build: 'build',
  taper: 'taper',
  race: 'race',
  recovery: 'race',
}

export interface LearnCard {
  id: string
  title: string
  stage: LearnStage
  paragraphs: string[]
  /** Verweise auf Übungsbeschreibungen (Slug → Beschriftung) */
  links?: { slug: string; label: string }[]
}

export const LEARN_CARDS: readonly LearnCard[] = [
  {
    id: 'format',
    title: 'Ablauf, Stationen und Roxzone',
    stage: 'start',
    paragraphs: [
      'Ein HYROX besteht aus 8 × 1 km Laufen, nach jedem Kilometer folgt eine Station – immer in derselben Reihenfolge: SkiErg 1000 m, Sled Push 50 m, Sled Pull 50 m, Burpee Broad Jumps 80 m, Rudern 1000 m, Farmers Carry 200 m, Sandbag Lunges 100 m, Wall Balls 100 Wiederholungen.',
      'Die Roxzone ist der Wechselbereich zwischen Laufstrecke und Stationen. Die Zeit dort zählt mit – kurze, zügige Wechsel sparen leicht ein bis zwei Minuten.',
      'Die Uhr läuft vom Start bis ins Ziel durch; Pausen gibt es nur, wenn du sie dir nimmst.',
    ],
  },
  {
    id: 'divisions',
    title: 'Divisionen und Gewichte',
    stage: 'start',
    paragraphs: [
      'Open ist die Standardwertung, Pro hat deutlich schwerere Gewichte. Doubles laufen zu zweit alle 8 km gemeinsam und teilen sich die Arbeit an den Stationen; in der Staffel läuft jede Person 2 × 1 km mit je einer Station.',
      'Die Gewichte deiner Wertung stehen auf der Wettkampf-Seite unter „Stationen und Gewichte“. Im Plan trainierst du im Aufbau mit etwa 80 %, in der spezifischen Phase mit dem vollen Wettkampfgewicht.',
      'Prüfe vor dem Rennen den Athletenguide deines Events – dort stehen die verbindlichen Gewichte und Regeln.',
    ],
  },
  {
    id: 'pacing',
    title: 'Pacing: nicht zu schnell starten',
    stage: 'build',
    paragraphs: [
      'Der häufigste Fehler: Der erste Kilometer ist viel zu schnell, weil die Beine noch frisch sind. Lauf ihn bewusst im Renntempo – das kommt dir langsam vor, zahlt sich aber ab Station 5 aus.',
      'Ziel sind möglichst gleichmäßige Laufzeiten. Nach den schweren Stationen (Sled Push, Sled Pull, Lunges) sind die ersten 200 m oft zäh – das ist normal, das Tempo kommt zurück.',
      'An den Stationen lieber gleichmäßig durcharbeiten als ins Limit gehen und lange stehen: z. B. Wall Balls in festen Blöcken (10–15 Wiederholungen) mit kurzen Pausen.',
    ],
  },
  {
    id: 'technique',
    title: 'Stationstechnik',
    stage: 'build',
    paragraphs: [
      'Saubere Technik spart Kraft und vermeidet ungültige Wiederholungen. Die Kampfrichter achten auf die Bewegungsstandards – z. B. volle Tiefe bei Wall Balls und Lunges, Brust am Boden beim Burpee.',
      'Sled Push: tief und mit kurzen, schnellen Schritten schieben. Sled Pull: Seil Hand über Hand, mit den Beinen stabil stehen. Rudern und SkiErg: gleichmäßiger Zug statt Spitzen.',
      'Die Beschreibungen mit Ausführung und typischen Fehlern findest du in der Übungsbibliothek:',
    ],
    links: [
      { slug: 'hyrox-sled-push', label: 'Sled Push' },
      { slug: 'hyrox-sled-pull', label: 'Sled Pull' },
      { slug: 'hyrox-burpee-broad-jump', label: 'Burpee Broad Jumps' },
      { slug: 'hyrox-sandbag-lunges', label: 'Sandbag Lunges' },
      { slug: 'hyrox-wall-balls', label: 'Wall Balls' },
    ],
  },
  {
    id: 'race_day',
    title: 'Wettkampftag: Ablauf, Aufwärmen, Essen, Ausrüstung',
    stage: 'taper',
    paragraphs: [
      'Ablauf: rechtzeitig da sein (etwa eine Stunde vor deiner Startwelle), Startunterlagen abholen, Wechselbereich und Laufstrecke anschauen.',
      'Aufwärmen: 10–15 min locker laufen, Mobilisation, ein paar Steigerungen und einige Wiederholungen der ersten Stationen – kurz vor dem Start fertig sein.',
      'Essen und Trinken: Iss und trink so, wie du es von harten Trainingstagen kennst – nichts Neues ausprobieren. Das ist ein allgemeiner Hinweis, keine Ernährungsberatung.',
      'Ausrüstung: Laufschuhe mit gutem Grip, bewährte Kleidung, nichts davon zum ersten Mal tragen. Lies im Athletenguide nach, was erlaubt ist.',
    ],
  },
  {
    id: 'after',
    title: 'Nach dem Rennen',
    stage: 'race',
    paragraphs: [
      'Direkt danach: ein paar Minuten locker gehen, trinken und etwas essen.',
      'Die Woche danach ist eine Erholungswoche mit lockerem Laufen. Muskelkater nach dem ersten HYROX ist normal; steig erst wieder voll ein, wenn du dich frisch fühlst.',
      'Schau dir deine Zwischenzeiten an: Wo hast du am meisten Zeit verloren? Das ist der Schwerpunkt für dein nächstes Rennen.',
    ],
  },
]

/**
 * Höchste erreichte Stufe am Datum: vor dem Plan „start“, danach alles; dazwischen die
 * höchste Stufe aller Wochen bis einschließlich der aktuellen.
 */
export function reachedStage(timeline: readonly RaceWeek[], date: string): LearnStage {
  const monday = weekStartOf(date)
  const last = timeline.at(-1)
  if (last && monday > addDays(last.weekStart, 6)) return 'race'
  let rank = 0
  for (const week of timeline) {
    if (week.weekStart > monday) break
    const stage = PHASE_STAGE[week.phase]
    if (stage) rank = Math.max(rank, LEARN_STAGES.indexOf(stage))
  }
  return LEARN_STAGES[rank] ?? 'start'
}

export function isUnlocked(card: LearnCard, stage: LearnStage): boolean {
  return LEARN_STAGES.indexOf(card.stage) <= LEARN_STAGES.indexOf(stage)
}
