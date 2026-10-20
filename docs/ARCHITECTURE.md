# Architektur – HYROX Performance Coach

> Ergebnis von Phase 1. Ergänzt `docs/SPEC.md` (Anforderungen) und `PROJECT.md` (Stand, Entscheidungen).
> Verwandte Dokumente: [`DATABASE.md`](DATABASE.md) · [`GENERATOR.md`](GENERATOR.md)

---

## 1. Die App in Kürze

Eine private PWA für genau einen Nutzer, **primär für das Smartphone**. Vor dem Training wird in wenigen Sekunden ein passendes Workout erzeugt (regelbasiert, nachvollziehbar). Danach führt die App durch das Training, erfasst Gewichte, Wiederholungen, Zeiten und Distanzen und speichert alles in Supabase. Daraus entstehen Statistiken, Bestleistungen und die Grundlage für die nächsten Vorschläge. Laptop und Smartphone zeigen dieselben Daten, weil alles in der Cloud-Datenbank liegt.

---

## 2. Systemüberblick

```
┌──────────────────────── Smartphone / Laptop (Browser, installierte PWA) ────────────────────────┐
│                                                                                                  │
│   UI (React-Seiten & -Komponenten, Tailwind)                                                     │
│        │                     │                                                                   │
│        ▼                     ▼                                                                   │
│   Server-Zustand          Lokaler Zustand                                                        │
│   (TanStack Query)        (aktives Workout → useReducer + localStorage-Entwurf)                  │
│        │                                                                                         │
│        ▼                                                                                         │
│   Repositories (src/api/*)  ──── einzige Stelle mit Supabase-Aufrufen                            │
│        │                                                                                         │
│   Domain (src/domain/*)   ──── reine Funktionen: Generator, Progression, Belastung, Rekorde       │
│   Übungsbibliothek (src/data/exercises/*) ──── zentrale Datenquelle im Code                      │
└────────┼─────────────────────────────────────────────────────────────────────────────────────────┘
         │ HTTPS (nur anon/publishable Key + Login-Session)
         ▼
┌──────────────────────── Supabase (Free Tier) ────────────────────────┐
│  Auth (E-Mail/Passwort, Registrierung deaktiviert)                    │
│  PostgreSQL mit Row Level Security auf jeder Tabelle                  │
│  RPC-Funktionen für atomare Speichervorgänge (z. B. Workout sichern)  │
└───────────────────────────────────────────────────────────────────────┘

Hosting der statischen App: Cloudflare Pages (automatisches Deployment bei Push auf `main`)
```

**Kein eigenes Backend.** Die App ist eine statische Single-Page-App. Sicherheit entsteht durch Supabase Auth plus RLS. Das ist für einen Nutzer die einfachste zuverlässige Architektur: kein Server zu warten, keine laufenden Kosten.

---

## 3. Technologie-Entscheidungen

| Bereich | Wahl | Begründung |
|---|---|---|
| Build & Framework | Vite + React + TypeScript (strict) | Vorgabe der Spezifikation |
| Styling | Tailwind CSS | Vorgabe; schnelle, konsistente Mobile-first-Oberflächen |
| UI-Komponenten | eigene, kleine Komponenten in `src/components/ui` | Volle Kontrolle über Design und Touch-Größen, keine schwere UI-Bibliothek |
| Routing | React Router | Standard, stabil |
| Server-Zustand | TanStack Query | Caching, Lade-/Fehlerzustände, automatisches Neuladen beim Wechsel zurück in die App → Synchronisierung zwischen Geräten |
| Validierung | Zod | Formulare, Supabase-Antworten und Übungsbibliothek mit denselben Schemas prüfen |
| Datum | date-fns (Locale `de`) | Kalender, Wochen (Start Montag), Formatierung |
| Diagramme | Recharts | Vorgabe |
| Kalender | **eigene Monats-/Wochenansicht** | FullCalendar ist groß und am Smartphone schwer anpassbar; benötigt werden nur Anzeigen, Auswählen, Verschieben |
| PWA | vite-plugin-pwa | Manifest, Icons, Service Worker mit wenig Konfiguration |
| Backend | Supabase (Postgres, Auth, RLS, RPC) | Vorgabe; Free Tier reicht |
| DB-Migrationen | Supabase CLI (`supabase/migrations/*.sql`, `supabase db push`) | Versioniert, reproduzierbar; funktioniert ohne Docker gegen das Cloud-Projekt |
| Tests | Vitest | Vorgabe; schnell, passt zu Vite |
| Linter / Formatierung | oxlint + Prettier | oxlint ist der Standard der aktuellen Vite-Vorlage, sehr schnell, kaum Konfiguration |
| Schriften | @fontsource (Inter Variable, Barlow Condensed) | Lokal ausgeliefert, keine Abrufe bei Google |
| Hosting | Cloudflare Pages | Kostenlos, HTTPS, Deployment aus GitHub, SPA-Fallback ohne Konfiguration |

