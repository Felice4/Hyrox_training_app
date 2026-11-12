# Trainer-Sessions und nachgetragene Trainings – Konzept (Schritt 6.2)

Stand: vom Nutzer freigegeben am 12.11.2026 („es soll sonst alles gleich bleiben, nur diese Features ergänzen“).

Entscheidungen des Nutzers (12.11.2026):
- Trainer-Sessions werden **immer mit Übungen und Sätzen** eingetragen.
- Eigene Workouts werden **mit Übungen und Sätzen** nachgetragen.
- Trainer-Termine lassen sich **im Voraus einplanen**; die Wochenplanung nimmt darauf Rücksicht.
- Nachgetragene Trainings und Trainer-Sessions lassen sich **bearbeiten und löschen**; Trainings aus dem Trainingsmodus bleiben wie bisher geschützt (nur Notiz).

Ziel: Jedes Training landet in der App – auch wenn es nicht im Trainingsmodus lief. Damit stimmen Kalender, Belastung, Ermüdung, Bestleistungen, Skill-Stufen und Gewichtsvorschläge.

---

## 1. Bedienung im Kalender

Woche und Monat: Jeder Tag bekommt statt „+ Einheit" den Knopf **„+ Eintragen"** (auch an vergangenen Tagen). Er öffnet eine Auswahl:

| Auswahl | Tage | Ergebnis |
|---|---|---|
| **Training mit Trainer** | heute und Vergangenheit | absolvierte Trainer-Session mit Übungen |
| **Eigenes Workout nachtragen** | heute und Vergangenheit | absolviertes eigenes Training mit Übungen |
| **Trainer-Termin planen** | heute und Zukunft | geplanter Termin (Uhrzeit, Titel, Dauer) |
| **Einheit planen (Generator)** | heute und Zukunft | wie bisher „+ Einheit" |

Im Kalender erkennbar: Trainer-Sessions mit Badge **„Trainer"**, nachgetragene Trainings mit **„Nachgetragen"**, geplante Termine mit Uhrzeit und **„Trainer-Termin"**.

## 2. Formular „Training eintragen" (`/calendar/log/:date`, Bearbeiten `/history/:id/edit`)

1. **Allgemein:** Art (Trainer / eigenes), bei Trainer ein Titel (z. B. „HYROX Class") und optional Trainer/Studio; Schwerpunkt (Vorauswahl HYROX bei Trainer), Uhrzeit, Dauer in Minuten.
2. **Übungen:** „+ Übung" öffnet die Bibliothek mit Suche (inkl. eigener Übungen). Je Übung Sätze mit den passenden Feldern der Übung (Wdh., Gewicht, Strecke, Zeit, Kalorien); „+ Satz" übernimmt die Werte des vorherigen Satzes; Sätze und Übungen entfernen, Reihenfolge verschieben; Block wählbar (Warm-up / Hauptteil / Cool-down, Standard Hauptteil). Mindestens eine Übung mit einem Satz.
3. **Abschluss:** Anstrengung (RPE 1–10, Pflicht), Notiz.
4. **Speichern:** lokaler Entwurf, bis das Speichern geklappt hat (wie im Trainingsmodus). Danach die Bestätigung wie nach dem Training: neue Bestleistungen und „Stufe geschafft!".

Abgeleitet: Intensität aus der RPE (≤ 4 leicht, 5–7 mittel, ≥ 8 hart), Belastung = RPE × Minuten. Alle Sätze gelten als geschafft.

## 3. Trainer-Termin planen

- Felder: Datum, Uhrzeit, Titel, optional Trainer/Studio, Schwerpunkt, erwartete Dauer und Intensität (Vorauswahl HYROX · 60 min · hart).
- Der Termin ist eine geplante Einheit (ohne erzeugtes Workout). Er bleibt bei „Woche neu planen" erhalten, der Tag gilt als belegt, und sein Schwerpunkt fließt in die Verteilung der übrigen Tage ein (keine zwei gleichen harten Schwerpunkte direkt hintereinander – wie heute bei bereits erledigten Tagen).
- Detailseite: verschieben, „Fällt aus", entfernen und **„Als absolviert eintragen"** → Formular aus §2 mit Titel, Schwerpunkt und Dauer vorausgefüllt; beim Speichern wird der Termin erledigt.

## 4. Bearbeiten und löschen

- Detailseite eines Trainings (`/history/:id`): bei Trainer-Sessions und nachgetragenen Trainings **„Bearbeiten"** und **„Löschen"** (mit Rückfrage). Trainings aus dem Trainingsmodus und Simulationen: unverändert nur Notiz.
- Bestleistungen bleiben korrekt: Beim Bearbeiten oder Löschen werden die Bestleistungen der betroffenen Übungen aus allen verbleibenden Trainings neu berechnet (Rekorde aus anderen Trainings und von Hand eingetragene Werte bleiben unangetastet).
- Eine erledigte Einheit im Kalender, deren Training gelöscht wird, wird wieder „geplant" (bzw. „nicht absolviert", falls vergangen).

## 5. Daten (Migration 0010)

- `workout_sessions.source`: `app` (Trainingsmodus, Standard für alle bisherigen) · `manual` (nachgetragen) · `trainer`; dazu `title` und `coach` (optional, je bis 120 Zeichen).
- `planned_workouts.source` zusätzlich `trainer`; neue Spalten `title`, `coach`, `start_time`.
- `save_workout_session` speichert die neuen Felder; Speichern bleibt idempotent (Bearbeiten = erneutes Speichern mit denselben IDs).
- Neue Funktion zum Löschen eines Trainings (nur `manual`/`trainer`): setzt die geplante Einheit zurück und entfernt die Bestleistungen, die aus diesem Training stammen; die Neuberechnung erfolgt in der App mit der bestehenden Rekorderkennung.
- RLS unverändert über `auth.uid()`; Export enthält die neuen Felder.

Keine Änderung am Trainingsmodus, Generator-Algorithmus oder an der Simulation.

## 6. Umsetzung in Teilschritten

| Schritt | Inhalt |
|---|---|
| **6.2a** | Migration 0010 + Logik (Formular → Speicher-Nutzlast, Intensität/Belastung, Rekord-Neuberechnung) mit Tests |
| **6.2b** | Formular „Training eintragen", „+ Eintragen" im Kalender, Badges, Bestätigung |
| **6.2c** | Trainer-Termin planen, „Als absolviert eintragen", Rücksicht in der Wochenplanung |
| **6.2d** | Bearbeiten und Löschen auf der Detailseite |
