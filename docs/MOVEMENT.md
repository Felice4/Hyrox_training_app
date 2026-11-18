# Movement Lab

> Wunsch des Nutzers vom 18.11.2026 (Schritt 6.5). Das Movement Lab **ersetzt die
> Kampfsport-Bibliothek aus 6.4**. Statt Kampfsport-Technik sammelt es Mobility-,
> Bewegungs- und Koordinationsübungen, wie sie MMA-Kämpfer, Wrestler, Grappler und Boxer
> nutzen. Das Ziel bleibt HYROX: sich besser bewegen, um bei HYROX besser zu sein.

## 1. Ziel und Entscheidungen

| Frage | Entscheidung des Nutzers |
|---|---|
| Name | **Movement Lab** unter Mehr (statt „Kampfsport-Bibliothek“). Der App-Name bleibt vorerst; „HYROX“ ist eine geschützte Marke, bei einer Veröffentlichung wird die App umbenannt. |
| Inhalt | Startet **leer**. Der Nutzer liefert Übungen mit Beschreibung und eigenem Video; Claude trägt sie ein. |
| Wer fügt hinzu? | **Nur der Entwickler.** In der App kann niemand Übungen oder Videos anlegen, auch nicht spätere Nutzer. |
| Videos | Der Nutzer nimmt sie selbst auf, schneidet sie zu und gibt sie Claude. Claude komprimiert sie und legt sie im privaten Speicher ab (6.5c). |
| Mobility-Einheit | Bleibt aus 6.4b als **„Mobility-Einheit starten“**, z. B. für Ruhetage. |
| Warm-up/Cool-down | Movement-Übungen **nur auf Wunsch** und **nur** ins Warm-up oder Cool-down, nie in Hauptteil oder Kondition (6.5b). |
| Generator | Plant Movement-Übungen **nie automatisch** ein. |

## 2. Gruppen

Aufteilung nach Ziel, nicht nach Sportart. Eine Übung kann in mehreren Gruppen stehen.

| Wert | Gruppe | Nutzen für HYROX |
|---|---|---|
| `mobility` | Mobilität | Hüfte, Brustwirbelsäule, Schultern, Sprunggelenke – tiefe Wall Balls und Lunges |
| `footwork` | Beinarbeit & Koordination | Rhythmus, Schrittfolgen, Seilspringen – Laufökonomie, Übergänge |
| `ground` | Bodenbewegungen | Shrimps, Rollen, Aufstehen – Burpees, schnell vom Boden hoch |
| `explosive` | Explosivität | Sprawls, Level Changes, Sprünge – Burpee Broad Jumps, Antritt |
| `core` | Rumpf & Stabilität | Bridges, Rotation, Spannung – Sled, Farmers Carry, Rudern |
| `balance` | Balance & Körpergefühl (Idee von Claude) | einbeinig, Gleichgewicht – stabile Knie und Sprunggelenke |
| `flow` | Flows | fließende Abläufe – Aufwärmen, aktive Pause |
| `breathing` | Atmung & Entspannung (Idee von Claude) | Atemübungen – Runterfahren im Cool-down |

Zusätzlich hat jede Übung:
- eine **Stufe**: Einsteiger, Fortgeschritten oder Erfahren;
- optional eine **Herkunft**, z. B. BJJ oder Wrestling. Dafür wird das Feld
  `combatSports` weiterverwendet.

## 3. Datenmodell

- Movement-Übungen sind **Bibliotheksübungen der Kategorie `movement`** in
  `src/data/exercises/movement.ts`. Am Dateianfang steht eine Vorlage. Slugs beginnen mit
  `movement-`.
- **Neues Feld** `movementGroups` / `movement_groups text[]` (Migration 0015). Es ist genau bei
  `movement` Pflicht, sonst leer. `sync_exercise_library` übernimmt das Feld.
- `combatSports` ist bei `movement` freiwillig (Herkunft) und bei `combat` Pflicht. Bei allen
  anderen Kategorien ist es verboten (Schema-Prüfung).
- **Belastungsvorlagen:** `LOAD.movementReps` (1–3 × 6–10), `movementTime` (1–3 × 30–60 s)
  und `movementFlow` (1–3 × 60–120 s), jeweils mit 0–30 s Pause.
- **Generator:** `MANUAL_ONLY_CATEGORIES = ['movement', 'combat']` in `pool.ts`.
  - Diese Kategorien plant der Generator nie ein.
  - Getauscht wird nur innerhalb der Kategorie.