Neue größere Abhängigkeiten außerhalb dieser Liste nur nach Rückfrage (siehe `CLAUDE.md`).

---

## 4. Ordnerstruktur

```
hyrox-coach/
├─ docs/                      SPEC, ARCHITECTURE, DATABASE, GENERATOR, später INSTALL
├─ public/                    PWA-Icons, favicon
├─ supabase/
│  ├─ config.toml             Supabase-CLI-Konfiguration
│  └─ migrations/             0001_profiles.sql, 0002_exercises.sql, …  (einzige Quelle für DB-Änderungen)
├─ src/
│  ├─ main.tsx                Einstiegspunkt
│  ├─ app/                    App-Rahmen
│  │  ├─ router.tsx           Routen inkl. Schutz (Login / Onboarding erforderlich)
│  │  ├─ providers.tsx        QueryClient, Auth-Kontext
│  │  └─ layout/              AppShell, BottomNav, Kopfzeile
│  ├─ components/ui/          Button, Card, Input, NumberInput, Stepper, Sheet, Badge, Tabs,
│  │                          ProgressRing, Timer-Anzeige, EmptyState, ErrorState, Spinner
│  ├─ features/               Ein Ordner je Hauptbereich (Seiten + bereichsspezifische Komponenten/Hooks)
│  │  ├─ auth/                Login, Abmelden, Auth-Hook
│  │  ├─ onboarding/          Mehrstufiges Formular
│  │  ├─ dashboard/
│  │  ├─ generator/           Eingabeformular, Vorschau, Erklärung
│  │  ├─ training/            Trainingsmodus, Timer, Satz-Erfassung, Abschluss
│  │  ├─ calendar/            Monats-/Wochenansicht, Tagesdetails
│  │  ├─ exercises/           Bibliothek, Detail, eigene Übungen
│  │  ├─ progress/            Statistiken, Diagramme, Körperwerte
│  │  ├─ more/                Übersicht „Mehr"
│  │  └─ profile/             Profil, Ziele, Einstellungen, Export
│  ├─ domain/                 REINE Trainingslogik – kein React, kein Supabase, deterministisch
│  │  ├─ types.ts             Zentrale Domänentypen (Exercise, GeneratedWorkout, SessionLog, …)
│  │  ├─ generator/           Workout- und Wochenplan-Generator (siehe GENERATOR.md)
│  │  ├─ progression/         Gewichts-/Wiederholungsvorschläge
│  │  ├─ load/                Trainingsbelastung, Muskelermüdung
│  │  ├─ readiness/           Tagesform → Intensitätsanpassung
│  │  ├─ records/             Erkennung persönlicher Bestleistungen
│  │  └─ duration/            Zeitschätzung von Workouts
│  ├─ data/exercises/         Übungsbibliothek (TypeScript), aufgeteilt nach Kategorie + index.ts
│  ├─ api/                    Repositories: profile, exercises, sessions, plans, measurements, records
│  ├─ lib/                    supabase-Client, env-Prüfung, queryClient, Datums-/Formatierungshelfer, seeded RNG
│  ├─ types/database.ts       Aus dem Schema generierte Supabase-Typen
│  └─ styles/index.css        Tailwind, Design-Tokens
├─ .env.example               Platzhalter: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
├─ CLAUDE.md · PROJECT.md · README.md
└─ package.json, vite.config.ts (inkl. Vitest), tsconfig*.json, .oxlintrc.json, .prettierrc.json
```

