# Designsystem – HYROX Coach

Stand: 08.11.2026 (Redesign „Premium Dark"). Tokens in `src/styles/index.css`, Bausteine in `src/components/ui/`.

## Grundsätze

- **Dunkel, sportlich, hochwertig:** tiefer, leicht kühler Hintergrund mit dezentem Licht oben (Lime links, Orange rechts), Flächen in drei Höhen, feine Linien.
- **Ein Akzent für Leistung:** Lime (`accent`) für Hauptaktionen, Fortschritt und aktive Zustände; Orange (`hyrox`) für HYROX, Hinweise und Erfolge; Rot (`danger`) nur für Fehler und Löschen.
- **Lesbarkeit vor Effekt:** Text ≥ 4,5:1 auf allen Flächen; abgeschwächter Text nie unter `text-fg-muted/80`.
- **Daumen-tauglich:** Bedienelemente mindestens 44 px hoch (`min-h-11`), Hauptaktionen 48–56 px.
- **Bewegung dezent:** kurze Einblend- und Druck-Animationen; `prefers-reduced-motion` schaltet alles ab.

## Tokens

| Gruppe | Werte |
|---|---|
| Flächen | `canvas` #07080a · `surface` #101216 (Karten) · `surface-raised` #181b21 (Felder, Zeilen) · `surface-high` #21252d (aktiv, Hover) |
| Linien | `line` #252a32 · `line-strong` #333944 (Felder, sekundäre Buttons) |
| Text | `fg` #f5f6f8 · `fg-muted` #a4aab5 |
| Akzente | `accent` #c6f432 · `accent-strong` #d7ff4f (Hover) · `on-accent` · `hyrox` #ff7a1a · `danger` #f25555 |
| Rundungen | `rounded-lg` 10 px · `rounded-xl` 14 px (Bedienelemente) · `rounded-2xl` 20 px (Karten) · `rounded-3xl` 28 px |
| Schatten | `shadow-card` (Karten), `shadow-raised` (Hero, Navigation), `shadow-glow` / `shadow-glow-hyrox` (Hauptaktionen) |
| Animation | `animate-enter` (Seitenwechsel, Karten), `animate-fade` (aufklappen), `animate-pop` (Pause, Hinweise) |
| Schrift | Inter Variable (Text), Barlow Condensed (Überschriften, Zahlen – mit gleich breiten Ziffern) |

## Bausteine und Muster

- **Button:** `primary` (Lime mit Leuchten), `secondary` (erhabene Fläche mit Rahmen), `ghost`. Links, die wie Buttons aussehen, nutzen dieselben Klassen.
- **Card:** `rounded-2xl border-line bg-surface shadow-card`; Hauptkarte des Bildschirms (Hero) zusätzlich mit `border-accent/20 shadow-raised` und weichem Lichtfleck.
- **Abschnittstitel in Karten:** Klasse `eyebrow` (klein, gesperrt, Großbuchstaben).
- **Seitentitel:** `PageHeader` – Barlow Condensed groß, Lime-Strich darunter, Untertitel.
- **Reiter:** Segment-Leiste (`rounded-2xl`, aktiver Reiter `bg-surface-high` mit Rahmen).
- **Felder:** gefüllt (`surface-raised`), Rahmen `line-strong`, Fokus Lime-Rahmen mit weichem Ring.
- **Navigation:** Smartphone – schwebende Leiste mit Pille um das aktive Icon; ab Tablet – Seitenleiste mit Logo-Kachel und Akzentstrich am aktiven Eintrag.
- **Icon-Kacheln:** `rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/20`.
- **Fortschritt:** Balken mit Verlauf (Lime bzw. Orange bei „geschafft").
