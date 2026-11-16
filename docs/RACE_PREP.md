# Wettkampfvorbereitung – Konzept (Schritt 6.3)

Stand: vom Nutzer freigegeben am 15.11.2026 („Passt, fangen wir einfach einmal an“).

Entscheidungen des Nutzers (15.11.2026):
- Eigener Wettkampf: **Singles, Open, Männer**, Termin im Jänner 2027. In der App sind **alle Varianten wählbar** (Singles / Doubles / Staffel, Open / Pro, Männer / Frauen / Mixed). Die Einheiten passen sich an die gewählte Variante an.
- **3–4 Trainingstage pro Woche**, Montag und Mittwoch nicht möglich.
- Noch **keine Zielzeit und keine Erfahrung**. Die App soll beim Lernen helfen (Einstiegstest, Zielzeit-Vorschlag, Erklärungen).
- Es ist immer nur **ein Wettkampf aktiv**.

Ziel: Datum eingeben, und die App plant bis zum Wettkampf in Phasen. Sie legt fest, wie oft, was und wie intensiv trainiert wird, mit Laufen unter Vorbelastung („Kompromiss-Lauf“), Entlastungswochen und Tapering. Dabei erklärt sie, warum.

Alles Bestehende bleibt erhalten. Ohne aktiven Wettkampf plant die App wie bisher.

---

## 1. Wettkampf anlegen (`/race`, erreichbar über Dashboard und „Mehr“)

| Feld | Werte | Hinweis |
|---|---|---|
| Name / Ort | Text, z. B. „HYROX Wien“ | Pflicht |
| Datum | heute + mind. 7 Tage | Pflicht |
| Format | Singles · Doubles · Staffel | Standard Singles |
| Kategorie | Open · Pro | Pro nur bei Singles und Doubles |
| Wertung | Männer · Frauen · Mixed | Mixed nur bei Doubles und Staffel |
| Trainingstage pro Woche | 3–5 | Vorschlag aus dem Profil |
| Trainingstage | Wochentage | Vorschlag aus dem Profil (hier: Di, Do, Sa, So) |
| Zielzeit | optional | Ohne Angabe schlägt die App nach dem Einstiegstest eine vor (§6) |

Es ist höchstens **ein** Wettkampf aktiv: Status `active`, danach `completed` oder `cancelled`. Bearbeiten ist jederzeit möglich. Bei einem neuen Datum werden die Phasen neu berechnet, vergangene Einheiten bleiben unverändert.

**Gewichte:** Die vorhandene Tabelle in `src/domain/simulation/formats.ts` (Open/Pro × Männer/Frauen) wird um die Teamwertungen ergänzt:
- Doubles Männer/Frauen: Gewichte der Open-Wertung (Pro Doubles: Pro).
- Doubles Mixed: nur als Open. Das offizielle Doubles-Regelwerk 2025/26 führt für Mixed keine eigene Gewichtsspalte; laut gängigen Übersichten gelten die Gewichte der Männer. Die App nutzt diese und weist auf den Athletenguide des Events hin (geprüft am 15.11.2026).
- Staffel: Gewichte der jeweiligen Person (Männer/Frauen).

## 2. Phasen bis zum Wettkampf (reine Logik `src/domain/race/phases.ts`)

Gerechnet wird in Kalenderwochen (Mo–So) von heute bis zur Wettkampfwoche:

| Phase | Lage | Ziel | Intensität |
|---|---|---|---|
| **Aufbau** | erste ~40 % der Wochen vor dem Tapering | Laufumfang, Grundkraft, Stationen kennenlernen | überwiegend locker bis mittel |
| **Spezifisch** | restliche ~60 % | Laufen unter Vorbelastung, Renntempo, Wettkampfgewichte | mehr hart |
| **Entlastung** | jede 4. Woche (3 : 1), nie direkt vor dem Tapering | Erholung, Umfang −40 % | höchstens mittel |
| **Tapering** | 1 Woche vor der Wettkampfwoche (ab 12 Wochen: 2) | Umfang −30 bis −50 %, kurze Einheiten im Renntempo | kurz und knackig |
| **Wettkampfwoche** | Woche des Wettkampfs | 1–2 kurze Aktivierungen, Ruhe am Vortag | sehr locker |
| **Erholung** | Woche nach dem Wettkampf | locker bewegen, dann zurück zum normalen Plan | locker |

Sonderfälle:
- **Weniger als 4 Wochen:** kein Aufbau; spezifisch, aber mit kleinerem Umfang, danach Tapering und Wettkampfwoche.
- **Mehr als 16 Wochen:** bis 16 Wochen vorher normales Training mit HYROX-Schwerpunkt, danach der Phasenplan.