- Neue Rolle **`movement`** für Workout-Einträge (1 Satz als Grunddosierung beim Tausch).

### Umbau der Kampfsport-Bibliothek (6.4)

- Die 72 Kampfsport-Drills sind aus dem Code entfernt (`LIBRARY_VERSION` 5).
  - Der Abgleich **archiviert** sie in der Datenbank.
  - Gespeicherte Trainings, Verlauf und Statistik bleiben unverändert.
- Eigene Drills werden nicht gelöscht. Sie stehen jetzt in der Übungsbibliothek HYROX unter
  „Kampfsport“ und lassen sich dort nur noch archivieren, nicht mehr bearbeiten.
- Das Formular für eigene Drills ist entfernt. Eigene Übungen der Kategorien `movement` und
  `combat` lassen sich nicht anlegen.
- Alte Adressen `/combat/…` leiten auf `/movement` um.
- Die Spalte `gi_mode` bleibt für frühere Drills bestehen, wird aber nicht mehr genutzt.

## 4. Oberfläche (6.5a)

| Route | Inhalt |
|---|---|
| `/movement` | Karte „Mobility-Einheit starten“, Suche, die acht Gruppen mit Anzahl und Nutzen |
| `/movement/:group` | Übungen der Gruppe; Filter nach Stufe und Herkunft (beide in der Adresse); 🎥 bei Übungen mit Video |
| `/movement/exercise/:slug` | Stufe, Gruppen, Beschreibung, Herkunft, Ablauf, Dosierung, „Zur Mobility-Einheit hinzufügen“; später das Video |
| `/movement/training` | Mobility-Einheit, Ablauf wie das Kampfsport-Training aus 6.4b |

**Mobility-Einheit** (`buildMovementWorkout` in `src/domain/movement/session.ts`, getestet):
- Version `movement-1`, Schwerpunkt „Regeneration“, Intensität „leicht“.
- Ein Hauptblock mit Rolle `movement`.
- Titel „Mobility-Einheit: Mobilität · Flows …“.
- 15 s Wechsel je Übung.
- Sätze, Wiederholungen bzw. Dauer, Gewicht (nur bei Erfassung mit Gewicht) und Pause sind
  einstellbar.
- Ablauf „Übung für Übung“ oder Zirkel.
- Die Auswahl wird lokal gespeichert (`hyrox-coach:movement-plan:<userId>`).
- Übungen, die nicht mehr im Movement Lab sind, werden markiert. Dann lässt sich die Einheit
  nicht starten.

Logik in `src/domain/movement/library.ts`, getestet:
- Auswahl je Gruppe, Stufe und Herkunft;
- Herkünfte für die Filter;
- Suche über Name und Beschreibung, unabhängig von Akzenten und Groß-/Kleinschreibung.

`MovementPicker` (Suche und Gruppen-Chips) wird in der Mobility-Einheit und ab 6.5b im
Warm-up/Cool-down verwendet.

Statistik: Trainierte Movement-Übungen erscheinen in der Gruppe „Movement Lab“.

## 5. Geplant

- **6.5b – Movement im Warm-up/Cool-down:** In der Trainingsvorschau (Generator und
  geplante Einheiten) gibt es eine Karte **„Movement einbauen“** direkt bei „Skill üben“,
  mit derselben Bedienung.
  - Man wählt Warm-up oder Cool-down und dann Übungen aus dem Movement Lab.
  - Die Übungen werden mit der unteren Dosierung eingefügt. Einzelne lassen sich wieder
    entfernen oder gegen andere Movement-Übungen tauschen.
  - Während des Trainings kann man keine Übungen einfügen.
- **6.5c – Videos:**
  - Privater Speicher-Bucket in Supabase (Migration). Lesen dürfen nur angemeldete Nutzer.
    Hochgeladen wird nur über die Supabase-CLI des Entwicklers.
  - Zuordnung Slug → Datei in `src/features/movement/videos.ts`.
  - Komprimierung mit ffmpeg: etwa 720p, H.264, ohne Ton, plus Vorschaubild.
  - Anzeige stumm in Schleife auf der Übungsseite.
  - Im Trainingsmodus und in der Übungsansicht der Vorschau gibt es „▶ Video“.
  - Nach dem ersten Ansehen wird das Video auf dem Gerät gespeichert und ist dann offline
    verfügbar.
