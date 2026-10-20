# Datenbankkonzept – HYROX Performance Coach

> Ergebnis von Phase 1. Die verbindliche Umsetzung erfolgt ausschließlich über SQL-Migrationen in `supabase/migrations/`. Dieses Dokument beschreibt das Ziel und wird angepasst, wenn eine Migration davon abweicht.

---

## 1. Grundregeln

| Regel | Umsetzung |
|---|---|
| IDs | `uuid`. Bei Trainingsdaten erzeugt der **Client** die ID (`crypto.randomUUID()`), damit Speichern idempotent ist. Sonst `default gen_random_uuid()`. |
| Besitz | Jede Tabelle hat `user_id uuid not null default auth.uid() references auth.users on delete cascade`. |
| RLS | Auf **jeder** Tabelle aktiv. Standard-Policy für `select/insert/update/delete`: `to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)`. |
| Kind-Tabellen | Zusätzlich prüft die Policy, dass der Elterndatensatz demselben Nutzer gehört. |
| Zeitstempel | `created_at timestamptz not null default now()`, `updated_at` mit gemeinsamem Trigger `set_updated_at()`. Zeiten in UTC, Anzeige in lokaler Zeit. Trainingstage als `date`. |
| Auswahlwerte | `text` + `check (... in (...))` statt Postgres-Enums, weil sie sich in Migrationen leichter ändern lassen. Dieselben Werte stehen als TypeScript-Union-Typen im Code. |
| Einheiten | Spaltennamen tragen die Einheit: `weight_kg`, `distance_m`, `duration_sec`, `height_cm`. Gewichte `numeric(6,2)`. |
| Historie | Trainingsdaten werden nie durch Neuplanung oder Bibliotheks-Updates verändert. Übungsnamen werden in der Historie zusätzlich als Text gespeichert (Snapshot). |
| Löschen | Übungen mit Historie werden archiviert (`is_archived`), nicht gelöscht. FKs auf Übungen sind `on delete restrict`. |

---

## 2. Tabellenübersicht

```
auth.users (Supabase)
   │
   ├── profiles               1:1  Körperdaten, Trainingshintergrund, Trainingsbedingungen
   ├── training_goals         1:1  Gewichtung der vier Hauptziele
   ├── exercises              1:n  Bibliotheks- und eigene Übungen (inkl. Präferenz)
   ├── body_measurements      1:n  Körpergewicht & weitere Messwerte über die Zeit
   ├── readiness_checkins     1:n  Tagesform-Check-ins
   ├── week_plans             1:n  Ein Wochenplan je Kalenderwoche
   │     └── planned_workouts 1:n  Geplante Einheiten (auch ohne Wochenplan möglich)
   ├── workout_sessions       1:n  Absolvierte (auch teilweise) Trainings
   │     └── session_exercises 1:n
   │            └── session_sets 1:n
   └── personal_records       1:n  Bestleistungen (aus Trainings oder manuell erfasst)
```

---

## 3. Tabellen im Detail

Spalten `id`, `user_id`, `created_at`, `updated_at` sind überall vorhanden, wenn nicht anders angegeben, und werden nicht wiederholt.

### 3.1 `profiles` (PK = `user_id`, kein separates `id`)

| Spalte | Typ | Hinweis |
|---|---|---|
| display_name | text | für die Begrüßung |
| birth_date | date | Alter wird berechnet |
| height_cm | numeric(5,1) | check 100–250 |
| sex | text null | `female`, `male`, `diverse` (optional) |
| training_level | text | `beginner`, `intermediate`, `advanced` |
| hyrox_experience | text | `none`, `some`, `competed` |
| strength_experience | text | `none`, `under_1y`, `1_3y`, `over_3y` |
| endurance_experience | text | wie oben |
| fitness_notes | text null | aktuelle Leistungsfähigkeit (Freitext) |
| training_days_per_week | smallint | check 1–7 |
| preferred_weekdays | smallint[] | ISO-Wochentage 1 = Mo … 7 = So |
| default_duration_min | smallint | Standard 60, check 20–150 |
| available_equipment | text[] | Werte aus der Equipment-Liste im Code |
| limitation_regions | text[] | z. B. `knee`, `shoulder`, `lower_back` → Generator meidet belastende Übungen |
| limitation_notes | text null | Freitext, nur zur Info |
| onboarding_completed_at | timestamptz null | `null` → Onboarding anzeigen |