Beispiel für den Nutzer, Wettkampf Mitte Jänner (≈ 9 Wochen): 3 Wochen Aufbau → 1 Entlastung → 3 Spezifisch → 1 Tapering → Wettkampfwoche. Weihnachten fällt in die spezifische Phase; ausgefallene Tage können wie bisher verschoben werden.

## 3. Neue Einheitentypen

Neue Vorlagen im Generator (`templates.ts`). Für Kalender, Belastung und Statistik werden sie auf die bestehenden Schwerpunkte abgebildet, damit alles Bestehende weiter funktioniert.

| Einheit | Inhalt | Schwerpunkt |
|---|---|---|
| **Kompromiss-Lauf** | Abwechselnd Lauf (500 m–1 km) und HYROX-Station, wie im Rennen | HYROX |
| **Laufintervalle** | z. B. 6 × 1 km im Renntempo, 400er schneller, Pausen gehend/trabend | Ausdauer |
| **Lockerer Dauerlauf** | 30–60 min Zone 2 („noch sprechen können“) | Ausdauer (leicht) |
| **Stationskraft** | Sled Push/Pull, Lunges, Wall Balls, Farmers Carry mit 70–110 % des Wettkampfgewichts plus Grundkraft (Kniebeuge, Kreuzheben, Rudern) | Kraft |
| **Simulation** | bestehende Simulation (Hälfte, Kurz oder Komplett) | HYROX |
| **Aktivierung** | 20–30 min: lockerer Lauf, 3–4 kurze Steigerungen, je Station ein paar Wiederholungen | Regeneration |

Das Laufen zwischen den Übungen steckt im Kompromiss-Lauf und in der Simulation. Der **Laufumfang** steigt über den lockeren Dauerlauf: 30 min, je Belastungswoche rund +10 % bis 60 min (Entlastung −30 %, Tapering −40 %). Umsetzung 6.3b: zunächst ohne Schätzung aus dem Verlauf; die Anpassung an echte Laufdaten folgt mit dem Einstiegstest (6.3c).

## 4. Wochenplan im Wettkampfmodus

Bei aktivem Wettkampf nutzt „Woche planen / neu planen“ statt der allgemeinen Verteilung (`DISTRIBUTION`) diese Tabelle (Singles Open; Anpassungen je Variante in §5):

| Phase | 3 Tage | 4. Tag (falls 4 Tage) |
|---|---|---|
| Aufbau | Stationskraft · Laufintervalle (mittel) · Kompromiss-Lauf (mittel) | Lockerer Dauerlauf |
| Spezifisch | Stationskraft (Wettkampfgewicht) · Laufintervalle (Renntempo) · Kompromiss-Lauf (hart) | Dauerlauf; alle 2–3 Wochen ersetzt eine **Simulation** den Kompromiss-Lauf |
| Entlastung | dieselben Typen, kürzer, höchstens mittel | entfällt |
| Tapering | Kompromiss-Lauf kurz im Renntempo · Laufintervalle kurz · Stationskraft leicht | entfällt |
| Wettkampfwoche | 1–2 × Aktivierung in den ersten Tagen, Vortag frei | – |

Regeln wie bisher: Es gibt keine zwei harten, beinlastigen Tage hintereinander (`LEG_HEAVY`), die bevorzugten Wochentage werden genutzt, und bereits erledigte, ausgefallene oder vergangene Einheiten bleiben unverändert. **Trainer-Termine** zählen als HYROX-Einheit und ersetzen den Kompromiss-Lauf der Woche. Die Tagesform (Readiness) senkt wie bisher die Intensität.

Für den Nutzer (Mo, Mi gesperrt) ergibt das zum Beispiel: **Di** Stationskraft · **Do** Laufintervalle · **Sa** Kompromiss-Lauf · **So** lockerer Dauerlauf (optional).

## 5. Anpassung an die Variante

| Variante | Was im Rennen anders ist | Anpassung im Training |
|---|---|---|
| **Singles** | 8 × (1 km + ganze Station) allein | ganze Stationsumfänge, lange Kompromiss-Läufe, Ausdauer unter Ermüdung im Mittelpunkt |
| **Doubles** | 8 km gemeinsam laufen, Stationsarbeit wird geteilt | gleicher Laufumfang, aber schnelleres Renntempo; Stationen als Intervalle mit Arbeit/Pause ≈ 1 : 1 (Partnerwechsel), höhere Intensität je Abschnitt; Tipps zur Aufteilung |
| **Staffel** | je Person 2 × (1 km + Station) | weniger Umfang, mehr Tempo: schnelle 1-km-Wiederholungen, Stationen nahe Maximum, lange Pausen |
| **Pro** | deutlich schwerere Gewichte | mehr Stationskraft (schwere Sleds, Lunges), Kraft-Einheiten mit Vorrang, Gewichte bis 110 % Wettkampfgewicht |
| **Männer / Frauen / Mixed** | Gewichte | Zielgewichte in Stationskraft, Kompromiss-Lauf und Simulation |

