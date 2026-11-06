# Skill-Ziele und Meilensteine – Konzept (Phase 5)

Stand: vom Nutzer freigegeben am 05.11.2026. Umsetzung in den Schritten 5.1–5.4 (siehe `PROJECT.md`); 5.1 (Inhalte im Code) erledigt: `src/data/skills/` und Übungskategorie „Skills" in `src/data/exercises/skills.ts`.

Ziel: gezielt auf Fähigkeiten wie Muscle-Up, Handstand oder Spagat hinarbeiten, **ohne** dass HYROX-, Kraft- und Ausdauertraining zu kurz kommen.

---

## 1. Zwei Arten von Zielen

| Art | Beispiele | Wie trainiert | Wie gemessen |
|---|---|---|---|
| **Skill** | Muscle-Up, Handstand, Spagat | Eigener kurzer Skill-Block im Training, Stufe für Stufe | Kriterium der aktuellen Stufe (Wiederholungen, Haltezeit) |
| **Meilenstein** | 20 Klimmzüge, 5 km unter 20 min, 2 × KG Kreuzheben | Kein Extra-Block – kommt aus dem normalen Training | Automatisch aus Bestleistungen und Trainings |

Erreichte Ziele werden als **Abzeichen** mit Datum gespeichert.

---

## 2. Grundregeln – das Haupttraining hat Vorrang