Körpergewicht steht **nicht** hier, sondern in `body_measurements` (Verlauf). Das aktuelle Gewicht ist der jüngste Eintrag.

### 3.2 `training_goals` (PK = `user_id`)

| Spalte | Typ | Hinweis |
|---|---|---|
| weight_hypertrophy | smallint | 0–100, Standard 25 |
| weight_strength | smallint | Standard 25 |
| weight_endurance | smallint | Standard 25 |
| weight_hyrox | smallint | Standard 25 |

Check: Summe > 0. Der Generator normalisiert die Werte, die Summe muss also nicht 100 sein.

### 3.3 `exercises`

| Spalte | Typ | Hinweis |
|---|---|---|
| slug | text | stabile ID aus dem Code, z. B. `hyrox-sled-push`; eigene Übungen: `custom-<uuid>`; unique (`user_id`, `slug`) |
| source | text | `library` oder `custom` |
| name | text | deutsch |
| description | text | |
| category | text | `hyrox`, `strength`, `endurance`, `mobility`, `warmup`, `cooldown`, `recovery` |
| training_types | text[] | mind. 1 aus `strength`, `hypertrophy`, `power`, `conditioning`, `endurance`, `mobility`, `stability`, `coordination`, `skill` |
| movement_pattern | text | `squat`, `hinge`, `lunge`, `push_horizontal`, `push_vertical`, `pull_horizontal`, `pull_vertical`, `carry`, `core`, `locomotion`, `jump`, `full_body`, `isolation`, `mobility` |
| primary_muscles | text[] | Werte aus der Muskelgruppen-Liste im Code |
| secondary_muscles | text[] | |
| equipment | text[] | leer = Körpergewicht |
| difficulty | smallint | 1–3 |
| measurement | text | `weight_reps`, `reps`, `weight_distance`, `weight_time`, `distance`, `distance_time`, `time`, `calories` |
| load_params | jsonb | Geeignete Bereiche [min, max] für Sätze, Wdh., Distanz, Dauer, Kalorien, Pause; Pflichtfeld je Messart; Schema in `src/data/exercises/schema.ts` |
| instructions | text[] | Ausführungshinweise |
| alternative_slugs | text[] | geeignete Alternativen |
| hyrox_station | text null | `skierg`, `sled_push`, `sled_pull`, `burpee_broad_jump`, `row`, `farmers_carry`, `sandbag_lunges`, `wall_balls`, `run` |
| stress_regions | text[] | Gelenke/Regionen mit hoher Belastung (für `limitation_regions`) |
| preference | text | `neutral`, `preferred`, `disliked`, `hidden`; Standard `neutral` |
| is_archived | boolean | aus der Bibliothek entfernt oder eigene Übung gelöscht |
| library_version | integer null | Version der Bibliothek beim letzten Abgleich |

Muskelgruppen, Equipment und andere Wertelisten werden im Code als Konstanten gepflegt und mit Zod geprüft. Sie sind keine eigenen Tabellen, damit es einfach bleibt.

### 3.4 `body_measurements`

| Spalte | Typ | Hinweis |
|---|---|---|
| measured_on | date | |
| weight_kg | numeric(5,2) null | |
| body_fat_pct | numeric(4,1) null | |
| waist_cm, chest_cm, arm_cm, thigh_cm | numeric(5,1) null | optional |
| notes | text null | |

Check: mindestens ein Messwert gesetzt. Statistiken zeigen nur tatsächlich erfasste Werte.

### 3.5 `readiness_checkins`

| Spalte | Typ | Hinweis |
|---|---|---|
| checked_at | timestamptz | |
| energy | smallint | 1–5 |
| soreness | smallint | 1–5 (1 = starker Muskelkater, 5 = keiner), damit „höher = besser" überall gilt |
| sleep_quality | smallint | 1–5 |
| recovery | smallint | 1–5 |
| score | numeric(3,2) | Mittelwert, berechnet in `domain/readiness` |

### 3.6 `week_plans`

| Spalte | Typ | Hinweis |
|---|---|---|
| week_start | date | Montag; unique (`user_id`, `week_start`) |
| generator_version | text | |
| notes | text null | Begründung/Zusammenfassung des Plans |

### 3.7 `planned_workouts`

