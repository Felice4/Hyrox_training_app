# HYROX Performance Coach – Projektdokumentation

> Lebendes Dokument. Wird nach jeder abgeschlossenen Phase aktualisiert.
> Vollständige Anforderungen: [`docs/SPEC.md`](docs/SPEC.md) · Regeln für Claude Code: [`CLAUDE.md`](CLAUDE.md)
> Planung: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/DATABASE.md`](docs/DATABASE.md) · [`docs/GENERATOR.md`](docs/GENERATOR.md)

**Letzte Aktualisierung:** 19.10.2026

---

## 0. Aktueller Stand

| | |
|---|---|
| **Aktuelle Phase** | Phase 2 – Schritt 2.7 Trainingsmodus & Speichern |
| **Letzter verifizierter Meilenstein** | Schritt 2.6 – Trainingsgenerator mit Generator-Seite (vom Nutzer getestet) |
| **Nächster Schritt** | Nutzer testet Trainingsmodus → 2.7c Verlauf für Generator, „Letztes Mal", Rekorde im Profil |
| **Blocker** | keine |
| **Git** | Commits und Pushes nur auf ausdrückliche Anweisung des Nutzers. Stand auf GitHub: `587d7d7`. |

---

## 1. Vision und Ziele

Eine private, moderne Fitness-PWA für genau einen Nutzer, **primär für das Smartphone**, die HYROX-Leistung, Kraft, Muskelaufbau und Ausdauer langfristig und systematisch verbessert.

Kern ist ein **regelbasierter Trainingsgenerator**, der innerhalb von Sekunden passende Workouts und Wochenpläne erstellt, Trainingsleistungen dokumentiert und daraus konservative, nachvollziehbare Empfehlungen ableitet. Die App läuft auf Smartphone und Laptop mit automatischer Synchronisierung.

Die vier Hauptziele (Muskelaufbau, Kraft, Ausdauer, HYROX) sind standardmäßig gleich gewichtet; die Gewichtung ist anpassbar.

---

## 2. Funktionsumfang (Überblick)

Details und Akzeptanzkriterien stehen in `docs/SPEC.md` (Abschnittsnummern in Klammern).

- **Login & Sicherheit** – E-Mail/Passwort, keine öffentliche Registrierung, RLS (§2, §12)
- **Onboarding** – Körperdaten, Trainingshintergrund, Ziele, Trainingsbedingungen; später im Profil bearbeitbar (§4)
- **Trainingsgenerator** – spontane Workouts und automatische Wochenpläne mit nachvollziehbarer Logik (§5)
- **Übungsbibliothek** – 200+ Übungen, zentral im Code pflegbar, Import/Sync, Verwaltungsoberfläche (§6)
- **Trainingsmodus** – Sätze, Gewichte, Wiederholungen, Distanz/Zeit, Timer, Austausch, Teilabschluss (§7)
- **Trainingskalender** – Monats-/Wochenansicht, geplant/abgeschlossen/ausgefallen, verschieben (§8)
- **Fortschritt & Statistiken** – Häufigkeit, Kraft, Ausdauer, HYROX, Bestleistungen, Körperdaten (§9)
- **Dashboard** – Startseite mit nächstem Training, Wochenübersicht, Fortschritten (§10)
- **Tagesform-Check-in** – Energie, Muskelkater, Schlaf, Erholung → Intensitätsanpassung (§11)
- **Datenexport** – CSV/JSON (§12)
- **PWA** – installierbar, Mobile-first, Touch-optimiert (§13)
- **Später (nicht in V1)** – KI-Analyse, Wettkampfvorbereitung, Zyklen, Prognosen, Health-Integrationen (§14)

---

## 3. Technologie-Stack

| Bereich | Technologie |
|---|---|
| Frontend | React, TypeScript (strict), Vite |
| Styling | Tailwind CSS, eigene UI-Komponenten |
| Routing | React Router |
| Server-Zustand | TanStack Query |
| Validierung | Zod |
| Datum | date-fns (Locale `de`) |
| Backend / DB | Supabase (PostgreSQL, RLS, RPC-Funktionen) |
| Authentifizierung | Supabase Auth (E-Mail + Passwort, Registrierung deaktiviert) |
| Migrationen | Supabase CLI (`supabase/migrations/`) |
| Diagramme | Recharts |
| Kalender | eigene Monats-/Wochenansicht |
| PWA | vite-plugin-pwa |
| Tests | Vitest |
| Hosting | Cloudflare Pages (Frontend) + Supabase Free Tier |

Begründungen: `docs/ARCHITECTURE.md` §3.

---

## 4. Architektur

Siehe [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Kurzfassung:

- Statische SPA ohne eigenes Backend; Sicherheit über Supabase Auth + RLS.
- Schichten: `features/` (UI je Bereich) → `api/` (einzige Stelle mit Supabase-Aufrufen) → `domain/` (reine, getestete Trainingslogik) und `data/exercises/` (Übungsbibliothek im Code).
- Laufendes Training wird lokal als Entwurf gesichert und am Ende atomar und idempotent per RPC gespeichert.
- Bottom-Navigation: Start · Training · Kalender · Statistik · Mehr.

---

## 5. Datenbankstruktur

Siehe [`docs/DATABASE.md`](docs/DATABASE.md). Tabellen: `profiles`, `training_goals`, `exercises`, `body_measurements`, `readiness_checkins`, `week_plans`, `planned_workouts`, `workout_sessions`, `session_exercises`, `session_sets`, `personal_records`. Alle mit `user_id` und RLS.

---

## 6. Roadmap

Jeder Schritt endet mit: Typprüfung, Tests und Build grün → Testanleitung → Test durch den Nutzer → Commit → Freigabe des nächsten Schritts.

| Phase | Inhalt | Status |
|---|---|---|
| Setup 1–4 | Werkzeuge, Git, Dokumentation, GitHub | ✅ erledigt |
| Phase 1 | Planung: Architektur, DB-Schema, Ordnerstruktur, Generator-Algorithmus, Roadmap | ✅ abgenommen |
| Phase 2 | Funktionsfähige Basisversion | 🔄 in Arbeit (2.1–2.6 erledigt) |
| Phase 3 | Erweiterung | offen |
| Phase 4 | Fertigstellung | offen |

### Phase 2 – Funktionsfähige Basisversion

| Schritt | Inhalt | Test durch den Nutzer |
|---|---|---|
| **2.1 Projektsetup** ✅ | Vite + React + TS strict, Tailwind mit Design-Tokens, oxlint/Prettier, Vitest, React Router, TanStack Query; Skripte `dev`, `typecheck`, `test`, `build`, `lint`; App-Rahmen mit Bottom-Navigation und leeren Bereichsseiten | App lokal starten, am Handy im Heimnetz öffnen, Navigation durchklicken |
| **2.2 Deployment & PWA-Grundlage** ✅ | Cloudflare Pages mit GitHub verbinden (Auto-Deploy von `main`), Manifest + Icons, App installierbar | HTTPS-Adresse am Handy öffnen, „Zum Startbildschirm hinzufügen", App startet im Vollbild |
| **2.3 Supabase & Login** ✅ | Projekt anlegen (Anleitung), Registrierung aus, Konto manuell anlegen, `.env.local`, Migration 0001 (`profiles`, `training_goals`, RLS), Login/Logout, Routenschutz | Login mit richtigem/falschem Passwort, Abmelden, geschützte Seiten nicht ohne Login erreichbar |
| **2.4 Übungsbibliothek** ✅ | Datenstruktur + Zod-Schema, Wertelisten (Muskeln, Equipment), 200+ Übungen (in Teilschritten), Validierungstests, Migration 0002, Synchronisierung, Bibliotheksseite mit Suche/Filter und Detailansicht | Bibliothek durchsuchen/filtern; Übung im Code ändern → nach Neuladen in der App sichtbar |
| **2.5 Onboarding & Profil** ✅ | Migration 0003, mehrstufiges Onboarding (Körperdaten, Hintergrund, Ziele, Bedingungen, Präferenzen, Bestleistungen), Profilseite zum Bearbeiten | Onboarding durchlaufen, Daten im Profil ändern, nach erneutem Login noch vorhanden |
| **2.6 Trainingsgenerator** ✅ | `domain/generator` mit allen Pflichttests, Generator-Seite mit Eingaben, Vorschau, Erklärung, „Neu erzeugen", Übung austauschen | Verschiedene Schwerpunkte/Dauern erzeugen, Geräte abwählen, Erklärung prüfen |
| **2.7 Trainingsmodus & Speichern** | Migration 0004 + `save_workout_session`, aktives Training (Sätze, Gewichte, Wdh., Distanz/Zeit), Pausen-/Intervalltimer, Rundenzähler, überspringen/austauschen, pausieren, lokaler Entwurf, Abschluss mit RPE/Notizen/Zusammenfassung, letzte Gewichte & Bestleistungen | Training im Studio-Szenario durchspielen, Seite zwischendurch neu laden, teilweise abschließen, doppelt speichern → nur ein Eintrag |
| **2.8 Dashboard** | Begrüßung, Buttons, Einheiten dieser Woche, Trainingsbelastung, letzte Workouts, Fortschritte; „Nächstes Training"/„Kommende Tage" mit Leerzustand bis Phase 3 | Dashboard nach einigen Trainings prüfen |

### Phase 3 – Erweiterung

| Schritt | Inhalt |
|---|---|
| **3.1 Wochenplanung** | Migration 0005, `generateWeekPlan` + Tests, Wochenplan erzeugen/bearbeiten (verschieben, ersetzen, spontane Einheit, ausgefallen), geplantes Training starten |
| **3.2 Trainingskalender** | Monats-/Wochenansicht, Status-Kennzeichnung, Tagesdetails, zukünftige Einheiten verschieben |
| **3.3 Fortschrittsanalysen** | Häufigkeit, geplant vs. absolviert, Kraftentwicklung je Übung, Lauf/Ergometer/Pace, HYROX-Stationen, Bestleistungen, Körperwerte erfassen + Verlauf |
| **3.4 Trainingshistorie** | Liste und Detailansicht absolvierter Trainings, Notizen nachträglich bearbeiten |
| **3.5 Regenerationslogik** | Migration 0006, Tagesform-Check-in vor dem Training, Anbindung an Generator und Dashboard |
| **3.6 Erweiterte Übungsverwaltung** | Eigene Übungen anlegen/bearbeiten/archivieren, Bibliotheksübung als eigene kopieren, Präferenzen und Ausblenden |

### Phase 4 – Fertigstellung

| Schritt | Inhalt |
|---|---|
| **4.1 Responsive-Feinschliff** | Laptop-Layout (Seitenleiste), Feinschliff aller Ansichten, Barrierefreiheit (Kontraste, Fokus) |
| **4.2 PWA vollständig** | Caching-Strategie, Update-Hinweis bei neuer Version, Offline-Hinweis |
| **4.3 Datenexport** | CSV/JSON-Export aller Trainingsdaten |
| **4.4 Tests & Sync-Prüfung** | Testabdeckung der Domäne prüfen, manuelle Checkliste: zweites Gerät, erneuter Login |
| **4.5 Dokumentation** | `docs/INSTALL.md`: Einrichtung, Deployment, Bibliothek erweitern, Backup |

---

## 7. Abgeschlossene Meilensteine

| Datum | Meilenstein | Commit |
|---|---|---|
| 16.10.2026 | Setup 1 – Node v24.20.0, npm 11.19.0, VS Code 1.141.2, Claude Code 2.1.301, Git 2.55.0 installiert | – |
| 16.10.2026 | Setup 2 – Git-Repository mit `.gitignore` und `.gitattributes` initialisiert | `6daabbe` |
| 16.10.2026 | Setup 3 – Projektdokumentation und VS Code-Einstellungen angelegt | `31a6287` |
| 19.10.2026 | Setup 4 – GitHub-Repository `Felice4/Hyrox_training_app` verbunden | `daa68b2` |
| 19.10.2026 | Phase 1 – Architektur, Datenbankkonzept, Generator-Algorithmus, Roadmap (`docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/GENERATOR.md`) | `bef66eb` |
| 19.10.2026 | Schritt 2.1 – Projektsetup (Vite 8, React 19, TS 7, Tailwind 4, App-Rahmen mit Bottom-Navigation) | `32a4213` |
| 20.10.2026 | Schritt 2.2 – PWA-Grundlage, Deployment über Cloudflare Pages, Installation am Smartphone | `587d7d7` |
| 20.10.2026 | Schritt 2.3 – Supabase-Projekt, Migration 0001 (Profil, Ziele, RLS), Login/Logout, Routenschutz | `4813e72` |
| 21.10.2026 | Schritt 2.4 – Übungsbibliothek: 211 Übungen im Code, Migration 0002 + Abgleich, Bibliotheksseite mit Suche/Filter/Detail | `ed087cb` … `e2e7d9d` |
| 21.10.2026 | Schritt 2.5 – Migration 0003, Onboarding in 5 Schritten, Profilseite | `8886d97` … `058512a` |
| 21.10.2026 | Schritt 2.6 – Trainingsgenerator (Grundlagen, Kern, Generator-Seite) | `4ca67df` … `a180b7b` |

---

## 8. Bekannte Bugs und Einschränkungen

*Keine offenen Bugs in der App.*

Hinweis (Werkzeuge):
- Mit aktivem VPN kann die Supabase-CLI die Datenbank nicht erreichen (hängt bei „Initialising login role…“). Ohne VPN funktioniert `db push`/`db query` normal. Die App selbst ist nicht betroffen.

Behoben:
- 20.10.2026: `VITE_SUPABASE_URL` war mit `/rest/v1/` eingetragen, deshalb schlugen alle Anfragen mit `PGRST125` fehl. `.env.local` ist korrigiert. `src/lib/env.ts` lehnt URLs mit Pfad jetzt mit klarer Meldung ab.

Offene Kleinigkeiten:
- **Für Schritt 2.7 merken:** Der Generator erhält derzeit einen leeren Trainingsverlauf (`NO_HISTORY_YET` in `GeneratorPage.tsx`). Mit gespeicherten Trainings den Verlauf der letzten 28 Tage laden und übergeben – erst dann wirken Ermüdung, Abwechslung, Belastung und Gewichtsvorschläge.
- **Für Schritt 2.7 merken:** Die Profilseite zeigt bei den Bestleistungen nur manuelle Einträge. Sobald Trainings Rekorde speichern, sollte sie Rekorde aus Trainings als Info anzeigen (nur lesbar), damit ein leeres Feld nicht so wirkt, als gäbe es keinen Rekord.
- `npm install` warnt vor einem veralteten `glob@11` (kommt über `vite-plugin-pwa` → `workbox-build`, nur Entwicklungswerkzeug, nicht in der App). Verschwindet mit einem Update von workbox.
- Der Service Worker speichert alle Zeichensätze der Schrift Inter vor (Precache gesamt ca. 950 KB). Das wird in Schritt 4.2 optimiert.
- Das JavaScript-Bundle ist mit Supabase-Client und Zod ca. 650 KB groß (190 KB gzip). Vite warnt deshalb beim Build. Das wird in Schritt 4.1/4.2 per Code-Splitting der Seiten optimiert.

Rahmenbedingungen (keine Bugs, siehe `docs/ARCHITECTURE.md` §9):
- Supabase Free Tier pausiert Projekte nach 7 Tagen ohne Aktivität (Fortsetzen per Klick, Daten bleiben).
- iOS: PWA-Installation nur über Safari; Timer im Hintergrund werden über Zeitstempel korrekt nachgeführt.

---

## 9. Nächste Aufgaben

1. Optional: In Supabase unter Authentication → URL Configuration die Site URL auf die Cloudflare-Adresse setzen.
2. Schritt 2.7 Trainingsmodus & Speichern in Teilschritten:
   - **2.7a** ✅ Migration 0004 (`workout_sessions`, `session_exercises`, `session_sets`, FK für `personal_records.session_id`) + `save_workout_session()` (idempotent, in zurückgerollter Transaktion getestet). Trainingsablauf als reine Funktionen (`src/domain/session/`): Start aus generiertem Workout, Reihenfolge inkl. Zirkel, Abhaken mit Übernahme der Vorgabe, Pausentimer per Zeitstempel, Sätze hinzufügen/entfernen, Überspringen, Tauschen (nur unbegonnene Übungen), Pausieren, Beenden, Auswertung. Rekorderkennung (`src/domain/records/detect.ts`), Speicher-Nutzlast. 30 neue Tests. Commit `e4fae64`.
   - **2.7b** ✅ umgesetzt: Trainingsmodus `/training/active` (Vollbild): Trainingszeit, Pause/Fortsetzen, Fortschritt, aktueller Satz mit Ziel, Progressionshinweis und Anleitung, große Zahlenfelder mit ± (Gewichtsstufe je Gerät), Zeitfeld m:ss, Arbeitstimer (Countdown bzw. Stoppuhr, Zeit wird eingetragen), optionale Satz-RPE, „Satz geschafft" übernimmt die Vorgabe, Satzpause mit ±15 s, Vibration am Ende, Bildschirm bleibt an (Wake Lock), Vorschau „Als Nächstes", Übersicht aller Sätze zum Springen, + Satz, Tauschen (nur unbegonnene Übungen), Überspringen. Abschluss: Zusammenfassung, Gesamt-RPE, Notizen, Speichern (idempotent, 2 automatische Wiederholungen), „Doch weiter trainieren", Bestätigung mit neuen Bestleistungen. Start aus der Generator-Vorschau, Hinweis „Laufendes Training fortsetzen". Alles lokal gesichert bis zum erfolgreichen Speichern.
   - **2.7c**: Verlauf aus gespeicherten Trainings für den Generator (Ermüdung, Abwechslung, Gewichtsvorschläge), „Letztes Mal" im Trainingsmodus, Rekorde aus Trainings auf der Profilseite.
3. Erledigt – Schritt 2.6 Trainingsgenerator:
   - **2.6a** ✅ Grundlagen in `src/domain/`: Typen (`generator/types.ts`), alle Stellschrauben (`generator/config.ts`), Zufallsgenerator mit Seed (`random.ts`), Tagesform (`readiness/`), Trainingsbelastung sRPE akut/chronisch (`load/trainingLoad.ts`), Muskelermüdung (`load/muscleFatigue.ts`), Zeitschätzung (`duration/estimate.ts`). 49 Tests. Commit `4ca67df`.
   - **2.6b** ✅ Generator-Kern: Vorlagen je Schwerpunkt mit Rollen und Zirkeln, Bewertung/Auswahl per Seed, Dosierung inkl. Gewichtsvorschlag (doppelte Progression), Zeitanpassung mit Rücksetzen und Stellknöpfen, Erklärung, Übungsaustausch (`suggestAlternatives`, `swapExercise`), Zod-Schema für das Ergebnis, Schnittstelle `WorkoutGenerator`. Pflichttests 1–4 aus SPEC §15 + Determinismus u. a. (39 Tests). Belastungstest mit 24 000 Workouts: 0 Abweichungen über ±10 %. Details: `docs/GENERATOR.md` §5a. Commit `ef8c233`.
   - **2.6c** ✅ umgesetzt: Generator-Seite `/training`: Formular (Schwerpunkt, Dauer, Intensität, Tagesform; optional Muskelgruppen, HYROX-Stationen, heute fehlende Geräte), Vorschau nach Blöcken mit Zirkel-Runden, Sätzen, Gewicht, Pausen und Progressionshinweisen, „Warum dieses Training?", Recovery-Hinweis, „Neu erzeugen", „Anpassen", Austausch je Übung. Workout wird lokal gesichert. „Training starten" bis 2.7 deaktiviert. Verlauf ist bis 2.7 leer (keine gespeicherten Trainings). Commit `a180b7b`, vom Nutzer getestet.
3. Erledigt – Schritt 2.5 Onboarding & Profil:
   - **2.5a** ✅ Code fertig: Migration 0003 (`body_measurements`, `personal_records`, `profiles.hyrox_best_time_sec`, `save_profile()`), Wertelisten (`src/domain/profile/vocabulary.ts`), 8 Bestleistungs-Vorlagen (`src/domain/records/presets.ts`), Zod-Schema mit Altersprüfung, Standardwerte, Umwandlung für `save_profile`, Zeit-Hilfen (`4:05` ⇄ Sekunden), Tests. Migration eingespielt, `save_profile` in zurückgerollter Transaktion getestet. Commit `8886d97`.
   - **2.5b** ✅ umgesetzt: Onboarding `/onboarding` in 5 Schritten (Über dich, Hintergrund inkl. Bestleistungen, Ziele, Trainingsbedingungen, Vorlieben). Prüfung je Schritt, Entwurf wird lokal gesichert, Speichern über `save_profile`. `RequireOnboarding` leitet alle Hauptbereiche zum Onboarding, solange es offen ist. Neue UI-Bausteine: ChoiceChips, OptionCards, Stepper, RangeField, TextArea. Begrüßung im Dashboard mit Namen. Commit `69dbec4`, vom Nutzer getestet und gepusht.
   - **2.5c** ✅ umgesetzt: Profilseite `/profile` (über „Mehr") mit allen Abschnitten des Onboardings auf einer Seite. Speichern nur bei Änderungen, „Verwerfen", Warnung beim Verlassen mit ungespeicherten Änderungen. Gewicht/Körperfett leer mit Hinweis auf den letzten Wert; eine Eingabe legt einen neuen Messwert für heute an. Daten werden parallel geladen (`fetchProfileDetails`) und nicht automatisch überschrieben, solange man bearbeitet. Commit `058512a`, vom Nutzer getestet.
3. Erledigt – Schritt 2.4 Übungsbibliothek:
   - **2.4a** ✅ Datenmodell (`src/data/exercises/`), Wertelisten mit deutschen Bezeichnungen, Zod-Schema, Tests, 63 Übungen (28 HYROX, 15 Warm-up, 11 Mobility, 9 Cool-down/Regeneration). Commit `ed087cb`.
   - **2.4b** ✅ +148 Übungen → **211** (Unterkörper 33, Push 24, Pull 23, Rumpf 21, Explosiv/Ganzkörper 22, Ausdauer 25). `LIBRARY_VERSION` = 2. Tests: mind. 200 Übungen, alle Kategorien vertreten. Commit `f29f55f`.
   - **2.4c** ✅ Migration 0002 (`exercises`, RLS, kein DELETE) + `sync_exercise_library()` angewendet, in zurückgerollter Transaktion getestet. App gleicht nach dem Login einmal pro Sitzung ab (`src/api/exerciseLibrary.ts`, `useLibrarySync`) und zeigt nur bei Fehlern einen Hinweis. Commit `09fef07`.
   - **2.4d** ✅ Bibliotheksseite `/exercises` (Suche ohne Umlaut-Probleme, Kategorie-Chips, Muskel- und Gerätefilter, Filter bleiben in der Adresse erhalten) und Detailseite `/exercises/:slug` (Ausführung, Belastung, Muskeln, Geräte, Alternativen). Erreichbar über „Mehr". Commit `e2e7d9d`; vom Nutzer lokal und am Handy getestet (211 Übungen sichtbar).

**Prüfergebnis Supabase (20.10.2026):** Migration lokal = remote. `profiles` und `training_goals` mit aktivem RLS und je 3 Policies (select/insert/update, `to authenticated`, `auth.uid() = user_id`). `anon` hat keine Tabellenrechte, Lesen/Schreiben ohne Login liefert HTTP 401. Registrierung deaktiviert (Signup liefert `signup_disabled`), anonyme Anmeldung aus, 1 bestätigtes Konto vorhanden.

---

## 10. Technische Entscheidungen

| Datum | Entscheidung | Begründung |
|---|---|---|
| 16.10.2026 | Entwicklung unter Windows 11 mit PowerShell und VS Code | Vorhandene Umgebung des Nutzers |
| 16.10.2026 | Projektordner `C:\Users\Felix\dev\hyrox-coach` (außerhalb von OneDrive) | OneDrive-Synchronisierung von `node_modules` verursacht Probleme |
| 16.10.2026 | Zeilenenden LF via `.gitattributes` und VS Code `files.eol` | Einheitlich über Windows und Linux-Hosting, keine Phantom-Änderungen |
| 16.10.2026 | Hauptbranch `main`, Conventional Commits mit deutscher Beschreibung | Standard, gut lesbare Historie |
| 16.10.2026 | `docs/SPEC.md` ist die maßgebliche Anforderungsquelle; `PROJECT.md` dokumentiert Stand und Entscheidungen | Keine doppelte Pflege der Anforderungen |
| 16.10.2026 | UI auf Deutsch, Bezeichner im Code auf Englisch | Spezifikation verlangt deutsche UI; englische Bezeichner sind Standard in Bibliotheken und Doku |
| 19.10.2026 | Smartphone ist das Hauptgerät; alle Ansichten werden zuerst für Handygröße entworfen | Wunsch des Nutzers |
| 19.10.2026 | Entwicklung am PC; Test am Handy per Heimnetz (`npm run dev -- --host`) und per Deployment | Claude Code arbeitet auf dem PC; PWA wird über den Browser installiert |
| 19.10.2026 | Deployment (Cloudflare Pages) und PWA-Grundlage schon in Schritt 2.2 statt Phase 4 | App von Anfang an echt am Handy nutzbar; Installation braucht HTTPS |
| 19.10.2026 | Eigene Kalenderansicht statt FullCalendar | Kleiner, am Smartphone besser anpassbar, nur einfache Funktionen nötig |
| 19.10.2026 | Zusätzliche Bibliotheken: React Router, TanStack Query, Zod, date-fns, vite-plugin-pwa | Bewährte Standards; vom Nutzer freigegeben |
| 19.10.2026 | Planung in eigenen Dokumenten unter `docs/` | `PROJECT.md` bleibt übersichtlich |
| 19.10.2026 | Kein eigenes Backend; Sicherheit über Supabase Auth + RLS; Speichervorgänge mit mehreren Tabellen als RPC-Funktionen (`security invoker`) | Einfach, kostenlos, atomar |
| 19.10.2026 | Client-generierte UUIDs für Trainingsdaten; Speichern per Upsert | Idempotenz, keine Doppeleinträge |
| 19.10.2026 | Laufendes Training als lokaler Entwurf (`localStorage`), keine allgemeine Offline-Sync in V1 | Kein Datenverlust bei schlechtem Netz, ohne Konfliktlogik |
| 19.10.2026 | Jede Tabelle hat eine eigene `user_id`-Spalte; Auswahlwerte als `text` + `check` statt Enums | Einfache RLS-Policies; leichter migrierbar |
| 19.10.2026 | Übungsbibliothek im Code mit stabilen Slugs und Versionsnummer; Sync per Upsert, entfernte Übungen werden archiviert; eigene Übungen unberührt | Historie bleibt erhalten, Pflege im Code bleibt einfach |
| 19.10.2026 | Übungsbibliothek (2.4) vor Onboarding (2.5) | Onboarding verweist auf Übungen (Präferenzen, Bestleistungen) |
| 19.10.2026 | Generator deterministisch mit Seed; Schwellenwerte zentral in `config.ts`; Interface `WorkoutGenerator` für spätere KI-Variante | Testbar, anpassbar, erweiterbar |
| 19.10.2026 | Trainingsbelastung nach sRPE-Methode (RPE × Minuten) | Einfach, etabliert, ohne Zusatzgeräte |
| 19.10.2026 | Design: Akzent Lime (`#C6F432`), Orange für HYROX/Warnungen; Schriften lokal ausgeliefert | Sportlich, kontrastreich; keine externen Abrufe |
| 19.10.2026 | Versionen beim Setup: Vite 8, React 19, TypeScript 7, Tailwind 4, React Router 8, TanStack Query 5, Vitest 5 | Aktuelle stabile Versionen laut `create-vite` 9.3 / npm |
| 19.10.2026 | oxlint statt ESLint, dazu Prettier (ohne Semikolons, einfache Anführungszeichen); `*.md` von Prettier ausgenommen | Standard der aktuellen Vite-Vorlage, schnell; Doku-Tabellen bleiben unverändert |
| 19.10.2026 | Zusätzliche strenge TS-Optionen: `noUncheckedIndexedAccess`, `noImplicitOverride` | Fängt Zugriffe auf möglicherweise fehlende Array-/Objekt-Einträge ab |
| 19.10.2026 | Import-Alias `@/` → `src/` | Kurze, stabile Importpfade |
| 19.10.2026 | React Router v8: `RouterProvider` aus `react-router/dom`, alles andere aus `react-router` | Vorgabe von v8 (Paket `react-router-dom` entfernt) |
| 19.10.2026 | Icons als eigene kleine SVG-Komponenten (`src/components/icons.tsx`) statt Icon-Bibliothek | Wenige Icons nötig; keine zusätzliche Abhängigkeit |
| 19.10.2026 | Tab-Routen: `/`, `/training`, `/calendar`, `/stats`, `/more` | Kurz und eindeutig; Unterseiten folgen jeweils darunter |
| 19.10.2026 | PWA: vite-plugin-pwa 2 mit `generateSW` und `registerType: 'autoUpdate'`; Hochformat, `standalone` | Minimaler Aufwand; ein Update-Hinweis folgt in 4.2 |
| 19.10.2026 | App-Icons als PNG aus `public/app-icon.svg`, einmalig erzeugt (sharp im Scratch-Ordner, keine Projektabhängigkeit) | Kein schweres natives Paket im Projekt |
| 19.10.2026 | Cloudflare Pages: `.node-version` (24), `public/_headers` (Caching für `/assets/*`, Sicherheits-Header); SPA-Fallback automatisch, weil keine `404.html` existiert | Reproduzierbarer Build, schnelle Ladezeiten |
| 20.10.2026 | Supabase-CLI als Entwicklungsabhängigkeit (`npx supabase …`, Skripte `db:push`, `db:types`); Migrationen mit Zeitstempel im Dateinamen | Versionierte, reproduzierbare DB-Änderungen ohne Docker |
| 20.10.2026 | Umgebungsvariable `VITE_SUPABASE_PUBLISHABLE_KEY` (neuer publishable Key, alter anon Key ebenfalls zulässig); Prüfung mit Zod beim Start, geheime Schlüssel werden abgelehnt, bei Fehlern erscheint eine Konfigurationsseite | Aktuelle Supabase-Benennung; Schutz vor versehentlich veröffentlichten Geheimnissen |
| 20.10.2026 | Supabase-Client wird in `main.tsx` erzeugt und per React-Kontext (`useSupabase`) bereitgestellt; Anmeldestatus über `AuthProvider`/`useAuth` | Keine globale Variable, testbar, klare Abhängigkeit |
| 20.10.2026 | Abmelden nur auf dem aktuellen Gerät (`scope: 'local'`); beim Abmelden wird der Query-Cache geleert | Laptop bleibt angemeldet, wenn man sich am Handy abmeldet; keine fremden Daten im Cache |
| 20.10.2026 | Tabellenrechte explizit: `anon` hat keinen Zugriff, `authenticated` nur `select/insert/update` (kein `delete`) auf Profil und Ziele, zusätzlich RLS mit `auth.uid()` | Doppelte Absicherung, unabhängig von Supabase-Standardrechten |
| 20.10.2026 | `supabase/config.toml` (nur lokale Supabase-Umgebung): Registrierung aus, Mindestlänge Passwort 12 | Gleiche Regeln wie im Cloud-Projekt, das im Dashboard konfiguriert wird |
| 20.10.2026 | Übungsbibliothek: `vocabulary.ts` (Wertelisten + deutsche Bezeichnungen), `schema.ts` (Zod, strikt, Typen daraus abgeleitet), eine Datei je Bereich, `index.ts` mit `LIBRARY_VERSION` und Pflegeanleitung | Alles an einer Stelle, Tippfehler werden durch Tests sofort gefunden |
| 20.10.2026 | Übungen haben `trainingTypes` (Liste statt Einzelwert); neue Trainingstypen `stability`, `coordination`; neue Bewegungsmuster `jump`, `mobility`; neue Messarten `weight_distance` (z. B. Sled Push) und `weight_time` (z. B. Farmers Hold) | Viele Übungen dienen mehreren Zielen (z. B. Kraft und Muskelaufbau); HYROX-Stationen brauchen Gewicht × Strecke |
| 20.10.2026 | `hyroxStation` nur bei echten Stationsübungen und direkten Varianten; Kombinationen und Vorbereitungsübungen ohne Station | Die Stationsabdeckung im Generator soll nur echtes Stationstraining zählen |
| 20.10.2026 | Übungsnamen auf Deutsch; etablierte Fachbegriffe (Sled Push, Wall Balls, Burpee …) bleiben englisch | So, wie sie im Studio und bei HYROX genannt werden |
| 20.10.2026 | Migrationen wendet Claude per `npx supabase db push --linked` an (vorher `--dry-run`); Datenbankfunktionen werden in zurückgerollten Transaktionen gegen das Cloud-Projekt getestet | CLI braucht kein DB-Passwort mehr (temporäre Login-Rolle); Tests ohne Spuren in den echten Daten |
| 20.10.2026 | Bibliotheks-Abgleich nur, wenn die gespeicherte `library_version` kleiner als `LIBRARY_VERSION` ist; einmal pro Sitzung über TanStack Query | Die ca. 470 KB große Übungsliste wird nicht bei jedem Start übertragen |
| 20.10.2026 | App liest Übungen aus der Datenbank (nicht direkt aus dem Code) und prüft jede Zeile mit dem Zod-Schema | Eigene Übungen und Präferenzen sind nur in der Datenbank vorhanden; ungültige Zeilen werden übersprungen statt die App abstürzen zu lassen |
| 20.10.2026 | Filter der Bibliothek in der Adresse (Query-Parameter), Übungen per Slug adressiert (`/exercises/hyrox-sled-push`) | Zurück-Navigation behält die Filter; lesbare, stabile Adressen |
| 20.10.2026 | Native Auswahlfelder (`<select>`) für Muskel- und Gerätefilter | Am Smartphone öffnet sich die gewohnte System-Auswahl |
| 21.10.2026 | Eine Datenbankfunktion `save_profile` für Onboarding und Profilseite statt `complete_onboarding` | Ein Speicherweg, atomar, idempotent; Onboarding-Abschluss wird beim ersten Speichern gesetzt |
| 21.10.2026 | Körperwerte: höchstens ein Eintrag pro Tag; Bestleistungen: manuelle Einträge löschbar, Rekorde aus Trainings von Hand nie überschreibbar | Keine Dubletten; echte Trainingsleistungen haben Vorrang vor Schätzungen |
| 21.10.2026 | 8 manuelle Bestleistungen im Onboarding (Kniebeuge/Kreuzheben/Bankdrücken 1 Wdh., Klimmzüge, 1 km, 5 km, 1000 m Rudern, 1000 m SkiErg) + HYROX-Bestzeit im Profil | Häufigste Referenzwerte für HYROX- und Krafttraining; weitere kommen automatisch aus Trainings |
| 21.10.2026 | Formular als Text-Entwurf (`ProfileDraft`), Prüfung erst beim Weiter/Speichern; Zahlen mit Komma oder Punkt, Zeiten als m:ss bzw. h:mm:ss | Natürliche Eingabe am Handy, klare Fehlermeldungen je Feld |
| 21.10.2026 | Onboarding-Entwurf in localStorage (je Nutzer), wird nach erfolgreichem Speichern gelöscht | Kein Datenverlust bei Neuladen oder App-Wechsel während der Einrichtung |
| 21.10.2026 | Körpergewicht im Onboarding Pflicht, auf der Profilseite optional (nur bei Eingabe neuer Messwert) | Startwert für Statistiken; später kein Zwang zum erneuten Eintragen |
| 21.10.2026 | Profilseite als eine lange Seite mit Karten statt Schritten; Speichern-Leiste klebt über der Bottom-Navigation | Gezieltes Ändern einzelner Angaben ohne Durchklicken |
| 21.10.2026 | Generator: Rollen je Übung, Zirkel-Blöcke mit Runden, Zeitanpassung über Sätze/Übungen + Stellknöpfe (Grundlage, Einfahren 5–12 min, Ausfahren), intern ±8 % | Zuverlässig ±10 % in allen Kombinationen, ohne das Warm-up als Zeitpuffer zu missbrauchen |
| 21.10.2026 | Gewünschte HYROX-Stationen werden verbindlich eingeplant (sofern möglich) | Ein ausdrücklicher Wunsch soll nicht vom Zufall abhängen |
| 21.10.2026 | Gewichtsvorschläge nur aus eigener Leistung: +5 kg (Langhantel Unterkörper) bzw. kleinste Stufe, max. +5 %, Halten bei RPE > 8, −7,5 % nach zweimal deutlich verfehltem Ziel, −10 % bei sehr niedriger Tagesform | Konservativ und nachvollziehbar laut Spezifikation |
| 21.10.2026 | Laufendes Training als reine Zustandsfunktionen (`domain/session`) mit übergebener Zeit und ID-Erzeugung; Timer über Zeitstempel | Vollständig testbar; Timer stimmen auch nach Hintergrund/Neuladen |
| 21.10.2026 | Abhaken ohne Eingabe übernimmt die Vorgabe („wie geplant geschafft") | Am Handy im Studio schnell: nur Abweichungen müssen eingetippt werden |
| 21.10.2026 | Übungen nur austauschbar, solange kein Satz abgehakt ist | Eine gespeicherte Übung bleibt eindeutig einer Übung zugeordnet |
| 21.10.2026 | Rekorde entscheidet die Datenbank („nur wenn besser"); die App liefert je Bedingung die beste Leistung des Trainings | Idempotent und unabhängig davon, was die App gerade im Cache hat |
| 21.10.2026 | Abschluss und Speichern bereits in 2.7b (statt 2.7c) | Ein vollständiges Training ist damit direkt testbar |
| 21.10.2026 | Trainingsmodus als eigene Vollbild-Route außerhalb des App-Rahmens; laufendes Training in localStorage bis zum erfolgreichen Speichern | Kein Datenverlust; Navigation lenkt im Studio nicht ab |
| 21.10.2026 | Zahlenfelder zeigen die Vorgabe als Platzhalter; ± startet bei der Vorgabe; Gewichtsschritt je Gerät (Langhantel 2,5 / Kurzhantel 1 / Kettlebell 2 kg) | Schnelle Bedienung mit einer Hand |
| 21.10.2026 | Profildetails ohne automatisches Neuladen (`staleTime: Infinity`), nach dem Speichern gezielt neu geladen; Formular wird dann mit den gespeicherten Werten neu aufgebaut | Ungespeicherte Eingaben werden nie durch einen Hintergrund-Abgleich überschrieben |

---

## 11. Git-Spickzettel

| Situation | Befehl |
|---|---|
| Was hat sich geändert? | `git status` · `git diff` |
| Speicherpunkte anzeigen | `git log --oneline` |
| Alle ungespeicherten Änderungen verwerfen | `git restore .` |
| Neue, noch nicht versionierte Dateien zusätzlich entfernen (Vorsicht!) | `git clean -fd` (vorher mit `git clean -nd` prüfen) |
| Einen alten Stand nur ansehen | `git switch --detach <commit-id>` · zurück mit `git switch main` |
| Einen fehlerhaften Commit rückgängig machen (Historie bleibt) | `git revert <commit-id>` |
| Speichern nach erfolgreichem Test | `git add .` → `git status` prüfen → `git commit -m "feat: …"` |
| Auf GitHub hochladen | `git push` |
