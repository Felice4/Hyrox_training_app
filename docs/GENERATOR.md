# Trainingsgenerator – Algorithmus

> Ergebnis von Phase 1. Kernfunktion der App. Umsetzung in `src/domain/generator/` als reine, deterministische Funktionen mit Vitest-Tests.
> Alle Zahlenwerte sind Startwerte. Sie stehen gesammelt in `src/domain/generator/config.ts` und können ohne Änderung der Logik angepasst werden.

---

## 1. Grundprinzipien

1. **Regelbasiert und nachvollziehbar.** Jede Entscheidung erzeugt einen kurzen Erklärungstext („Beine wurden vor 1 Tag schwer trainiert → heute Fokus Oberkörper").
2. **Deterministisch.** Gleicher Input + gleicher Seed = gleiches Workout. Zufall nur über einen übergebenen Seed (seeded PRNG). „Neu erzeugen" in der UI = neuer Seed.
3. **Rein.** Keine Datenbank, kein React, kein `Date.now()`. Datum, Verlauf und Übungen kommen als Parameter.
4. **Konservativ.** Steigerungen klein und nur leistungsbasiert. Im Zweifel leichter. Keine Gewichtsvorgabe aus Körperdaten.
5. **Austauschbar.** Der Generator implementiert ein Interface. Eine spätere KI-Variante liefert dieselbe Ausgabestruktur und wird mit demselben Zod-Schema geprüft.

```ts
interface WorkoutGenerator {
  readonly version: string;
  generateWorkout(input: WorkoutRequestInput): GeneratedWorkout;
  generateWeekPlan(input: WeekPlanInput): GeneratedWeekPlan;
  suggestAlternatives(input: AlternativeInput): ExerciseSuggestion[];
}
```

---

## 2. Eingaben und Ausgabe

### Eingabe `WorkoutRequestInput`

| Feld | Inhalt |
|---|---|
| `request.durationMin` | Zieldauer, Standard aus Profil (60) |
| `request.focus` | `hyrox`, `strength`, `endurance`, `full_body`, `mixed` (+ intern `recovery`) |
| `request.intensity` | `easy`, `moderate`, `hard` |
| `request.readiness` | optional: Schnellauswahl (`low`, `normal`, `high`) oder Check-in-Werte |
| `request.targetMuscles` | optional: Muskelgruppen |
| `request.hyroxStations` | optional: bestimmte Stationen |
| `request.unavailableEquipment` | optional: heute nicht verfügbare Geräte |
| `profile` | Niveau, Equipment, Einschränkungen |
| `goals` | Gewichtung der vier Ziele |
| `exercises` | Alle aktiven Übungen inkl. eigener, mit Präferenz |
| `history` | Sessions der letzten 28 Tage mit Übungen, Sätzen, RPE, Belastung |
| `now` | aktuelles Datum/Zeit |
| `seed` | Zahl für den Zufallsgenerator |

### Ausgabe `GeneratedWorkout`

```ts
{
  generatorVersion: "rules-1.0.0",
  seed: 12345,
  focus: "strength",
  intensity: "moderate",          // nach Tagesform-Anpassung
  targetDurationMin: 60,
  estimatedDurationMin: 58,
  blocks: [
    { type: "warmup",  items: [...] },
    { type: "main",    items: [...] },
    { type: "accessory", items: [...] },
    { type: "conditioning", items: [...] },   // je nach Schwerpunkt
    { type: "cooldown", items: [...] }
  ],
  explanation: ["…", "…"]
}
// item:
{ exerciseSlug, sets: [{ type, reps?, weightKg?, distanceM?, durationSec?, restSec }],
  format?: { kind: "straight" | "superset" | "emom" | "amrap" | "intervals" | "rounds", rounds?, workSec?, restSec? },
  progressionNote? }
```

---

## 3. Ablauf von `generateWorkout`

```
 1. Eingaben normalisieren
 2. Tagesform & Belastung  → Intensität / Volumen anpassen (ggf. Recovery vorschlagen)
 3. Übungspool filtern     → Equipment, Einschränkungen, ausgeblendet, archiviert
 4. Muskelermüdung         → Ermüdungswert je Muskelgruppe
 5. Vorlage wählen         → Blöcke + Slots nach Schwerpunkt und Dauer
 6. Slots füllen           → Kandidaten bewerten, Auswahl per Seed unter den besten
 7. Dosierung              → Sätze, Wdh., Distanz, Pausen, Gewichtsvorschlag (Progression)
 8. Zeit anpassen          → Schätzung an Zieldauer angleichen (±10 %)
 9. Erklärung erzeugen
```

### Schritt 2 – Tagesform und Belastung (`domain/readiness`, `domain/load`)

**Tagesform:** Mittelwert der vier Skalen (1–5, höher = besser). Bei Schnellauswahl: `low` = 2, `normal` = 3.5, `high` = 4.5.

| Score | Wirkung |
|---|---|
| < 2,0 | Vorschlag einer **regenerativen Einheit** (Mobility, lockere Ausdauer). Normales Training bleibt wählbar, dann aber `easy`. |
| 2,0 – 2,9 | Intensität eine Stufe niedriger, Volumen −20 % |
| 3,0 – 3,9 | unverändert |
| ≥ 4,0 | unverändert (nie automatisch höher, nur auf ausdrücklichen Wunsch) |

**Trainingsbelastung:** pro Session `sRPE × Minuten`. Akut = Summe der letzten 7 Tage, chronisch = Wochendurchschnitt der letzten 28 Tage. Verhältnis > 1,3 → Intensität eine Stufe niedriger plus Hinweis. Bei weniger als 14 Tagen Verlauf wird dieser Faktor nicht angewendet (zu wenig Daten). Der Wert wird auch auf dem Dashboard als „aktuelle Trainingsbelastung" gezeigt. Es gibt **keine medizinischen Aussagen**, nur Trainingshinweise.

### Schritt 3 – Übungspool

Ausgeschlossen werden: `is_archived`, `preference = hidden`, Übungen mit Equipment außerhalb von `profile.available_equipment − unavailableEquipment`, Übungen mit `stress_regions` ∩ `limitation_regions` ≠ ∅, Schwierigkeit 3 bei Niveau `beginner` (nur im Hauptteil).

### Schritt 4 – Muskelermüdung

Für jede Muskelgruppe aus den Sessions der letzten 96 h:

```
Ermüdung(m) = Σ  Sätze × Gewicht(primär 1,0 | sekundär 0,5) × Intensitätsfaktor(RPE) × Abklingfaktor(Stunden)
Abklingfaktor = max(0, 1 − Stunden / Erholungszeit(m))   Erholungszeit: groß 72 h, klein 48 h
```

| Ermüdung | Wirkung |
|---|---|
| hoch (≥ 8) | Muskelgruppe nicht als **primärer** Muskel im Haupt- und Zusatzteil |
| mittel (4 – 8) | Abwertung bei der Auswahl, Volumen dieser Gruppe −30 % |
| niedrig | keine Einschränkung |

Ausnahme: Wenn der Nutzer die Muskelgruppe ausdrücklich wählt, wird sie trainiert, aber mit Hinweis und reduziertem Volumen.

### Schritt 5 – Vorlagen (Beispiel 60 Minuten)

Zeitbudget: Warm-up ≈ 15 %, Cool-down ≈ 8 %, Rest für Haupt- und Zusatzteil. Die Vorlagen bestehen aus **Slots** mit Anforderungen (Kategorie, Bewegungsmuster, Trainingstyp).

| Schwerpunkt | Hauptteil | Zusatz / Conditioning |
|---|---|---|
| **Kraft** | 2 Grundübungen (z. B. `squat`/`hinge` + `push`/`pull`), schwere Sätze | 2–3 Zusatzübungen, ausgeglichen Push/Pull, 1 Core |
| **HYROX** | Stationsarbeit + Laufen kombiniert (z. B. 4 Runden: 1 km Lauf + Station) | 1 Kraftausdauer-Block (Wall Balls, Lunges) |
| **Ausdauer** | Intervalle, Tempo oder Grundlage (Laufen, Rudern, SkiErg, Bike) | optional kurzer Core-Block |
| **Ganzkörper** | 3–4 Übungen: Unterkörper, Push, Pull, Carry/Core | kurzer Finisher |
| **Mixed** | Kraftblock (2 Grundübungen) | Conditioning-Finisher (HYROX-nah) |
| **Recovery** | lockere Ausdauer 20–30 min Zone 2 | Mobility, Stabilität |

Unter 40 Minuten werden Zusatzslots gestrichen. Ab 75 Minuten kommen Slots hinzu.

### Schritt 6 – Auswahl der Übungen

Jeder Kandidat für einen Slot bekommt eine Punktzahl:

| Faktor | Wirkung (Startwerte) |
|---|---|
| Zielgewichtung | + bis 3 je nach Passung `training_type` ↔ gewichtete Ziele |
| Präferenz | `preferred` +2, `disliked` −3 |
| Variation | −2,5 wenn in den letzten 2 Sessions gleichen Schwerpunkts genutzt, −1 in den letzten 7 Tagen |
| Muskelermüdung | −1 bis −4 je nach Ermüdung der primären Muskeln |
| HYROX-Abdeckung | +2 für Stationen, die seit ≥ 10 Tagen nicht trainiert wurden (Schwerpunkt HYROX/Mixed) |
| Nutzerwunsch | +5 bei gewählten Muskelgruppen/Stationen |
| Progressions-Kontinuität | +1 für Grundübungen, die regelmäßig im Plan sind (damit Fortschritt messbar bleibt) |

Ausgewählt wird **per Seed unter den drei besten Kandidaten**, gewichtet nach Punktzahl. Das sorgt für Abwechslung, ohne beliebig zu werden. Innerhalb eines Workouts kommt keine Übung doppelt vor, und pro Block wird nur ein Bewegungsmuster doppelt vergeben, wenn die Vorlage es verlangt.

### Schritt 7 – Dosierung und Progression (`domain/progression`)

**Grundvorgaben nach Trainingstyp** (bei `moderate`; `easy` −1 Satz bzw. −15 % Umfang, `hard` +1 Satz bzw. höhere Zielintensität):

| Typ | Sätze | Wdh. / Umfang | Pause |
|---|---|---|---|
| Kraft | 4 | 4–6 | 150–180 s |
| Hypertrophie | 3 | 8–12 | 75–90 s |
| Kraftausdauer / HYROX-Station | 3–4 Runden | stationsspezifisch (z. B. 25 m Sled, 20 Wall Balls) | 60–90 s |
| Intervalle | 4–8 | z. B. 4 × 1000 m / 8 × 400 m | 1:1 bis 1:2 |
| Grundlage | 1 | 20–45 min locker | – |

**Gewichtsvorschlag** (doppelte Progression, nur aus eigener Leistung):

| Letzte Leistung bei derselben Übung | Vorschlag |
|---|---|
| Kein Verlauf | Kein Gewicht. Hinweis: „Startgewicht wählen, das sich wie RPE 6–7 anfühlt" |
| Alle Arbeitssätze am oberen Ende des Wdh.-Bereichs, RPE ≤ 8 | + kleinste Steigerung: 2,5 kg (Langhantel, Unterkörper bis 5 kg), 1–2 kg (Kurzhantel/Kettlebell entsprechend vorhandener Abstufung), max. +5 % |
| Wdh.-Bereich erreicht, aber RPE > 8 | gleiches Gewicht, Ziel: mehr Wdh. |
| Wdh.-Bereich deutlich verfehlt **zweimal in Folge** | −5 bis −10 % |
| Tagesform reduziert | Gewicht unverändert, weniger Sätze; bei Score < 2,0 −10 % |

Für Lauf-, Ruder- und SkiErg-Intervalle gilt analog: Zielpace aus den letzten vergleichbaren Einheiten (gleiche Distanz), Steigerung höchstens 1–2 % pro Woche. Gewichte werden auf die verfügbare Abstufung gerundet (Standard 2,5 kg bzw. 1 kg).

### Schritt 8 – Zeitschätzung (`domain/duration`)

```
Satzdauer  = Wdh. × 3 s (Kraft) | Distanz / Referenzpace | vorgegebene Dauer
Übung      = Σ (Satzdauer + Pause)  − letzte Pause  + 60 s Wechsel/Aufbau
Workout    = Σ Übungen aller Blöcke
```

Liegt die Schätzung über der Zieldauer + 10 %, werden schrittweise Sätze im Zusatzteil gekürzt, dann ganze Zusatzübungen gestrichen, dann Hauptsätze reduziert (mindestens 2). Liegt sie unter der Zieldauer − 10 %, werden Sätze bis zum Maximum der Vorgabe ergänzt, dann ein Zusatzslot. Referenzpaces kommen aus dem Verlauf, sonst aus konservativen Standardwerten je Niveau.

### Schritt 9 – Erklärung

Kurze Sätze aus den getroffenen Entscheidungen, z. B.:
- „Tagesform eher niedrig → Intensität auf *moderat* gesenkt, 20 % weniger Volumen."
- „Beine vor 1 Tag intensiv trainiert → kein schweres Unterkörpertraining."
- „Sled Pull seit 12 Tagen nicht trainiert → in den HYROX-Block aufgenommen."
- „Bankdrücken: letztes Mal 3 × 8 mit RPE 7 → heute +2,5 kg."

---

## 4. Übungsaustausch (`suggestAlternatives`)

Reihenfolge der Kandidaten:
1. `alternative_slugs` der Übung (manuell gepflegt), sofern verfügbar
2. gleiches `movement_pattern` **und** überlappende `primary_muscles`
3. gleicher `training_type` und gleiche `hyrox_station` bzw. Kategorie

Danach werden dieselben Filter wie im Pool (Equipment, Einschränkungen, ausgeblendet) angewendet. Sortiert wird nach Ähnlichkeit (Muskelüberlappung, Messart gleich) und Präferenz. Die Dosierung wird übernommen bzw. für die neue Messart umgerechnet. Gewichte werden **nicht** übertragen, wenn sich das Gerät ändert.

---

## 5. Wochenplan (`generateWeekPlan`)

**Eingaben:** Profil (Anzahl Tage, bevorzugte Wochentage), Ziele, Verlauf, bereits absolvierte und geplante Einheiten der Woche, Startdatum.

1. **Tage wählen:** bevorzugte Wochentage, sonst gleichmäßig verteilt. Nach Möglichkeit nie mehr als 2 harte Tage in Folge.
2. **Schwerpunkte verteilen** nach Zielgewichtung (Beispiel gleich gewichtet):

| Tage | Verteilung |
|---|---|
| 2 | Ganzkörper-Kraft · HYROX/Mixed |
| 3 | Kraft (Unterkörper-Schwerpunkt) · HYROX · Kraft (Oberkörper) + Ausdauer-Finisher |
| 4 | Kraft Unterkörper · Ausdauer-Intervalle · Kraft Oberkörper · HYROX-Simulation |
| 5 | wie 4 + lockere Grundlage / Recovery |
| 6 | wie 5 + Mixed |

3. **Regeln:** schwere Unterkörpereinheit und Sled/Lunge-lastige HYROX-Einheit nicht an aufeinanderfolgenden Tagen. Mindestens eine HYROX-spezifische Einheit pro Woche, wenn `weight_hyrox > 0`. Intensität im Wochenverlauf wechselnd (hart/moderat).
4. **Verlauf berücksichtigen:** Bereits absolvierte Einheiten der Woche zählen. Bei Neuplanung mitten in der Woche werden nur die verbleibenden Tage geplant. Vergangene Tage bleiben unverändert.
5. **Workouts:** Für jeden Tag wird ein vollständiges Workout erzeugt und gespeichert. Am Trainingstag kann es mit aktueller Tagesform neu erzeugt werden; Schwerpunkt und Dauer bleiben dabei erhalten.

Bearbeitung in der UI: Tag verschieben, Einheit ersetzen (neu erzeugen mit gleichem oder anderem Schwerpunkt), spontane Einheit hinzufügen, Einheit als ausgefallen markieren.

---

## 5a. Umsetzung (Schritt 2.6) – Ergänzungen zur Planung

Code: `src/domain/generator/` (`generateWorkout.ts`, `templates.ts`, `scoring.ts`, `dosing.ts`, `pool.ts`, `alternatives.ts`, `schema.ts`, `config.ts`), dazu `domain/readiness`, `domain/load`, `domain/duration`, `domain/progression`.

| Thema | Umsetzung |
|---|---|
| **Rollen** | Jede Übung im Workout hat eine Rolle (`strength_main`, `hypertrophy`, `station`, `steady` …). Sie bestimmt Dosierung und Pausen und bleibt beim Austausch erhalten. |
| **Pausen** | Hauptübung Kraft: oberes Ende der Übungs-Pausenspanne; Ergänzung/Rumpf: unteres Ende; sonst Mitte. |
| **Zirkel** | HYROX-Hauptteil und Mixed-Finisher als Block mit `rounds`: alle Übungen haben so viele Sätze wie Runden, Pause nur nach der letzten Übung einer Runde, 30 s Wechselzeit je Station und Runde. Stationsumfang im Zirkel geringer (z. B. 500 m SkiErg statt 650 m). |
| **Zeitanpassung** | Intern ±8 % (damit auch gerundete Minuten ±10 % einhalten). Reihenfolge: kürzen (Zusatz-Sätze → optionale Übungen → Runden → Hauptsätze) bzw. verlängern (Sätze → Runde → Zusatzübungen aus der Vorlage; jeder Schritt wird zurückgenommen, wenn er die Obergrenze überschreitet). Danach Feinabstimmung über „Stellknöpfe": Dauer/Strecke der Grundlageneinheit, Einfahren (5–12 min) und Ausfahren (2–10 min). Warm-up/Cool-down sind kein Ersatz für Training und werden nur zur Feinabstimmung verlängert. |
| **Zusatzübungen** | Nur Kandidaten, die in die verbleibende Zeit passen; keine Übung darf allein mehr als 60 % der Zeit belegen. Bei langer Ausdauer/Regeneration kann eine zweite Grundlageneinheit mit anderem Gerät dazukommen. |
| **Stationswunsch** | Ausdrücklich gewünschte HYROX-Stationen werden verbindlich eingeplant, sofern eine passende Übung verfügbar ist (statt nur +5 Punkte). |
| **Ermüdung** | Stark ermüdete Muskeln werden in belastenden Rollen ausgeschlossen, in lockeren Rollen (Einfahren, Grundlage, Mobility, Dehnen) nur abgewertet. |
| **Erklärung** | Beginnt mit einem Satz zum Aufbau des Schwerpunkts, endet mit geschätzter Dauer und Intensität. |
| **Noch nicht umgesetzt** | Tempo-Progression für Lauf/Rudern/SkiErg (folgt, sobald Trainingsdaten gespeichert werden, Schritt 2.7+); Wochenplan (Schritt 3.1). |

**Prüfung der Dauer:** Ein Belastungstest mit 24 000 Workouts (6 Schwerpunkte × 5 Dauern × 100 Seeds × 8 Szenarien: Standard, Anfänger, Erfahren, Heim-Studio, ohne HYROX-Geräte, nach Beintag, müde, Knieproblem) ergab 0 Abweichungen über ±10 % (21.10.2026). Der reguläre Test prüft 6 × 4 × 12 Kombinationen.

---

## 6. Tests (Vitest)

Pflichttests laut Spezifikation §15 und ihre Umsetzung:

| # | Test | Umsetzung |
|---|---|---|
| 1 | Angeforderte Dauer wird berücksichtigt | Für 30/45/60/90 min × alle Schwerpunkte: Schätzung innerhalb ±10 % |
| 2 | Nicht verfügbare Geräte ausgeschlossen | Geräte entfernen → keine Übung im Ergebnis benötigt sie (alle Seeds 1–50) |
| 3 | Stark belastete Muskelgruppen berücksichtigt | Verlauf mit schwerem Beintraining gestern → keine Übung mit primär Quadrizeps/Gesäß im Hauptteil |
| 4 | Sinnvolle Alternativen | Alternativen haben gleiches Muster oder überlappende Primärmuskeln und erfüllen die Equipment-Filter |
| 5 | Speichern & Laden | Mapping Domäne ↔ Datenbank als reine Funktionen getestet; Payload von `save_workout_session` vollständig und idempotent (gleiche IDs bei Wiederholung) |
| 6 | Verfügbarkeit nach Login / zweitem Gerät | Manuelle Testcheckliste (Phase 4), da echte Supabase-Instanz nötig |

Weitere Tests: Determinismus (gleicher Seed → gleiches Ergebnis), keine doppelten Übungen, Progressionsregeln (jede Tabellenzeile oben), Tagesform-Schwellen, Belastungsquotient, Wochenplan-Regeln (keine zwei harten Unterkörpertage in Folge, HYROX-Einheit vorhanden, vergangene Tage unverändert), Rekord-Erkennung nur bei vergleichbaren Bedingungen, Validität der Übungsbibliothek.