1. **Wochenverteilung bleibt.** HYROX, Kraft, Ausdauer, Ganzkörper und Regeneration werden wie bisher verteilt (GENERATOR.md §5). Skills ändern keine Schwerpunkte.
2. **Festes Zeitbudget.** Der Skill-Block ist Teil der gewählten Trainingsdauer und höchstens **15 % davon** (Stufe „normal": 45 min → 7 min, 60 min → 9 min, 90 min → 14 min; nie über 15 min). Einstellbar: aus · klein (≈ 8 %) · normal (≈ 15 %).
3. **Platzierung nach Art:**
   - Kraft- und Balance-Skills (Muscle-Up, Handstand, Lever …): **direkt nach dem Warm-up** – Technik lernt man frisch, und das Warm-up wärmt die passenden Gelenke mit auf.
   - Beweglichkeit (Spagat, Brücke, Pike): **im Cool-down** – kostet kaum Erholung.
   - Sprung- und Akrobatik-Vorbereitung (Back Flip, Box Jump): nach dem Warm-up, **nie** vor einem schweren Beintag oder einer HYROX-Simulation.
4. **Pro Training höchstens ein Kraft-/Balance-Skill und ein Beweglichkeits-Skill.** Mehrere aktive Ziele wechseln sich über die Woche ab; jedes aktive Ziel kommt 2–3 × pro Woche dran.
5. **Ermüdung und Tagesform gelten auch hier.** Sind die beteiligten Muskeln stark ermüdet (z. B. Schultern nach Push-Tag), wird der Skill durch einen anderen ersetzt oder entfällt. Bei niedriger Tagesform nur Technik/Beweglichkeit. Regenerationseinheiten: nur Beweglichkeits-Skills.
6. **Höchstens drei aktive Ziele gleichzeitig** (empfohlen: 1–2 Kraft/Balance + 1 Beweglichkeit). Alle anderen stehen auf „Später". Ist ein Ziel erreicht, schlägt die App das nächste vor – passend zu den Voraussetzungen.
7. **Keine Versprechen, keine Medizin.** Hinweise zu Sicherheit stehen bei jeder Stufe; Back Flip nur mit Trainer und Matte.

---

## 3. Stufen

Jede Stufe hat ein **Kriterium** (gilt als geschafft, sobald es in einem Training erreicht oder im Test bestätigt wird) und **Übungen**, die der Skill-Block dafür einplant. „×" = Wiederholungen am Stück, „s" = Haltezeit.

### Zug und Lever

**Muscle-Up (Stange)**
| # | Kriterium |
|---|---|
| 1 | 8 strikte Klimmzüge |
| 2 | 5 Klimmzüge Brust zur Stange |
| 3 | 10 Dips an der Stange (Straight Bar Dip) |
| 4 | 3 explosive Klimmzüge bis Hüfte zur Stange |
| 5 | 3 Muscle-Up-Negative à 5 s |
| 6 | 1 Muscle-Up |
| 7 | 5 Muscle-Ups am Stück |

**Front Lever**
| # | Kriterium |
|---|---|
| 1 | 30 s Hollow Hold, 10 Klimmzüge |
| 2 | 15 s Tuck Front Lever |
| 3 | 10 s Advanced Tuck Front Lever |
| 4 | 8 s einbeiniger Front Lever |
| 5 | 5 s Straddle Front Lever |
| 6 | 3 s Front Lever |

**Back Lever** (Ringe oder Stange)
| # | Kriterium |
|---|---|
| 1 | 30 s German Hang (Schulterdehnung) |
| 2 | 15 s Tuck Back Lever |
| 3 | 10 s Advanced Tuck Back Lever |
| 4 | 8 s Straddle Back Lever |
| 5 | 5 s Back Lever |

**Einarmiger Klimmzug** (Fernziel)
| # | Kriterium |
|---|---|
| 1 | 15 strikte Klimmzüge |
| 2 | 5 Archer-Klimmzüge je Seite |
| 3 | 3 einarmige Negative à 5 s je Seite |
| 4 | 1 einarmiger Klimmzug je Seite |

### Stütz und Balance

**Freistehender Handstand**
| # | Kriterium |
|---|---|
| 1 | 30 s Pike-Stütz auf Box (Hüfte über Schultern) |
| 2 | 45 s Handstand Brust zur Wand |
| 3 | 30 s Krähe (Crow) |
| 4 | 10 kontrollierte Kick-ups mit Abrollen/Ausweichen |
| 5 | 5 s freistehend |
| 6 | 15 s freistehend |
| 7 | 30 s freistehend |

**Handstand-Liegestütz** (setzt Handstand Stufe 2 voraus)
| # | Kriterium |
|---|---|
| 1 | 10 Pike Push-ups |
| 2 | 8 Pike Push-ups mit erhöhten Füßen |
| 3 | 5 Negative an der Wand à 3 s |
| 4 | 3 Handstand-Liegestütze an der Wand |
| 5 | 8 Handstand-Liegestütze an der Wand |

**Handstand-Gehen** (setzt Handstand Stufe 5 voraus)
| # | Kriterium |
|---|---|
| 1 | 10 Schulter-Tippen im Wandhandstand |
| 2 | 3 m Handstand-Gehen |
| 3 | 10 m Handstand-Gehen |

**L-Sit → V-Sit**
| # | Kriterium |
|---|---|
| 1 | 20 s Tuck L-Sit (Knie angezogen) |
| 2 | 15 s einbeiniger L-Sit je Seite |
| 3 | 15 s L-Sit |
| 4 | 30 s L-Sit |
| 5 | 5 s V-Sit |

**Dragon Flag**
| # | Kriterium |
|---|---|
| 1 | 30 s Hollow Hold |
| 2 | 5 Tuck Dragon Flags |
| 3 | 5 Dragon-Flag-Negative à 3 s |
| 4 | 3 Dragon Flags |

**Human Flag** (Fernziel)
| # | Kriterium |
|---|---|
| 1 | 45 s Seitstütz je Seite, 10 Klimmzüge |
| 2 | 10 s Flaggen-Halten mit angezogenen Knien |
| 3 | 5 s Straddle Flag |
| 4 | 3 s Human Flag |

### Beine

**Pistol Squat**
| # | Kriterium |
|---|---|
| 1 | 60 s tiefe Hocke |
| 2 | 8 Pistol Squats auf Box je Seite |
| 3 | 5 Pistols mit Halt (Stange/Band) je Seite |
| 4 | 1 freier Pistol je Seite |
| 5 | 5 freie Pistols je Seite |

**Nordic Hamstring Curl** (schützt die Oberschenkelrückseite – passt gut zu HYROX)
| # | Kriterium |
|---|---|
| 1 | 5 Nordic-Negative à 3 s |
| 2 | 5 Nordic-Negative à 6 s |
| 3 | 1 voller Nordic Curl |
| 4 | 5 volle Nordic Curls |

### Beweglichkeit

**Seitspagat**
| # | Kriterium |
|---|---|
| 1 | 60 s Frosch-Dehnung |
| 2 | 60 s Pancake mit Unterarmen am Boden |
| 3 | 60 s Seitspagat mit Händen am Boden, Hüfte 20 cm über dem Boden |
| 4 | Seitspagat bis 10 cm über dem Boden |
| 5 | Voller Seitspagat |

**Längsspagat** (Stufen gelten je Seite)
| # | Kriterium |
|---|---|
| 1 | 60 s Couch Stretch |
| 2 | 60 s halber Spagat (hinteres Knie am Boden, vorderes Bein gestreckt) |
| 3 | Längsspagat mit Blöcken unter den Händen, Hüfte 15 cm über dem Boden |
| 4 | Voller Längsspagat |

**Brücke**
| # | Kriterium |
|---|---|
| 1 | 30 s Brücke mit gestreckten Armen am Boden |
| 2 | 10 Wand-Gehen in die Brücke |
| 3 | Brücke aus dem Stand mit Wand |
| 4 | Brücke aus dem Stand und zurück |

**Pike (Kompression)**
| # | Kriterium |
|---|---|
| 1 | Fingerspitzen am Boden (Beine gestreckt) |
| 2 | Handflächen am Boden |
| 3 | 30 s Brust zu den Knien im Sitzen |

### Explosiv

**Back Flip – Vorbereitung** (Salto selbst nur mit Trainer und Matte)
| # | Kriterium |
|---|---|
| 1 | 10 Tuck Jumps (Knie zur Brust) |
| 2 | 5 Rollen rückwärts sauber |
| 3 | 30 s Brücke (siehe Brücke Stufe 1) |
| 4 | Box Jump 90 cm |
| 5 | Back Flip mit Trainer/Hilfestellung – manuell bestätigen |
| 6 | Back Flip ohne Hilfe – manuell bestätigen |

**Box Jump**
| # | Kriterium |
|---|---|
| 1 | 75 cm |
| 2 | 90 cm |
| 3 | 105 cm |
| 4 | 120 cm |

---

## 4. Meilensteine (aus dem normalen Training)

| Bereich | Meilensteine |
|---|---|
| Zug | 10 · 15 · 20 strikte Klimmzüge |
| Kraft (relativ zum Körpergewicht, braucht einen Gewichts-Eintrag) | Kniebeuge 1 × / 1,5 × / 2 × KG · Kreuzheben 1,5 × / 2 × / 2,5 × KG · Bankdrücken 0,75 × / 1 × / 1,25 × KG |
| Laufen | 5 km unter 25 · 22 · 20 min · 1 km unter 3:30 |
| Ergometer | 1000 m Rudern unter 3:45 · 3:30 · 2000 m Rudern unter 7:30 · 1000 m SkiErg unter 4:00 |
| HYROX | 100 Wall Balls · HYROX unter 1:30 · 1:20 · 1:10 h (Wettkampfzeit aus dem Profil) |

Meilensteine brauchen keine Aktivierung – die App zeigt, wie nah du dran bist (z. B. „Kreuzheben: 150 von 168 kg"). Gezählt wird der beste einzelne Satz bzw. die beste Zeit (Runden im Zirkel zählen mit, Warm-up und Cool-down nicht).

**Anpassen (Schritt 5.2b):** Eigene Meilensteine anlegen (Wiederholungen am Stück, Gewicht in kg, Gewicht × Körpergewicht, Zeit über eine Strecke – jeweils mit einer Übung), bei Standard-Meilensteinen Name und Ziel ändern, ausblenden, „ab heute neu zählen" (ältere Werte zählen nicht, Bestleistungen bleiben) und den Stand von Hand eintragen (es zählt der bessere Wert).

---

## 5. Umsetzung in der App

| Ort | Was |
|---|---|
| **Neuer Bereich „Ziele"** (`/goals`, über Dashboard-Karte und „Mehr") | Alle Skills nach Bereich, aktiv / später / erreicht; Einstufung beim Start (Stufe wählen oder „ich weiß es nicht" → mit Stufe 1 beginnen und testen); Stufenleiter mit Kriterien und Übungen; Meilensteine mit Fortschritt; Abzeichen |
| **Generator** | Skill-Block nach dem Warm-up bzw. im Cool-down nach den Regeln aus §2 |
| **Wochenplan** | verteilt die aktiven Ziele über die Woche (je 2–3 ×) |
| **Training** | Skill-Übungen wie alle anderen; nach dem Speichern prüft die App die Kriterien → „Stufe geschafft!" |
| **Dashboard** | Karte mit dem aktiven Ziel und dem nächsten Kriterium |
| **Statistik → Rekorde** | Abzeichen erreichter Ziele und Meilensteine |

**Umsetzung 5.3:** Generator und Wochenplan siehe `docs/GENERATOR.md` §5c. In der Vorschau eines Workouts (Training und Kalender) gibt es die Karte **„Skill üben"** zwischen Begründung und Warm-up: aktive Ziele mit ihrer Stufe oder jeden anderen Skill einbauen bzw. entfernen. Kraft-/Balance-/Sprung-Skills kommen ans Ende des Warm-ups, Beweglichkeit ins Cool-down (statisches Dehnen vor dem Training ist ungünstig). Einstellung „Skill-Block im Training: Aus · Klein · Normal" auf der Ziele-Seite.

**Daten:** Skills und Stufen stehen im Code (`src/data/skills/`, wie die Übungsbibliothek). In der Datenbank (Migration 0007) nur deine Auswahl: Ziel, Status (aktiv/später/erreicht), aktuelle Stufe, Verlauf der geschafften Stufen. Neue Übungen für die Stufen (z. B. Muscle-Up-Negative, Wandhandstand, Tuck Front Lever, Frosch-Dehnung) kommen in die Übungsbibliothek.