| Spalte | Typ | Hinweis |
|---|---|---|
| week_plan_id | uuid null | FK `week_plans`, `on delete set null` |
| scheduled_date | date | |
| original_date | date null | gesetzt, wenn verschoben |
| status | text | `planned`, `completed`, `skipped` |
| focus | text | `hyrox`, `strength`, `endurance`, `full_body`, `mixed`, `recovery` |
| target_duration_min | smallint | |
| intensity | text | `easy`, `moderate`, `hard` |
| workout | jsonb null | erzeugtes Workout (`GeneratedWorkout`, siehe GENERATOR.md); `null` = nur Schwerpunkt geplant, Übungen werden am Trainingstag erzeugt |
| explanation | text[] | |
| source | text | `week_plan`, `manual` |
| completed_session_id | uuid null | FK `workout_sessions`, `on delete set null` |

**Schutz der Vergangenheit:** Eine Neuplanung löscht oder ändert nur Einträge mit `status = 'planned'` und `scheduled_date >= heute`. Das prüft zusätzlich die RPC-Funktion `replace_week_plan`.

### 3.8 `workout_sessions` (ID vom Client)

| Spalte | Typ | Hinweis |
|---|---|---|
| planned_workout_id | uuid null | FK `planned_workouts`, `on delete set null` |
| readiness_checkin_id | uuid null | FK |
| started_at | timestamptz | |
| ended_at | timestamptz | |
| active_duration_sec | integer | ohne Pausen |
| status | text | `completed`, `partial` |
| focus | text | wie oben |
| intensity | text | |
| session_rpe | smallint null | 1–10 |
| notes | text null | |
| workout_snapshot | jsonb | das ursprünglich geplante Workout (zum Vergleich Plan ↔ Ist) |
| generator_version | text null | |
| training_load | integer | `session_rpe × active_duration_min` (sRPE-Methode), berechnet in `domain/load` |

### 3.9 `session_exercises` (ID vom Client)

| Spalte | Typ | Hinweis |
|---|---|---|
| session_id | uuid | FK `workout_sessions` `on delete cascade` |
| exercise_id | uuid | FK `exercises` `on delete restrict` |
| exercise_name | text | Snapshot |
| position | smallint | Reihenfolge |
| block | text | `warmup`, `main`, `accessory`, `conditioning`, `cooldown` |
| status | text | `completed`, `partial`, `skipped` |
| replaced_exercise_id | uuid null | ursprünglich geplante Übung, falls ausgetauscht |
| notes | text null | |

### 3.10 `session_sets` (ID vom Client)

| Spalte | Typ | Hinweis |
|---|---|---|
| session_exercise_id | uuid | FK `on delete cascade` |
| set_number | smallint | |
| set_type | text | `warmup`, `working`, `interval`, `round` |
| target_reps, target_weight_kg, target_distance_m, target_duration_sec | null erlaubt | Vorgabe |
| reps, weight_kg, distance_m, duration_sec, calories | null erlaubt | tatsächlich absolviert |
| rpe | numeric(3,1) null | optional pro Satz |
| completed | boolean | |
| completed_at | timestamptz null | |

Check-Constraints für plausible Wertebereiche (z. B. `weight_kg between 0 and 500`, `distance_m between 0 and 100000`).

### 3.11 `personal_records`

| Spalte | Typ | Hinweis |
|---|---|---|
| exercise_id | uuid | FK `on delete restrict` |
| record_type | text | `max_weight`, `estimated_1rm`, `max_reps`, `best_time`, `max_distance`, `best_pace` |
| context | jsonb | Vergleichsbedingungen, z. B. `{"reps": 5}` oder `{"distance_m": 1000}` |
| context_key | text | normalisierte Form von `context` für Eindeutigkeit, z. B. `reps=5` |
| value | numeric | in der Einheit von `unit` |
| unit | text | `kg`, `reps`, `sec`, `m`, `sec_per_km` |
| achieved_at | timestamptz | |
| session_id | uuid null | FK, `null` bei manueller Eingabe (Onboarding) |
| source | text | `session`, `manual` |

Unique (`user_id`, `exercise_id`, `record_type`, `context_key`): pro Bedingung gibt es nur den aktuellen Bestwert. Die Historie der Leistungsentwicklung entsteht aus `session_sets`, nicht aus dieser Tabelle. **Vergleichbarkeit:** Rekorde gelten nur unter gleichen Bedingungen (gleiche Distanz, gleiche Wiederholungszahl).

---

