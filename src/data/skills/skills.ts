import type { SkillInput } from './schema'

/**
 * Skill-Ziele mit Stufen (docs/SKILLS.md §3).
 *
 * So pflegst du die Skills:
 * - Den `slug` eines Skills NIE ändern – er verknüpft das Ziel mit deinem Fortschritt.
 * - Stufen nur hinten anfügen oder Texte/Übungen anpassen. Stufen einfügen oder löschen
 *   verschiebt die Nummern bereits erreichter Stufen.
 * - Kriterien verweisen auf Übungen der Bibliothek (Slug); passende Messart nötig:
 *   reps → Wiederholungen, hold → Zeit, distance → Strecke. Die Tests prüfen das.
 */
export const SKILLS: SkillInput[] = [
  // ---------------------------------------------------------------------------
  // Zug und Lever
  // ---------------------------------------------------------------------------
  {
    slug: 'muscle-up',
    name: 'Muscle-Up',
    description: 'Vom Hang in einer Bewegung über die Stange in den Stütz.',
    area: 'pull',
    kind: 'strength',
    muscles: ['lats', 'upper_back', 'biceps', 'triceps', 'chest'],
    stages: [
      {
        title: '8 strikte Klimmzüge',
        criteria: [{ kind: 'reps', exercise: 'pull-up', reps: 8 }],
        exercises: ['pull-up', 'band-assisted-pull-up'],
      },
      {
        title: '5 Klimmzüge Brust zur Stange',
        criteria: [{ kind: 'reps', exercise: 'chest-to-bar-pull-up', reps: 5 }],
        exercises: ['chest-to-bar-pull-up', 'pull-up'],
      },
      {
        title: '10 Dips an der Stange',
        criteria: [{ kind: 'reps', exercise: 'straight-bar-dip', reps: 10 }],
        exercises: ['straight-bar-dip', 'chest-to-bar-pull-up'],
      },
      {
        title: '3 explosive Klimmzüge bis zur Hüfte',
        criteria: [{ kind: 'reps', exercise: 'explosive-pull-up', reps: 3 }],
        exercises: ['explosive-pull-up', 'straight-bar-dip'],
      },
      {
        title: '3 Muscle-Up-Negative à 5 s',
        criteria: [{ kind: 'reps', exercise: 'muscle-up-negative', reps: 3 }],
        exercises: ['muscle-up-negative', 'explosive-pull-up'],
        note: 'Jede Negative etwa 5 Sekunden langsam.',
      },
      {
        title: '1 Muscle-Up',
        criteria: [{ kind: 'reps', exercise: 'muscle-up', reps: 1 }],
        exercises: ['muscle-up', 'muscle-up-negative', 'explosive-pull-up'],
      },
      {
        title: '5 Muscle-Ups am Stück',
        criteria: [{ kind: 'reps', exercise: 'muscle-up', reps: 5 }],
        exercises: ['muscle-up', 'explosive-pull-up'],
      },
    ],
  },
  {
    slug: 'front-lever',
    name: 'Front Lever',
    description: 'Gestreckter Körper waagrecht unter der Stange, Gesicht nach oben.',
    area: 'pull',
    kind: 'strength',
    muscles: ['lats', 'upper_back', 'abs', 'rear_delts'],
    stages: [
      {
        title: '30 s Hollow Hold und 10 Klimmzüge',
        criteria: [
          { kind: 'hold', exercise: 'hollow-hold', seconds: 30 },
          { kind: 'reps', exercise: 'pull-up', reps: 10 },
        ],
        exercises: ['pull-up', 'hollow-hold'],
      },
      {
        title: '15 s Tuck Front Lever',
        criteria: [{ kind: 'hold', exercise: 'tuck-front-lever', seconds: 15 }],
        exercises: ['tuck-front-lever', 'hollow-hold'],
      },
      {
        title: '10 s Advanced Tuck Front Lever',
        criteria: [{ kind: 'hold', exercise: 'advanced-tuck-front-lever', seconds: 10 }],
        exercises: ['advanced-tuck-front-lever', 'tuck-front-lever'],
      },
      {
        title: '8 s einbeiniger Front Lever',
        criteria: [{ kind: 'hold', exercise: 'one-leg-front-lever', seconds: 8 }],
        exercises: ['one-leg-front-lever', 'advanced-tuck-front-lever'],
        perSide: true,
      },
      {
        title: '5 s Straddle Front Lever',
        criteria: [{ kind: 'hold', exercise: 'straddle-front-lever', seconds: 5 }],
        exercises: ['straddle-front-lever', 'one-leg-front-lever'],
      },
      {
        title: '3 s Front Lever',
        criteria: [{ kind: 'hold', exercise: 'front-lever', seconds: 3 }],
        exercises: ['front-lever', 'straddle-front-lever'],
      },
    ],
  },
  {
    slug: 'back-lever',
    name: 'Back Lever',
    description: 'Gestreckter Körper waagrecht an Ringen oder Stange, Bauch nach unten.',
    area: 'pull',
    kind: 'strength',
    muscles: ['chest', 'front_delts', 'biceps', 'abs'],
    safety: 'Schulter und Bizepssehne langsam an die Dehnung gewöhnen – nie ruckartig.',
    stages: [
      {
        title: '30 s German Hang',
        criteria: [{ kind: 'hold', exercise: 'german-hang', seconds: 30 }],
        exercises: ['german-hang'],
      },
      {
        title: '15 s Tuck Back Lever',
        criteria: [{ kind: 'hold', exercise: 'tuck-back-lever', seconds: 15 }],
        exercises: ['tuck-back-lever', 'german-hang'],
      },
      {
        title: '10 s Advanced Tuck Back Lever',
        criteria: [{ kind: 'hold', exercise: 'advanced-tuck-back-lever', seconds: 10 }],
        exercises: ['advanced-tuck-back-lever', 'tuck-back-lever'],
      },
      {
        title: '8 s Straddle Back Lever',
        criteria: [{ kind: 'hold', exercise: 'straddle-back-lever', seconds: 8 }],
        exercises: ['straddle-back-lever', 'advanced-tuck-back-lever'],
      },
      {
        title: '5 s Back Lever',
        criteria: [{ kind: 'hold', exercise: 'back-lever', seconds: 5 }],
        exercises: ['back-lever', 'straddle-back-lever'],
      },
    ],
  },
  {
    slug: 'one-arm-pull-up',
    name: 'Einarmiger Klimmzug',
    description: 'Klimmzug mit nur einem Arm – Fernziel für sehr starke Zieher.',
    area: 'pull',
    kind: 'strength',
    muscles: ['lats', 'biceps', 'upper_back', 'forearms'],
    longTerm: true,
    safety: 'Ellbogen und Bizepssehne brauchen Zeit – bei Ziehen im Ellbogen pausieren.',
    stages: [
      {
        title: '15 strikte Klimmzüge',
        criteria: [{ kind: 'reps', exercise: 'pull-up', reps: 15 }],
        exercises: ['pull-up', 'chin-up'],
      },
      {
        title: '5 Archer-Klimmzüge je Seite',
        criteria: [{ kind: 'reps', exercise: 'archer-pull-up', reps: 5 }],
        exercises: ['archer-pull-up', 'pull-up'],
        perSide: true,
      },
      {
        title: '3 einarmige Negative à 5 s je Seite',
        criteria: [{ kind: 'reps', exercise: 'one-arm-pull-up-negative', reps: 3 }],
        exercises: ['one-arm-pull-up-negative', 'archer-pull-up'],
        perSide: true,
      },
      {
        title: '1 einarmiger Klimmzug je Seite',
        criteria: [{ kind: 'reps', exercise: 'one-arm-pull-up', reps: 1 }],
        exercises: ['one-arm-pull-up', 'one-arm-pull-up-negative'],
        perSide: true,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Stütz und Handstand
  // ---------------------------------------------------------------------------
  {
    slug: 'handstand',
    name: 'Freistehender Handstand',
    description: 'Handstand ohne Wand – Balance, Schulterkraft und Körperspannung.',
    area: 'push',
    kind: 'balance',
    muscles: ['front_delts', 'triceps', 'traps'],
    safety: 'Zuerst das sichere Ausweichen (seitlich herausdrehen) lernen, freie Fläche.',
    stages: [
      {
        title: '30 s Pike-Stütz auf der Box',
        criteria: [{ kind: 'hold', exercise: 'box-pike-hold', seconds: 30 }],
        exercises: ['box-pike-hold', 'pike-push-up'],
      },
      {
        title: '45 s Handstand Brust zur Wand',
        criteria: [{ kind: 'hold', exercise: 'wall-handstand', seconds: 45 }],
        exercises: ['wall-handstand', 'box-pike-hold'],
      },
      {
        title: '30 s Krähe',
        criteria: [{ kind: 'hold', exercise: 'crow-pose', seconds: 30 }],
        exercises: ['crow-pose', 'wall-handstand'],
      },
      {
        title: '10 kontrollierte Aufschwünge mit Ausweichen',
        criteria: [{ kind: 'reps', exercise: 'handstand-kick-up', reps: 10 }],
        exercises: ['handstand-kick-up', 'wall-handstand'],
        note: 'Wiederholungen über den Satz zählen; jeder Aufschwung endet kontrolliert.',
      },
      {
        title: '5 s freistehend',
        criteria: [{ kind: 'hold', exercise: 'freestanding-handstand', seconds: 5 }],
        exercises: ['freestanding-handstand', 'wall-handstand'],
      },
      {
        title: '15 s freistehend',
        criteria: [{ kind: 'hold', exercise: 'freestanding-handstand', seconds: 15 }],
        exercises: ['freestanding-handstand', 'wall-handstand'],
      },
      {
        title: '30 s freistehend',
        criteria: [{ kind: 'hold', exercise: 'freestanding-handstand', seconds: 30 }],
        exercises: ['freestanding-handstand'],
      },
    ],
  },
  {
    slug: 'handstand-push-up',
    name: 'Handstand-Liegestütz',
    description: 'Liegestütz im Handstand an der Wand – Drückkraft über Kopf.',
    area: 'push',
    kind: 'strength',
    muscles: ['front_delts', 'triceps', 'traps'],
    requires: { skill: 'handstand', stage: 2 },
    stages: [
      {
        title: '10 Pike Push-ups',
        criteria: [{ kind: 'reps', exercise: 'pike-push-up', reps: 10 }],
        exercises: ['pike-push-up'],
      },
      {
        title: '8 Pike Push-ups mit erhöhten Füßen',
        criteria: [{ kind: 'reps', exercise: 'elevated-pike-push-up', reps: 8 }],
        exercises: ['elevated-pike-push-up', 'pike-push-up'],
      },
      {
        title: '5 Negative an der Wand à 3 s',
        criteria: [{ kind: 'reps', exercise: 'wall-hspu-negative', reps: 5 }],
        exercises: ['wall-hspu-negative', 'elevated-pike-push-up'],
      },
      {
        title: '3 Handstand-Liegestütze an der Wand',
        criteria: [{ kind: 'reps', exercise: 'handstand-push-up', reps: 3 }],
        exercises: ['handstand-push-up', 'wall-hspu-negative'],
      },
      {
        title: '8 Handstand-Liegestütze an der Wand',
        criteria: [{ kind: 'reps', exercise: 'handstand-push-up', reps: 8 }],
        exercises: ['handstand-push-up'],
      },
    ],
  },
  {
    slug: 'handstand-walk',
    name: 'Handstand-Gehen',
    description: 'Auf den Händen gehen – kommt nach dem freien Handstand.',
    area: 'push',
    kind: 'balance',
    muscles: ['front_delts', 'triceps', 'forearms'],
    requires: { skill: 'handstand', stage: 5 },
    stages: [
      {
        title: '10 Schulter-Tippen im Wandhandstand',
        criteria: [{ kind: 'reps', exercise: 'wall-handstand-shoulder-taps', reps: 10 }],
        exercises: ['wall-handstand-shoulder-taps', 'freestanding-handstand'],
      },
      {
        title: '3 m Handstand-Gehen',
        criteria: [{ kind: 'distance', exercise: 'handstand-walk', meters: 3 }],
        exercises: ['handstand-walk', 'wall-handstand-shoulder-taps'],
      },
      {
        title: '10 m Handstand-Gehen',
        criteria: [{ kind: 'distance', exercise: 'handstand-walk', meters: 10 }],
        exercises: ['handstand-walk'],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Rumpf und Flaggen
  // ---------------------------------------------------------------------------
  {
    slug: 'l-sit',
    name: 'L-Sit → V-Sit',
    description: 'Stütz mit gestreckten Beinen – Rumpfkraft und Kompression.',
    area: 'core',
    kind: 'strength',
    muscles: ['abs', 'hip_flexors', 'triceps'],
    stages: [
      {
        title: '20 s Tuck L-Sit',
        criteria: [{ kind: 'hold', exercise: 'tuck-l-sit', seconds: 20 }],
        exercises: ['tuck-l-sit', 'hollow-hold'],
      },
      {
        title: '15 s einbeiniger L-Sit je Seite',
        criteria: [{ kind: 'hold', exercise: 'one-leg-l-sit', seconds: 15 }],
        exercises: ['one-leg-l-sit', 'tuck-l-sit'],
        perSide: true,
      },
      {
        title: '15 s L-Sit',
        criteria: [{ kind: 'hold', exercise: 'l-sit', seconds: 15 }],
        exercises: ['l-sit', 'one-leg-l-sit'],
      },
      {
        title: '30 s L-Sit',
        criteria: [{ kind: 'hold', exercise: 'l-sit', seconds: 30 }],
        exercises: ['l-sit', 'hanging-leg-raise'],
      },
      {
        title: '5 s V-Sit',
        criteria: [{ kind: 'hold', exercise: 'v-sit', seconds: 5 }],
        exercises: ['v-sit', 'l-sit'],
      },
    ],
  },
  {
    slug: 'dragon-flag',
    name: 'Dragon Flag',
    description: 'Gestreckter Körper hebt und senkt sich nur über die Schultern gestützt.',
    area: 'core',
    kind: 'strength',
    muscles: ['abs', 'obliques', 'hip_flexors'],
    safety: 'Bei Druck im unteren Rücken zurück zur leichteren Stufe.',
    stages: [
      {
        title: '30 s Hollow Hold',
        criteria: [{ kind: 'hold', exercise: 'hollow-hold', seconds: 30 }],
        exercises: ['hollow-hold', 'hanging-knee-raise'],
      },
      {
        title: '5 Tuck Dragon Flags',
        criteria: [{ kind: 'reps', exercise: 'tuck-dragon-flag', reps: 5 }],
        exercises: ['tuck-dragon-flag', 'hollow-hold'],
      },
      {
        title: '5 Dragon-Flag-Negative à 3 s',
        criteria: [{ kind: 'reps', exercise: 'dragon-flag-negative', reps: 5 }],
        exercises: ['dragon-flag-negative', 'tuck-dragon-flag'],
      },
      {
        title: '3 Dragon Flags',
        criteria: [{ kind: 'reps', exercise: 'dragon-flag', reps: 3 }],
        exercises: ['dragon-flag', 'dragon-flag-negative'],
      },
    ],
  },
  {
    slug: 'human-flag',
    name: 'Human Flag',
    description: 'Seitlich waagrecht an einer senkrechten Stange – Fernziel.',
    area: 'core',
    kind: 'strength',
    muscles: ['obliques', 'lats', 'front_delts', 'side_delts'],
    longTerm: true,
    stages: [
      {
        title: '45 s Seitstütz je Seite und 10 Klimmzüge',
        criteria: [
          { kind: 'hold', exercise: 'side-plank', seconds: 45 },
          { kind: 'reps', exercise: 'pull-up', reps: 10 },
        ],
        exercises: ['side-plank', 'pull-up'],
        perSide: true,
      },
      {
        title: '10 s Flagge mit angezogenen Knien',
        criteria: [{ kind: 'hold', exercise: 'tuck-human-flag', seconds: 10 }],
        exercises: ['tuck-human-flag', 'side-plank'],
        perSide: true,
      },
      {
        title: '5 s Straddle Flag',
        criteria: [{ kind: 'hold', exercise: 'straddle-human-flag', seconds: 5 }],
        exercises: ['straddle-human-flag', 'tuck-human-flag'],
        perSide: true,
      },
      {
        title: '3 s Human Flag',
        criteria: [{ kind: 'hold', exercise: 'human-flag', seconds: 3 }],
        exercises: ['human-flag', 'straddle-human-flag'],
        perSide: true,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Beine
  // ---------------------------------------------------------------------------
  {
    slug: 'pistol-squat',
    name: 'Pistol Squat',
    description: 'Freie einbeinige Kniebeuge bis ganz nach unten.',
    area: 'legs',
    kind: 'strength',
    muscles: ['quadriceps', 'glutes'],
    stages: [
      {
        title: '60 s tiefe Hocke',
        criteria: [{ kind: 'hold', exercise: 'deep-squat-hold', seconds: 60 }],
        exercises: ['deep-squat-hold', 'cossack-squat'],
      },
      {
        title: '8 Pistols auf die Bank je Seite',
        criteria: [{ kind: 'reps', exercise: 'box-pistol-squat', reps: 8 }],
        exercises: ['box-pistol-squat', 'deep-squat-hold'],
        perSide: true,
      },
      {
        title: '5 Pistols mit Halt je Seite',
        criteria: [{ kind: 'reps', exercise: 'assisted-pistol-squat', reps: 5 }],
        exercises: ['assisted-pistol-squat', 'box-pistol-squat'],
        perSide: true,
      },
      {
        title: '1 freier Pistol je Seite',
        criteria: [{ kind: 'reps', exercise: 'pistol-squat', reps: 1 }],
        exercises: ['pistol-squat', 'assisted-pistol-squat'],
        perSide: true,
      },
      {
        title: '5 freie Pistols je Seite',
        criteria: [{ kind: 'reps', exercise: 'pistol-squat', reps: 5 }],
        exercises: ['pistol-squat'],
        perSide: true,
      },
    ],
  },
  {
    slug: 'nordic-curl',
    name: 'Nordic Hamstring Curl',
    description:
      'Exzentrische Kraft der Oberschenkelrückseite – schützt vor Zerrungen, passt gut zu HYROX.',
    area: 'legs',
    kind: 'strength',
    muscles: ['hamstrings'],
    safety: 'Starker Muskelkater in den ersten Wochen – langsam steigern.',
    stages: [
      {
        title: '5 Nordic-Negative à 3 s',
        criteria: [{ kind: 'reps', exercise: 'nordic-curl-negative', reps: 5 }],
        exercises: ['nordic-curl-negative'],
        note: 'Etwa 3 Sekunden absenken, mit den Händen abfangen.',
      },
      {
        title: '5 Nordic-Negative à 6 s',
        criteria: [{ kind: 'reps', exercise: 'nordic-curl-negative', reps: 5 }],
        exercises: ['nordic-curl-negative'],
        note: 'Gezählt wird erst, wenn jede Negative etwa 6 Sekunden dauert.',
      },
      {
        title: '1 voller Nordic Curl',
        criteria: [{ kind: 'reps', exercise: 'nordic-curl', reps: 1 }],
        exercises: ['nordic-curl', 'nordic-curl-negative'],
      },
      {
        title: '5 volle Nordic Curls',
        criteria: [{ kind: 'reps', exercise: 'nordic-curl', reps: 5 }],
        exercises: ['nordic-curl'],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Beweglichkeit
  // ---------------------------------------------------------------------------
  {
    slug: 'side-split',
    name: 'Seitspagat',
    description: 'Beine seitlich ganz gegrätscht bis zum Boden.',
    area: 'mobility',
    kind: 'mobility',
    muscles: ['adductors', 'hamstrings'],
    safety: 'Nur bis zu deutlicher, nie stechender Dehnung. Vorher aufwärmen.',
    stages: [
      {
        title: '60 s Frosch-Dehnung',
        criteria: [{ kind: 'hold', exercise: 'frog-stretch', seconds: 60 }],
        exercises: ['frog-stretch', 'adductor-rockback'],
      },
      {
        title: '60 s Pancake mit Unterarmen am Boden',
        criteria: [{ kind: 'manual' }],
        exercises: ['pancake-stretch', 'frog-stretch'],
      },
      {
        title: 'Seitspagat mit Händen am Boden, Hüfte 20 cm über dem Boden',
        criteria: [{ kind: 'manual' }],
        exercises: ['side-split', 'pancake-stretch'],
      },
      {
        title: 'Seitspagat bis 10 cm über dem Boden',
        criteria: [{ kind: 'manual' }],
        exercises: ['side-split', 'frog-stretch'],
      },
      {
        title: 'Voller Seitspagat',
        criteria: [{ kind: 'manual' }],
        exercises: ['side-split', 'pancake-stretch'],
      },
    ],
  },
  {
    slug: 'front-split',
    name: 'Längsspagat',
    description: 'Ein Bein vorn, eines hinten, Hüfte am Boden – Stufen gelten je Seite.',
    area: 'mobility',
    kind: 'mobility',
    muscles: ['hamstrings', 'hip_flexors'],
    safety: 'Nur bis zu deutlicher, nie stechender Dehnung. Vorher aufwärmen.',
    stages: [
      {
        title: '60 s Couch Stretch je Seite',
        criteria: [{ kind: 'hold', exercise: 'couch-stretch', seconds: 60 }],
        exercises: ['couch-stretch', 'hamstring-stretch'],
        perSide: true,
      },
      {
        title: '60 s halber Spagat je Seite',
        criteria: [{ kind: 'hold', exercise: 'half-split', seconds: 60 }],
        exercises: ['half-split', 'couch-stretch'],
        perSide: true,
      },
      {
        title: 'Längsspagat mit Blöcken, Hüfte 15 cm über dem Boden',
        criteria: [{ kind: 'manual' }],
        exercises: ['front-split', 'half-split', 'couch-stretch'],
        perSide: true,
      },
      {
        title: 'Voller Längsspagat',
        criteria: [{ kind: 'manual' }],
        exercises: ['front-split', 'half-split', 'couch-stretch'],
        perSide: true,
      },
    ],
  },
  {
    slug: 'bridge',
    name: 'Brücke',
    description: 'Volle Brücke bis hin zur Brücke aus dem Stand.',
    area: 'mobility',
    kind: 'mobility',
    muscles: ['front_delts', 'hip_flexors', 'lower_back'],
    safety: 'Bei Schmerz im unteren Rücken abbrechen. Weiche Unterlage.',
    stages: [
      {
        title: '30 s Brücke mit gestreckten Armen',
        criteria: [{ kind: 'hold', exercise: 'bridge-hold', seconds: 30 }],
        exercises: ['bridge-hold', 'hip-flexor-stretch'],
      },
      {
        title: '10 Wand-Gehen in die Brücke',
        criteria: [{ kind: 'reps', exercise: 'wall-walk-bridge', reps: 10 }],
        exercises: ['wall-walk-bridge', 'bridge-hold'],
      },
      {
        title: 'Brücke aus dem Stand mit Wand',
        criteria: [{ kind: 'manual' }],
        exercises: ['standing-bridge', 'wall-walk-bridge'],
      },
      {
        title: 'Brücke aus dem Stand und zurück',
        criteria: [{ kind: 'manual' }],
        exercises: ['standing-bridge', 'bridge-hold'],
      },
    ],
  },
  {
    slug: 'pike',
    name: 'Pike (Kompression)',
    description:
      'Mit gestreckten Beinen weit nach vorn beugen – hilft auch bei L-Sit und Handstand.',
    area: 'mobility',
    kind: 'mobility',
    muscles: ['hamstrings', 'lower_back'],
    stages: [
      {
        title: 'Fingerspitzen am Boden (Beine gestreckt)',
        criteria: [{ kind: 'manual' }],
        exercises: ['standing-pike-fold', 'hamstring-stretch'],
      },
      {
        title: 'Handflächen am Boden',
        criteria: [{ kind: 'manual' }],
        exercises: ['standing-pike-fold', 'seated-pike-stretch'],
      },
      {
        title: '30 s Brust zu den Knien im Sitzen',
        criteria: [{ kind: 'manual' }],
        exercises: ['seated-pike-stretch', 'standing-pike-fold'],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Explosiv
  // ---------------------------------------------------------------------------
  {
    slug: 'back-flip',
    name: 'Back Flip',
    description:
      'Salto rückwärts aus dem Stand. Die App baut die Voraussetzungen auf – der Salto selbst nur mit Trainer.',
    area: 'explosive',
    kind: 'explosive',
    muscles: ['quadriceps', 'glutes', 'calves'],
    safety:
      'Den Salto nur mit Trainer, Hilfestellung und Weichboden üben. Die letzten Stufen bestätigst du selbst.',
    stages: [
      {
        title: '10 Hocksprünge am Stück',
        criteria: [{ kind: 'reps', exercise: 'tuck-jump', reps: 10 }],
        exercises: ['tuck-jump', 'jump-squat'],
      },
      {
        title: '5 saubere Rollen rückwärts',
        criteria: [{ kind: 'reps', exercise: 'backward-roll', reps: 5 }],
        exercises: ['backward-roll', 'tuck-jump'],
      },
      {
        title: '30 s Brücke',
        criteria: [{ kind: 'hold', exercise: 'bridge-hold', seconds: 30 }],
        exercises: ['bridge-hold', 'tuck-jump'],
      },
      {
        title: 'Box Jump 90 cm',
        criteria: [{ kind: 'manual' }],
        exercises: ['box-jump', 'tuck-jump'],
      },
      {
        title: 'Back Flip mit Trainer bzw. Hilfestellung',
        criteria: [{ kind: 'manual' }],
        exercises: ['back-flip-practice', 'tuck-jump'],
        note: 'Nur im Training mit Trainer – danach hier bestätigen.',
      },
      {
        title: 'Back Flip ohne Hilfe',
        criteria: [{ kind: 'manual' }],
        exercises: ['back-flip-practice', 'tuck-jump'],
        note: 'Nur im Training mit Trainer – danach hier bestätigen.',
      },
    ],
  },
  {
    slug: 'box-jump',
    name: 'Box Jump',
    description: 'Beidbeinig auf eine hohe Box springen – Sprungkraft, die auch im HYROX hilft.',
    area: 'explosive',
    kind: 'explosive',
    muscles: ['quadriceps', 'glutes', 'calves'],
    safety: 'Abspringen statt aufsteigen, zurück wird gestiegen. Schienbeine schützen.',
    stages: [
      {
        title: 'Box Jump 75 cm',
        criteria: [{ kind: 'manual' }],
        exercises: ['box-jump', 'tuck-jump'],
      },
      {
        title: 'Box Jump 90 cm',
        criteria: [{ kind: 'manual' }],
        exercises: ['box-jump', 'tuck-jump'],
      },
      {
        title: 'Box Jump 105 cm',
        criteria: [{ kind: 'manual' }],
        exercises: ['box-jump', 'broad-jump'],
      },
      {
        title: 'Box Jump 120 cm',
        criteria: [{ kind: 'manual' }],
        exercises: ['box-jump', 'broad-jump'],
      },
    ],
  },
]