Tests liegen direkt neben dem getesteten Code (`*.test.ts`), Schwerpunkt `src/domain/` und `src/data/exercises/`.

### Abhängigkeitsregeln (Schichten)

```
features  →  api, domain, data, components, lib
api       →  lib (Supabase), domain/types
domain    →  nur domain (und data/exercises für Typen)   ← niemals React, Supabase, Browser-APIs
components → lib
```

`domain/` bekommt alles als Parameter, auch das aktuelle Datum und einen Zufalls-Seed. Dadurch sind die Funktionen deterministisch und mit Vitest vollständig testbar.

---

## 5. Navigation und Bildschirme (Mobile-first)

Bottom-Navigation mit 5 Einträgen (mehr ist am Smartphone unübersichtlich):

| Tab | Inhalt |
|---|---|
| **Start** | Dashboard |
| **Training** | Trainingsgenerator → Vorschau → Trainingsmodus |
| **Kalender** | Monats-/Wochenansicht, Wochenplan |
| **Statistik** | Fortschritt, Bestleistungen, Körperwerte |
| **Mehr** | Übungsbibliothek, Profil & Ziele, Einstellungen, Export, Abmelden |

Auf dem Laptop (ab `md`) wird die Bottom-Navigation zu einer Seitenleiste; die Inhalte bleiben gleich.

| Route | Seite |
|---|---|
| `/login` | Anmeldung (keine Registrierung) |
| `/onboarding` | Einmalige Einrichtung (Pflicht, solange nicht abgeschlossen) |
| `/` | Dashboard |
| `/training` | Generator-Formular und Vorschau |
| `/training/active` | Laufendes Training (Vollbild, ohne Bottom-Navigation) |
| `/training/summary/:sessionId` | Zusammenfassung nach dem Training |
| `/calendar` | Kalender, `/calendar/:date` Tagesdetails |
| `/history/:sessionId` | Details eines absolvierten Trainings |
| `/stats` | Statistiken |
| `/exercises`, `/exercises/:id` | Bibliothek und Detail |
| `/more` | Übersicht weiterer Bereiche |
| `/profile`, `/settings` | Profil & Ziele, Einstellungen |

**Routenschutz:** nicht angemeldet → `/login`; angemeldet, aber Onboarding offen → `/onboarding`.

---

## 6. Datenfluss an zentralen Stellen

### 6.1 Workout generieren
1. Generator-Seite lädt per TanStack Query: Profil, Ziele, Übungen (inkl. eigener), Trainingsverlauf der letzten 28 Tage.
2. Nutzer wählt Dauer, Schwerpunkt, Intensität, Tagesform, optional Muskelgruppen, Stationen und heute fehlende Geräte.
3. `generateWorkout(input)` aus `domain/generator` läuft **lokal im Browser** (Millisekunden, keine Netzwerkabfrage).
4. Vorschau mit Erklärung; „Neu erzeugen" = gleicher Input, neuer Seed; einzelne Übungen austauschen.

### 6.2 Training durchführen und speichern (zuverlässig auch bei schlechtem Netz im Studio)
1. Beim Start erzeugt die App eine `session_id` (UUID im Browser) und legt einen **lokalen Entwurf** in `localStorage` an.
2. Jede Eingabe (Satz abgehakt, Gewicht geändert) aktualisiert sofort den lokalen Entwurf. Ein Neuladen der Seite oder ein Absturz verliert nichts.
3. Beim Abschluss ruft die App **eine** RPC-Funktion `save_workout_session` mit dem kompletten Ergebnis auf. Sie speichert Session, Übungen, Sätze und Bestleistungen in einer Transaktion.
4. **Idempotenz:** Alle IDs stammen vom Client. Ein wiederholter Aufruf (Doppelklick, Wiederholung nach Netzfehler) überschreibt denselben Datensatz statt einen neuen anzulegen.
5. Erst nach erfolgreicher Antwort wird der lokale Entwurf gelöscht. Schlägt das Speichern fehl, bleibt er erhalten und die App bietet „Erneut speichern" an.