## 6. Lernen mit der App

Der Nutzer startet ohne Erfahrung, deshalb führt die App Schritt für Schritt:

1. **Einstiegstest (Woche 1):** 1-km-Lauftest auf Zeit und an einem anderen Tag die Simulation „Kurz“. Daraus schätzt die App eine **realistische Zielzeit** als Bereich, z. B. „1:25–1:35 h“. Die Rechnung ist regelbasiert: Laufzeit × Ermüdungsfaktor + Stationen + Roxzone. Die Zielzeit lässt sich anpassen.
2. **Zieltempo:** Aus der Zielzeit ergeben sich Renntempo pro km und Richtzeiten pro Station. Sie stehen in Laufintervallen, Kompromiss-Läufen und Simulationen.
3. **Zwischencheck:** In der Mitte der spezifischen Phase gibt es eine halbe oder komplette Simulation. Danach aktualisiert die App die Schätzung.
4. **„Warum diese Woche?“:** Jede Woche erklärt in 2–3 Sätzen Phase, Ziel und Schlüsseleinheit.
5. **Wettkampf-Wissen:** kurze Lernkarten, die passend zur Phase freigeschaltet werden:
   - Ablauf, Stationen und Roxzone
   - Divisionen und Gewichte
   - Pacing („nicht zu schnell starten“)
   - Stationstechnik mit Verweis auf die Übungsbeschreibungen
   - Wettkampftag: Ablauf, Aufwärmen, Essen und Trinken (allgemein, keine Ernährungsberatung), Ausrüstung
   - Nach dem Rennen

## 6a. Umsetzung Einstiegstest und Zielzeit (6.3c Teil 1)

- **Einstiegstest:** In Woche 1 des Plans (Aufbau oder Spezifisch) ersetzt die Simulation „Kurz“ den Kompromiss-Lauf. Den **1-km-Lauftest** startet die Wettkampf-Seite als eigenes Training (`src/domain/race/runTest.ts`): 10 min einlaufen, 4 Steigerungen, 1 km auf Zeit (`hyrox-run`), 10 min auslaufen. Die Zeit wird wie jede Leistung zur Bestleistung „Lauf · 1000 m“; eine im Profil eingetragene 1-km-Zeit zählt auch.
- **Schätzung** (`src/domain/race/estimate.ts`), Grundlage ist die aussagekräftigste Quelle der letzten 12 Wochen:

  | Grundlage | Rechnung | Bereich |
  |---|---|---|
  | Simulation Komplett | Läufe + Stationen + 4 min mehr Roxzone als zu Hause | ± 3 % |
  | Beide Hälften | Hälfte 1 + Hälfte 2 × 1,08 (Vorermüdung) + 4 min | ± 4 % |
  | Eine Hälfte | × 2 × 1,06 + 4 min | ± 6 % |
  | Simulation Kurz | Läufe × 2 × 1,08, Stationen × 2 × 1,15, + 4 min | ± 7 % |
  | Nur 1-km-Zeit | 8 × 1-km-Zeit × 1,22 + Richtwert Stationen (Open M 36, Open W 40, Pro M 40, Pro W 42 min) + 6 min Roxzone | ± 10 % |

  Doubles: Stationen × 0,6 (geteilt). Staffel: nur die eigenen 2 Runden (2/8, etwas ausgeruhter). Alle Faktoren sind Richtwerte.
- **Zielzeit übernehmen:** Die Mitte der Schätzung lässt sich mit einem Tipp als Zielzeit speichern; weicht eine gespeicherte Zielzeit um mehr als 3 % ab, weist die Seite darauf hin.
- **Zieltempo:** Die Zielzeit wird mit den Anteilen der Schätzung (sonst 50 % Laufen, 7 % Roxzone, 43 % Stationen) in Renntempo pro km, Roxzone und Stationszeit geteilt; Richtzeiten je Station nach typischer Verteilung (SkiErg 13 %, Sled Push 10 %, Sled Pull 12 %, Burpee Broad Jumps 14 %, Rudern 13 %, Farmers Carry 6 %, Lunges 13 %, Wall Balls 19 %). Das Renntempo steht in Kompromiss-Läufen, Laufintervallen (5 % schneller), Dauerläufen (30 % langsamer) und Simulationen – im Plan berechnet aus der gespeicherten Zielzeit.
- **Zwischencheck:** Die Simulationen der spezifischen Phase (Kurz → Hälfte 1 → Hälfte 2 → Komplett) aktualisieren die Schätzung automatisch.

