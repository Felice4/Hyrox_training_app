# HYROX-Simulation – Konzept und Umsetzung (Schritt 6.1)

Stand: vom Nutzer freigegeben am 06.11.2026. Entscheidungen des Nutzers: Division beim Start wählbar, Roxzone in der Laufzeit enthalten.

Ziel: Wettkampfnahe Simulationen mit Zwischenzeiten je Lauf und Station, Vergleich mit früheren Simulationen und der Wettkampf-Bestzeit – Schwachstellen erkennen.

---

## 1. Formate und Divisionen

| Format | Ablauf |
|---|---|
| **Komplett** | 8 × (1 km Lauf + Station) |
| **Hälfte 1** | 4 × (1 km + Station): SkiErg 1000 m, Sled Push 50 m, Sled Pull 50 m, Burpee Broad Jumps 80 m |
| **Hälfte 2** | 4 × (1 km + Station): Rudern 1000 m, Farmers Carry 200 m, Sandbag Lunges 100 m, Wall Balls 100 Wdh. |
| **Kurz** | 8 × (500 m + halbe Station) |

Gewichte je Division (`src/domain/simulation/formats.ts`, nach offiziellem Regelwerk – bei Regeländerungen dort anpassen):

| Station | Open Männer | Open Frauen | Pro Männer | Pro Frauen |
|---|---|---|---|---|
| Sled Push (inkl. Schlitten) | 152 kg | 102 kg | 202 kg | 152 kg |
| Sled Pull (inkl. Schlitten) | 103 kg | 78 kg | 153 kg | 103 kg |
| Farmers Carry (je Hand) | 24 kg | 16 kg | 32 kg | 24 kg |
| Sandbag Lunges | 20 kg | 10 kg | 30 kg | 20 kg |
| Wall Balls | 6 kg | 4 kg | 9 kg | 6 kg |

Die Division wird beim Start gewählt; Vorauswahl aus dem Profil (Geschlecht), danach wird die letzte Wahl gemerkt (lokal).

---

## 2. Ablauf in der App

1. **Training → HYROX-Simulation** (`/training/simulation`): Format, Division, Ablauf mit Strecken und Gewichten, letzte Zeit im Format. „Simulation vorbereiten" legt das Training an (wie jedes Training lokal gesichert).
2. **Rennansicht** (Trainingsmodus): „Start" startet die Rennuhr. Großer Knopf **„Abschnitt fertig"** nach jedem Lauf (inkl. Roxzone) und jeder Station. Angezeigt: Gesamtzeit, Rückstand/Vorsprung zur letzten Simulation desselben Formats, aktueller Abschnitt mit Zeit und „Letztes Mal", nächster Abschnitt, alle Zwischenzeiten mit Differenz. „Letzten Tipp zurücknehmen" bei Fehltipp, „Vorzeitig beenden" speichert die geschafften Abschnitte. Bildschirm bleibt an; die Zeiten hängen an Zeitstempeln (stimmen auch nach Sperrbildschirm).
3. **Abschluss** wie jedes Training (Anstrengung, Notiz). Danach Ergebnis: Gesamtzeit, Differenz zur letzten Simulation, bei „Komplett" zur Wettkampf-Bestzeit, alle Abschnitte mit Differenz, die drei größten Zeitverluste markiert.
4. **Statistik → HYROX:** je Format letzte und beste Simulation, Laufen gesamt (Ø je km inkl. Roxzone) und Stationen gesamt mit der längsten Station, Verlauf der Gesamtzeit (bei „Komplett" mit Linie der Wettkampf-Bestzeit), Tabelle „letzte vs. beste Zeit je Abschnitt", Liste aller Simulationen (öffnet das Training).

Der Generator plant Simulationen nicht automatisch ein; keine GPS-Messung.

---

## 3. Daten

- Gespeichert wird ein **normales Training** (`save_workout_session`, Schwerpunkt HYROX, Generator-Version `simulation-1`): je Abschnitt eine Übung (`hyrox-run`, `hyrox-skierg` …) mit einem Satz – Strecke/Wdh./Gewicht und **Zeit** (`duration_sec`). Verlauf, Kalender, Ermüdung, Belastung und Bestleistungen funktionieren damit unverändert.
- Zusätzlich Tabelle **`hyrox_simulations`** (Migration 0009, `docs/DATABASE.md` §3.15): Format, Division, Start, Gesamtzeit und Zwischenzeiten als Liste – für Vergleiche über alle Simulationen, unabhängig vom geladenen Verlauf (90 Tage). Wird direkt nach dem Training gespeichert (idempotent).
- Logik: `src/domain/simulation/` (`formats.ts`, `simulation.ts`, getestet), Oberfläche: `src/features/simulation/`.
