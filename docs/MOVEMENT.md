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

## 5. Movement im Warm-up/Cool-down (6.5b)

In der Trainingsvorschau des Generators und bei geplanten Einheiten im Kalender gibt es
direkt unter „Skill üben“ die Karte **„Movement einbauen“** mit derselben Bedienung:

- „Übung einbauen“ öffnet die Auswahl:
  - Zuerst wählt man **Warm-up oder Cool-down**.
  - Darunter steht der `MovementPicker` mit Suche und Gruppen.
  - Jede angetippte Übung wird sofort eingebaut, „Fertig“ schließt die Auswahl.
- Eingebaute Übungen stehen mit ihrer Stelle in der Karte und lassen sich dort entfernen.
  Mit dem normalen Tauschen-Symbol lassen sie sich nur gegen andere Movement-Übungen
  tauschen.
- Die Logik steckt in `src/domain/movement/placement.ts` (getestet):
  - `addMovement` fügt mit der **unteren Dosierung** ein (Rolle `movement`, Satzart
    `working`, geschätzt mit 5 s je Wiederholung und 15 s Wechsel).
  - Im Block steht die Übung **vor den Skill-Übungen**, die am Ende bleiben.
  - Fehlt der Block, wird er angelegt: das Warm-up am Anfang, das Cool-down am Ende.
  - Keine Übung kommt doppelt vor, und nur Übungen der Kategorie `movement` werden
    eingebaut.
  - `removeMovement` entfernt nur Movement-Einträge. Ein leerer Block fällt weg, die
    geschätzte Dauer wird neu berechnet.
- Hauptteil und Kondition sind **nie** möglich. Während des Trainings kann man nichts
  einfügen.
- In der Vorschau führt der Name einer Movement-Übung zur Seite im Movement Lab.

## 6. Videos (6.5c)

**Speicher:** privater Supabase-Bucket `movement-videos` (Migration 0016,
`docs/DATABASE.md` §4a).
- Lesen dürfen nur angemeldete Nutzer.
- Hochladen kann nur der Entwickler über die CLI, nie die App.
- Die Videos liegen bewusst **nicht** im Repository, denn das GitHub-Repository ist
  öffentlich. Rohvideos im Ordner `Videos_exercises/` sind über `.gitignore` ausgeschlossen.

**Zuordnung:** `MOVEMENT_VIDEOS` in `src/features/movement/videos.ts` ordnet einen Slug einer
Datei zu.
- Dateiname: Slug plus Version, z. B. `movement-hip-switch-1.mp4`.
- Ein neues Video derselben Übung bekommt eine neue Version. So lädt das Handy die neue
  Fassung, und „Alle Videos offline speichern“ räumt alte Fassungen weg.
- Ein Test prüft:
  - Jeder Eintrag gehört zu einer Übung der Kategorie `movement`.
  - Jeder Dateiname beginnt mit dem Slug.
  - Kein Dateiname kommt doppelt vor.

**Ablauf für neue Videos** (nur Entwickler):

1. Nutzer legt das zugeschnittene Video in `Videos_exercises/` oder in den Chat und nennt
   Übung, Beschreibung, Gruppe(n), Stufe und Herkunft.
2. Komprimieren mit ffmpeg. Das ist ein lokales Werkzeug, keine Abhängigkeit der App:
   - `ffmpeg-static` liegt in einem Temp-Ordner.
   - Ergebnis: H.264, ohne Ton, längste Seite höchstens 960 px, 30 fps, CRF 28,
     `+faststart`.
   - Ein Testclip mit 5 s schrumpfte von 1,9 MB auf 0,5 MB.
   ```
   ffmpeg -i roh.mp4 -an -vf "scale='if(gt(iw,ih),min(960,iw),-2)':'if(gt(iw,ih),-2,min(960,ih))',fps=30" -c:v libx264 -preset slow -crf 28 -profile:v high -pix_fmt yuv420p -movflags +faststart movement-<slug>-1.mp4
   ```
3. Hochladen:
   ```
   npx supabase storage cp movement-<slug>-1.mp4 ss:///movement-videos/movement-<slug>-1.mp4 --content-type video/mp4 --linked --experimental
   ```
4. Die Übung in `src/data/exercises/movement.ts` eintragen, das Video in `MOVEMENT_VIDEOS`
   eintragen und `LIBRARY_VERSION` erhöhen.

**Anzeige:**
- Auf der Übungsseite im Movement Lab: stumm, in Schleife, im Hochformat begrenzt.
  Antippen hält das Video an.
- Im Trainingsmodus gibt es beim aktuellen Satz **„▶ Video“** zum Aufklappen. Der Info-Knopf
  führt bei Movement-Übungen zur Seite im Movement Lab.
- 🎥 kennzeichnet Übungen mit Video in Listen, in der Auswahl und in der Trainingsvorschau.

**Offline:**
- Das Video wird mit Anmeldung über `storage.download` geladen.
- Danach liegt es im Gerätespeicher (Cache Storage `movement-videos-v1`, unter dem
  Dateinamen als Schlüssel) und wird als Datei abgespielt. Ab dem ersten Ansehen läuft es
  also ohne Internet.
- Auf `/movement` speichert die Karte **„Alle Videos offline speichern“** alle Videos auf
  einmal, z. B. im WLAN vor dem Studio, und zeigt den Stand („3 von 5 gespeichert“).
- Code: `src/features/movement/videoCache.ts`, `useMovementVideo.ts`, `MovementVideo.tsx`,
  `VideoToggle.tsx`; API: `src/api/movementVideos.ts`.
