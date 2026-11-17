# Kampfsport-Bibliothek und Kampfsport-Training

> Wunsch des Nutzers vom 17.11.2026 (Schritt 6.4). Der Nutzer trainiert Brazilian Jiu Jitsu
> und hat Erfahrung in Boxen, Kickboxen und MMA.

## 1. Ziel

- Unter **Mehr → Kampfsport-Bibliothek** (zwischen „Übungsbibliothek HYROX“ und
  „Datenexport“) stehen sieben Kampfsportarten: Brazilian Jiu Jitsu, Boxen, Kickboxen,
  Taekwondo, MMA, Wrestling, Judo.
- Jede Sportart enthält **Drills von Grundlagen bis Advanced**: Technik, Kombinationen,
  Partnerdrills, Beinarbeit und sportspezifische Athletik.
- Der Nutzer kann **eigene Drills** eintragen, z. B. von Instagram. Dazu gehören Name,
  Sportarten, Stufe, Beschreibung, Ablauf, Sätze, Wiederholungen oder Dauer, Gewicht und
  Pause. Links werden bewusst nicht gespeichert, dafür hat der Nutzer eine eigene Idee.
- Bei BJJ wird zwischen **Gi und NoGi** unterschieden.
- Ein **Kampfsport-Training** kombiniert Drills aus beliebigen Sportarten und läuft im
  normalen Trainingsmodus (Schritt 6.4b).

## 2. Datenmodell

Drills sind **Übungen der Kategorie `combat`** in `public.exercises`. Dadurch funktionieren
Trainingsmodus, Speichern, Verlauf, Statistik und Export ohne Sonderwege. Neu sind diese
Felder:

| Feld (Code / DB) | Bedeutung |
|---|---|
| `combatSports` / `combat_sports text[]` | Sportarten, in denen der Drill erscheint (mind. 1, nur bei `combat`) |
| `giMode` / `gi_mode text` | `gi`, `nogi` oder `both`, nur wenn BJJ dabei ist |
| `difficulty` | Stufe: 1 Grundlagen · 2 Fortgeschritten · 3 Advanced |
| `loadParams.weightKg` | optionales Gewicht in kg (eigene Drills mit Gewicht) |

Migration 0014 fügt die beiden Spalten hinzu. Außerdem übernimmt `sync_exercise_library`
diese Felder.

- **Bibliotheks-Drills** stehen in `src/data/exercises/combat.ts` (72 Drills; `LIBRARY_VERSION` 4).
  Ein Drill, der zu mehreren Sportarten passt, steht nur einmal im Code und erscheint in
  jeder dieser Sportarten, z. B. der Sprawl in MMA, Wrestling und BJJ.
- **Eigene Drills** sind eigene Übungen (`source = custom`, Slug `custom-<uuid>`) mit einem
  vereinfachten Formular.
  - Die Hauptmuskeln werden aus der ersten Sportart abgeleitet (`SPORT_DEFAULT_MUSCLES`)
    oder bei einer Kopie übernommen.
  - Bewegungsmuster ist `full_body`. Trainingsziel ist „Technik“, mit Gewicht zusätzlich
    „Maximalkraft“.
  - Erfassung: Wiederholungen, Zeit/Runden, Gewicht × Wiederholungen oder Gewicht × Zeit.
  - Gespeichert werden Einzelwerte, als Bereich mit gleichem Minimum und Maximum.
- Partner, Sandsack, Pratzen und Matte sind **keine Geräte im Profil**. Sie stehen in der
  Beschreibung, weil Drills nicht automatisch eingeplant werden.

## 3. Abgrenzung zum Trainingsgenerator

- Der Generator plant Drills der Kategorie `combat` **nie** ein (Filter in
  `generateWorkout`).