## 4. Synchronisierung der Übungsbibliothek

**Quelle der Wahrheit für Bibliotheksübungen ist der Code** (`src/data/exercises/*.ts`). Jede Übung hat einen stabilen `slug`. Die Bibliothek hat eine Versionsnummer `LIBRARY_VERSION`, die bei jeder Änderung erhöht wird.

Ablauf (nach dem Login, wenn die gespeicherte Version kleiner als `LIBRARY_VERSION` ist):

1. Die App ruft die RPC-Funktion `sync_exercise_library(p_version, p_exercises jsonb)` auf.
2. Für jede Bibliotheksübung: **Upsert über (`user_id`, `slug`)**. Aktualisiert werden nur Bibliotheksfelder (Name, Beschreibung, Muskeln, …), **nicht** `preference`.
3. Bibliotheksübungen, die im Code nicht mehr vorkommen: `is_archived = true` (nicht löschen, wegen der Historie).
4. Zeilen mit `source = 'custom'` werden **nie** angefasst.
5. Alles in einer Transaktion. Bei einem Fehler bleibt der alte Stand erhalten.

Bibliotheksübungen sind in der App nicht direkt editierbar (sonst würde der nächste Abgleich die Änderung überschreiben). Möglich sind Präferenz setzen, ausblenden und „als eigene Übung kopieren". Eigene Übungen sind voll editierbar.

Tests: Die Bibliothek wird per Vitest geprüft: alle Felder gültig laut Zod, Slugs eindeutig, `alternative_slugs` verweisen auf existierende Übungen, mindestens 200 Übungen, alle 9 HYROX-Stationen vorhanden.

---

## 5. RPC-Funktionen (Postgres, `security invoker`)

| Funktion | Zweck |
|---|---|
| `save_workout_session(p jsonb)` | Speichert Session, Übungen, Sätze und Rekorde atomar. Idempotent über Client-IDs: Upsert; Kind-Datensätze, die im Payload fehlen, werden entfernt. Setzt den zugehörigen `planned_workout` auf `completed`. |
| `sync_exercise_library(p_version int, p_exercises jsonb)` | siehe §4 |
| `replace_week_plan(p_week_start date, p_workouts jsonb)` | Ersetzt nur zukünftige, noch geplante Einheiten einer Woche |
| `complete_onboarding(p jsonb)` | Speichert Profil, Ziele, erste Körperwerte und manuelle Bestleistungen in einem Schritt |

Die fachliche Berechnung (z. B. welche Werte ein neuer Rekord sind) erfolgt in `src/domain/` und ist dort getestet. Die SQL-Funktionen speichern nur und sichern die Konsistenz.

---

## 6. Indizes

- `workout_sessions (user_id, started_at desc)` – Verlauf, Dashboard, Generator-Historie
- `session_exercises (session_id)`, `session_exercises (exercise_id)` – Fortschritt je Übung
- `session_sets (session_exercise_id)`
- `planned_workouts (user_id, scheduled_date)`
- `body_measurements (user_id, measured_on desc)`
- `readiness_checkins (user_id, checked_at desc)`
- Unique-Indizes wie oben beschrieben

---

## 7. Migrationsreihenfolge (Phase 2/3)

Dateinamen folgen der Supabase-CLI: `supabase/migrations/<Zeitstempel>_<name>.sql`, angelegt mit `npx supabase migration new <name>`. Die Nummern unten bezeichnen nur die Reihenfolge. Angewendet werden Migrationen mit `npm run db:push`, danach werden die TypeScript-Typen mit `npm run db:types` neu erzeugt.

| Nr. | Migration | Schritt |
|---|---|---|
| 0001 | Basis: `set_updated_at()`, `profiles`, `training_goals`, RLS | 2.3 |
| 0002 | `exercises`, `sync_exercise_library()` | 2.4 |
| 0003 | `body_measurements`, `personal_records`, `complete_onboarding()` | 2.5 |
| 0004 | `workout_sessions`, `session_exercises`, `session_sets`, `save_workout_session()` | 2.7 |
| 0005 | `week_plans`, `planned_workouts`, `replace_week_plan()` | 3.1 |
| 0006 | `readiness_checkins` | 3.5 |

Die Übungsbibliothek (2.4) kommt vor dem Onboarding (2.5), weil das Onboarding bevorzugte/unbeliebte Übungen und manuelle Bestleistungen auf Übungen bezieht.