Damit gibt es keine allgemeine Offline-Synchronisierung (nicht gefordert), aber ein laufendes Training geht nie verloren. Konflikte zwischen Geräten entstehen nicht, weil ein Training nur auf einem Gerät läuft.

### 6.3 Synchronisierung zwischen Geräten
Alle Daten liegen in Supabase. TanStack Query lädt Daten neu, wenn die App wieder in den Vordergrund kommt oder nach Speichervorgängen. Echtzeit-Abos (Supabase Realtime) sind für einen Nutzer nicht nötig.

### 6.4 Übungsbibliothek synchronisieren
Siehe [`DATABASE.md` §4](DATABASE.md#4-synchronisierung-der-übungsbibliothek). Kurz: Code ist die Quelle für Bibliotheksübungen. Ein versionierter Abgleich überträgt Änderungen in die Datenbank. Eigene Übungen und Trainingshistorie werden nie gelöscht oder verändert.

---

## 7. Sicherheit

- Im Frontend nur `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` (publishable bzw. alter anon Key; öffentlich und unkritisch, weil RLS den Zugriff regelt). `src/lib/env.ts` verweigert den Start, wenn versehentlich ein geheimer Schlüssel eingetragen wird. Der `service_role`-Key wird nirgends verwendet.
- `.env.local` ist git-ignoriert; `.env.example` enthält Platzhalter. Auf Cloudflare Pages werden die Werte als Umgebungsvariablen hinterlegt.
- Supabase Auth: Option „Allow new users to sign up" **aus**. Das Konto wird einmalig im Supabase-Dashboard angelegt.
- Jede Tabelle: RLS aktiv, Policies `to authenticated` mit `user_id = auth.uid()`. Jede Tabelle hat eine eigene `user_id`-Spalte, damit die Policies einfach und schnell bleiben.
- RPC-Funktionen laufen als `security invoker`, d. h. auch dort gilt RLS.
- Eingaben werden im Frontend mit Zod und in der Datenbank mit `check`-Constraints validiert.

---

## 8. Design-System (Kurzfassung)

- **Farben:** Hintergrund nahezu schwarz (`#0A0A0B`), Flächen anthrazit (`#141416` / `#1C1C1F`), Text hell (`#F4F4F5`) / gedämpft (`#A1A1AA`). **Akzent Lime** (`#C6F432`) für Hauptaktionen und Fortschritt; Orange (`#FF7A1A`) sparsam für HYROX-Kennzeichnung und Warnungen. Werte als Tokens in Tailwind definiert und an einer Stelle änderbar.
- **Typografie:** Inter für Text; eine kräftige, schmale Schrift (z. B. Barlow Condensed) für große Zahlen (Timer, Gewichte, Statistiken). Schriften werden lokal mit der App ausgeliefert, nicht von Google geladen.
- **Touch:** Bedienelemente mindestens 48 × 48 px; Hauptaktionen als breite Buttons im unteren Daumenbereich; numerische Eingaben mit `inputmode="decimal"` und Plus/Minus-Steppern.
- **Zustände:** Jede Datenansicht hat Lade-, Leer- und Fehlerzustand.
- **Bewegung:** kurze Übergänge (150–250 ms), `prefers-reduced-motion` wird respektiert.
- **Trainingsmodus:** sehr große Zahlen, hoher Kontrast, Bildschirm bleibt an (Wake Lock API, sofern der Browser sie unterstützt).

---

## 9. Bekannte Rahmenbedingungen

- **Supabase Free Tier pausiert Projekte nach 7 Tagen ohne Aktivität.** Bei regelmäßiger Nutzung kein Problem; ein pausiertes Projekt lässt sich im Dashboard mit einem Klick fortsetzen. Daten bleiben erhalten.
- **iOS:** PWA-Installation nur über Safari („Zum Home-Bildschirm"). Timer laufen im Hintergrund nicht zuverlässig weiter. Deshalb basieren Timer auf Zeitstempeln (Startzeit + Dauer) statt auf Zählschleifen und zeigen nach Rückkehr die korrekte Zeit.
- **Entwicklung am Handy testen:** `npm run dev -- --host` im Heimnetz. Für Installation und Wake Lock braucht es HTTPS, daher wird Cloudflare Pages schon früh in Phase 2 eingerichtet.