- Beim Tauschen werden Drills nur gegen andere Drills getauscht (`suggestAlternatives`).
- Die HYROX-Übungsbibliothek (`/exercises`) blendet Drills aus, ebenso die Kategorie im
  Formular für eigene Übungen. Archivierte eigene Drills werden auf der Seite ihrer
  Sportart wiederhergestellt.
- In der Statistik (Übungen, Rekorde) erscheinen trainierte Drills unter „Kampfsport“.

## 4. Oberfläche (6.4a)

| Route | Inhalt |
|---|---|
| `/combat` | Sportarten mit Anzahl der Drills (davon eigene) |
| `/combat/:sport` | „+ Eigenen Drill anlegen“; Filter nach Stufe, bei BJJ zusätzlich Gi/NoGi (beide stehen in der Adresse); Drills nach Stufe gruppiert mit Kurzdosierung; archivierte eigene Drills |
| `/combat/:sport/drill/:slug` | Stufe, Gi/NoGi, Sportarten, Beschreibung, Ablauf, Dosierung; eigener Drill: bearbeiten und archivieren; Bibliothek: „Als eigenen Drill kopieren“ |
| `/combat/:sport/new` (`?from=<slug>`) und `…/drill/:slug/edit` | Formular für eigene Drills |

Die Logik ist rein und getestet:
- `src/domain/combat/drills.ts`: Auswahl je Sportart, Stufe und Gi/NoGi; Gruppierung nach
  Stufe.
- `src/features/combat/drillForm.ts`: Formular → Übung, Prüfung mit deutschen
  Fehlermeldungen.

## 5. Kampfsport-Training (6.4b)

**Einstieg:**
- Karte „Kampfsport-Training“ auf `/combat`
- „Zum Kampfsport-Training hinzufügen“ auf jeder Drill-Seite
- Seite `/combat/training`

**Zusammenstellen:**
- Drills aus allen Sportarten wählen, mit Suche und Sportart-Filter.
- Je Drill ändern: Sätze, Wiederholungen oder Dauer (±15 s), Gewicht (nur bei Erfassung
  mit Gewicht) und Pause.
- Reihenfolge mit ↑/↓ ändern, Drills entfernen.
- Die Auswahl wird lokal je Nutzer gespeichert (`hyrox-coach:combat-plan:<userId>`). So
  bleibt sie beim Stöbern und für Wiederholungen erhalten. „Auswahl leeren“ setzt sie
  zurück.

**Ablauf:**
- **Drill für Drill:** Jeder Drill wird mit seinen Sätzen absolviert, dann folgt der nächste.
- **Zirkel:** Ab 2 Drills möglich, 2–20 Runden. Alle Drills laufen im Wechsel, die Pause
  gilt nur nach dem letzten Drill einer Runde.

**Workout** (`buildCombatWorkout` in `src/domain/combat/workout.ts`, getestet):

| Eigenschaft | Wert |
|---|---|
| Version | `combat-1` |
| Schwerpunkt | „Gemischt“ |
| Intensität | „mittel“ |
| Blöcke | ein Hauptblock, Rolle `skill`, Satzart `working` |
| Vorgaben | Wiederholungen bzw. Dauer, Gewicht, Pause |
| Geschätzte Dauer | 5 s je Wiederholung, 30 s Wechsel je Drill; Zieldauer mindestens 10 min |
| Titel | „Kampfsport: BJJ · Boxen · …“, nach der jeweils ersten Sportart der Drills |

- Neues optionales Feld `GeneratedWorkout.title`. `save_workout_session` speichert es
  bereits seit Migration 0010 in `workout_sessions.title`. Verlauf und Kalender zeigen den
  Titel statt des Schwerpunkts.
- **Start** wie jedes Training (`useStartTraining`): mit Check-in-Verknüpfung, Rückfrage
  bei laufendem Training, Countdown bei Zeit-Drills.
- **Gespeichert** wird wie jedes andere Training: Verlauf, Kalender, Statistik (Gruppe
  „Kampfsport“), Bestleistungen, Export. Keine Migration.