## 6b. Umsetzung „Warum diese Woche?“ und Lernkarten (6.3c Teil 2)

- **„Warum diese Woche?“** (`raceWeekWhy` in `src/domain/race/sessions.ts`): Ziel der Phase, Schlüsseleinheit mit Begründung und eine Besonderheit (Einstiegstest, Simulation, Entlastung, Tapering, Wettkampfwoche, Erholung). Steht auf der Wettkampf-Seite unter „Diese Woche“ und in „Warum dieser Plan?“ im Kalender.
- **Lernkarten** (`src/domain/race/learn.ts`, zentral im Code): Ablauf/Stationen/Roxzone und Divisionen/Gewichte ab Planbeginn, Pacing und Stationstechnik (mit Links zur Übungsbibliothek) ab der spezifischen Phase, Wettkampftag ab dem Tapering, Nach dem Rennen ab der Wettkampfwoche. Die Entlastungswoche behält die Stufe davor; nach dem Plan sind alle Karten offen. Gesperrte Karten zeigen, ab wann sie kommen.

## 7. Dashboard, Kalender, Ergebnis

- **Dashboard:** Countdown-Karte „Noch 58 Tage · Spezifisch · Woche 5 von 9“, Schlüsseleinheiten der Woche, aktuelle Zielzeit-Schätzung, Link zu `/race`.
- **Kalender:** Wettkampftag mit Zielflagge; die Phase steht über jeder Woche.
- **Ergebnis:** Ab dem Wettkampftag gibt es „Ergebnis eintragen“: Gesamtzeit, optional Zwischenzeiten wie bei der Simulation. Eine bessere Zeit wird zur neuen HYROX-Bestzeit im Profil (`hyrox_best_time_sec`). Der Wettkampf wird `completed`, danach folgt eine Erholungswoche, dann geht es mit dem normalen Plan weiter.

## 8. Datenmodell (Migration 0011)

Neue Tabelle `races`:
- **Felder:** `id`, `user_id`, `name`, `race_date`, `format` (single/double/relay), `category` (open/pro), `gender` (men/women/mixed), `days_per_week`, `weekdays int[]`, `target_time_sec`, `status` (active/completed/cancelled), `result_time_sec`, `result_session_id`, Zeitstempel.
- **Prüfregeln:** gültige Kombinationen, also kein Pro bei der Staffel und kein Mixed bei Singles.
- **Partieller Unique-Index:** ein aktiver Wettkampf je Nutzer.
- **RLS:** `auth.uid() = user_id`.

`planned_workouts` bekommt `race_session_type` (nullable), damit der Kalender „Kompromiss-Lauf“ statt nur „HYROX“ anzeigt. Die Phase wird nicht gespeichert, sondern immer aus Datum und Wettkampf berechnet.

## 9. Umsetzung in Schritten

| Schritt | Inhalt |
|---|---|
| **6.3a** | Migration 0011; Logik `domain/race` (Phasen, Varianten, Gewichte) mit Tests; Seite „Wettkampf“ (anlegen, bearbeiten, absagen); Countdown auf dem Dashboard; Phase im Kalender |
| **6.3b** | Neue Vorlagen (Kompromiss-Lauf, Laufintervalle, Dauerlauf, Stationskraft, Aktivierung); Wochenplan im Wettkampfmodus mit Laufumfang, Entlastung, Tapering und Anpassung je Variante – umgesetzt 16.11.2026 (Code: `src/domain/race/sessions.ts`, `src/domain/generator/raceTemplates.ts`, Migration 0012) |
| **6.3c** | Teil 1 – umgesetzt 16.11.2026: Einstiegstest, Zielzeit-Schätzung, Zieltempo in den Einheiten, Zwischencheck (siehe §6a). Teil 2 – umgesetzt 16.11.2026: „Warum diese Woche?“ und Lernkarten (siehe §6b) |
| **6.3d** | Ergebnis eintragen, Bestzeit, Erholungswoche, Abschluss des Wettkampfs |

Nach 6.3a und 6.3b lässt sich schon nach dem Plan trainieren. 6.3c und 6.3d folgen rechtzeitig vor dem Wettkampf.

**Hinweis:** Der Plan folgt gängigen, regelbasierten Trainingsprinzipien. Er ersetzt keinen Trainer oder Arzt; bei Schmerzen gilt die Tagesform bzw. Pause.
