# HYROX Performance Coach – Projektdokumentation

> Lebendes Dokument. Wird nach jeder abgeschlossenen Phase aktualisiert.
> Vollständige Anforderungen: [`docs/SPEC.md`](docs/SPEC.md) · Regeln für Claude Code: [`CLAUDE.md`](CLAUDE.md)
> Planung: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/DATABASE.md`](docs/DATABASE.md) · [`docs/GENERATOR.md`](docs/GENERATOR.md)

**Letzte Aktualisierung:** 19.10.2026

---

## 0. Aktueller Stand

| | |
|---|---|
| **Aktuelle Phase** | Phase 2 – Schritt 2.2 Deployment & PWA-Grundlage (PWA lokal umgesetzt; Deployment offen) |
| **Letzter verifizierter Meilenstein** | Schritt 2.1 Projektsetup (vom Nutzer getestet) |
| **Nächster Schritt** | Commit + Push (Freigabe des Nutzers) → Cloudflare Pages einrichten → Installation am Handy testen |
| **Blocker** | Deployment braucht Push auf GitHub und ein Cloudflare-Konto |
| **Git** | Auf Wunsch des Nutzers wird erst committet, wenn er es ausdrücklich sagt. Phase 1, 2.1 und 2.2 sind noch nicht committet. |

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
| Phase 2 | Funktionsfähige Basisversion | 🔄 in Arbeit (2.1 erledigt, 2.2 läuft) |
| Phase 3 | Erweiterung | offen |
| Phase 4 | Fertigstellung | offen |

### Phase 2 – Funktionsfähige Basisversion

| Schritt | Inhalt | Test durch den Nutzer |
|---|---|---|
| **2.1 Projektsetup** ✅ | Vite + React + TS strict, Tailwind mit Design-Tokens, oxlint/Prettier, Vitest, React Router, TanStack Query; Skripte `dev`, `typecheck`, `test`, `build`, `lint`; App-Rahmen mit Bottom-Navigation und leeren Bereichsseiten | App lokal starten, am Handy im Heimnetz öffnen, Navigation durchklicken |
| **2.2 Deployment & PWA-Grundlage** 🔄 | Cloudflare Pages mit GitHub verbinden (Auto-Deploy von `main`), Manifest + Icons, App installierbar | HTTPS-Adresse am Handy öffnen, „Zum Startbildschirm hinzufügen", App startet im Vollbild |
| **2.3 Supabase & Login** | Projekt anlegen (Anleitung), Registrierung aus, Konto manuell anlegen, `.env.local`, Migration 0001 (`profiles`, `training_goals`, RLS), Login/Logout, Routenschutz | Login mit richtigem/falschem Passwort, Abmelden, geschützte Seiten nicht ohne Login erreichbar |
| **2.4 Übungsbibliothek** | Datenstruktur + Zod-Schema, Wertelisten (Muskeln, Equipment), 200+ Übungen (in Teilschritten), Validierungstests, Migration 0002, Synchronisierung, Bibliotheksseite mit Suche/Filter und Detailansicht | Bibliothek durchsuchen/filtern; Übung im Code ändern → nach Neuladen in der App sichtbar |
| **2.5 Onboarding & Profil** | Migration 0003, mehrstufiges Onboarding (Körperdaten, Hintergrund, Ziele, Bedingungen, Präferenzen, Bestleistungen), Profilseite zum Bearbeiten | Onboarding durchlaufen, Daten im Profil ändern, nach erneutem Login noch vorhanden |
| **2.6 Trainingsgenerator** | `domain/generator` mit allen Pflichttests, Generator-Seite mit Eingaben, Vorschau, Erklärung, „Neu erzeugen", Übung austauschen | Verschiedene Schwerpunkte/Dauern erzeugen, Geräte abwählen, Erklärung prüfen |
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
| 19.10.2026 | Phase 1 – Architektur, Datenbankkonzept, Generator-Algorithmus, Roadmap (`docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/GENERATOR.md`) | noch nicht committet |
| 19.10.2026 | Schritt 2.1 – Projektsetup (Vite 8, React 19, TS 7, Tailwind 4, App-Rahmen mit Bottom-Navigation) | noch nicht committet |

---

## 8. Bekannte Bugs und Einschränkungen

*Keine Bugs.*

Offene Kleinigkeiten:
- `npm install` warnt vor einem veralteten `glob@11` (kommt über `vite-plugin-pwa` → `workbox-build`, nur Entwicklungswerkzeug, nicht in der App). Verschwindet mit einem Update von workbox.
- Der Service Worker speichert alle Zeichensätze der Schrift Inter vor (Precache gesamt ca. 650 KB). Das wird in Schritt 4.2 optimiert.

Rahmenbedingungen (keine Bugs, siehe `docs/ARCHITECTURE.md` §9):
- Supabase Free Tier pausiert Projekte nach 7 Tagen ohne Aktivität (Fortsetzen per Klick, Daten bleiben).
- iOS: PWA-Installation nur über Safari; Timer im Hintergrund werden über Zeitstempel korrekt nachgeführt.

---

## 9. Nächste Aufgaben

1. Commits und Push auf Freigabe des Nutzers. Vorgeschlagen:
   `docs: Phase 1 – Architektur, Datenbankkonzept und Generator-Algorithmus`,
   `chore: Projektsetup mit Vite, React, Tailwind und Vitest`,
   `feat: PWA-Grundlage mit Manifest, Icons und Service Worker`.
2. Cloudflare Pages mit dem GitHub-Repository verbinden (Anleitung im Chat) und die Installation am Handy testen.
3. Schritt 2.3 Supabase & Login.

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
