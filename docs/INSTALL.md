# Betriebsanleitung – HYROX Performance Coach

Alles, was du brauchst, um die App einzurichten, weiterzuentwickeln und deine Daten zu sichern. Befehle sind für **PowerShell unter Windows** geschrieben.

Stand: Version 1 (Phase 4, 03.11.2026)

---

## 1. Überblick

| Teil | Wo | Aufgabe |
|---|---|---|
| App (React, TypeScript, Vite) | GitHub-Repository, Ordner `src/` | Oberfläche und Trainingslogik |
| Cloudflare Pages | Cloudflare-Konto | Baut die App bei jedem Push auf `main` und stellt sie unter HTTPS bereit |
| Supabase | Supabase-Konto | Datenbank (PostgreSQL) und Anmeldung |
| Übungsbibliothek | `src/data/exercises/` | 265 Übungen im Code, werden automatisch in die Datenbank übertragen |
| Skill-Ziele und Meilensteine | `src/data/skills/` | Stufen und Kriterien im Code (Konzept: `docs/SKILLS.md`) |

Weitere Dokumente: Anforderungen `docs/SPEC.md`, Architektur `docs/ARCHITECTURE.md`, Datenbank `docs/DATABASE.md`, Generator `docs/GENERATOR.md`, manuelle Prüfliste `docs/CHECKLIST.md`, Stand und Entscheidungen `PROJECT.md`.

---

## 2. Voraussetzungen

- **Node.js 24** (die Version steht in `.node-version`; Cloudflare nutzt dieselbe), dazu npm
- **Git** und ein GitHub-Konto mit dem Repository
- **VS Code** (empfohlen)
- Ein **Supabase**- und ein **Cloudflare**-Konto (beide im kostenlosen Tarif ausreichend)

Prüfen:

```powershell
node --version   # v24.x
npm --version
git --version
```

---

## 3. Auf einem neuen Rechner einrichten

```powershell
git clone https://github.com/<dein-konto>/<repository>.git hyrox-coach
cd hyrox-coach
npm install
Copy-Item .env.example .env.local
code .env.local
```

In `.env.local` die beiden Werte aus Supabase eintragen (Dashboard → **Project Settings → API Keys** bzw. **Data API**):

```
VITE_SUPABASE_URL=https://<projekt-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Wichtig:
- Die URL **ohne** Pfad (nicht `…/rest/v1/`), sonst meldet die App einen Konfigurationsfehler.
- Nur den **publishable** (bzw. alten „anon") Key. Den **secret**/**service_role**-Key nie eintragen – die App verweigert dann den Start.
- `.env.local` ist git-ignoriert und wird nie committet.

Starten:

```powershell
npm run dev        # http://localhost:5173
npm run dev:lan    # zusätzlich im Heimnetz, z. B. für einen Test am Handy
```

---

## 4. Supabase einrichten (nur bei einem neuen Projekt)

Das bestehende Projekt ist fertig eingerichtet. Diese Schritte brauchst du nur, wenn du ein neues Supabase-Projekt anlegst (z. B. nach einem Verlust).

1. **Projekt anlegen** im Supabase-Dashboard (Region Europa, z. B. Frankfurt). Das Datenbank-Passwort sicher notieren.
2. **Registrierung abschalten:** Authentication → Sign In / Providers → „Allow new users to sign up" **aus**. Anonyme Anmeldung ebenfalls aus.
3. **Konto anlegen:** Authentication → Users → **Add user** → E-Mail und Passwort, „Auto Confirm User" aktivieren. Das ist das einzige Konto der App.
4. **Adresse der App eintragen:** Authentication → URL Configuration → **Site URL** = deine Cloudflare-Adresse (z. B. `https://<name>.pages.dev`).
5. **Datenbank aufbauen** (alle Migrationen aus `supabase/migrations/` einspielen):

   ```powershell
   npx supabase login
   npx supabase link --project-ref <projekt-ref>
   npx supabase db push --linked --dry-run   # zeigt, was eingespielt würde
   npm run db:push
   npm run db:types                           # TypeScript-Typen neu erzeugen
   ```

6. `.env.local` (Abschnitt 3) und die Umgebungsvariablen in Cloudflare (Abschnitt 5) auf das neue Projekt umstellen.
7. Anmelden – die App überträgt die Übungsbibliothek beim ersten Login automatisch und startet das Onboarding.

> **VPN aus!** Mit aktivem VPN hängt die Supabase-CLI bei „Initialising login role…". Die App selbst ist davon nicht betroffen.

---

## 5. Deployment (Cloudflare Pages)

Die App wird bei **jedem Push auf `main`** automatisch neu gebaut und veröffentlicht.

Einstellungen des Cloudflare-Projekts (Workers & Pages → dein Projekt → Settings):

| Einstellung | Wert |
|---|---|
| Build-Befehl | `npm run build` |
| Ausgabeordner | `dist` |
| Node-Version | aus `.node-version` (24) |
| Umgebungsvariablen | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (gleiche Werte wie in `.env.local`) |

HTTP-Header (Caching, Sicherheit) stehen in `public/_headers`.

**Nach einem Deployment:** Öffnest du die App am Handy, erscheint „Neue Version verfügbar" → **Aktualisieren**. Ein laufendes Training bleibt dabei erhalten. Erscheint der Hinweis nicht, die App einmal ganz schließen und neu öffnen.

**Installation am Handy:** iPhone: in **Safari** öffnen → Teilen → „Zum Home-Bildschirm". Android: in Chrome → Menü → „App installieren".

---

## 6. Änderungen prüfen und veröffentlichen

Vor jedem Commit:

```powershell
npm run typecheck     # TypeScript
npm run lint          # Codeprüfung
npm run format:check  # Formatierung (npm run format behebt sie)
npm run test          # automatische Tests
npm run build         # Produktions-Build
```

Veröffentlichen:

```powershell
git add -A
git commit -m "feat: kurze Beschreibung auf Deutsch"
git push origin main
```

Commit-Nachrichten folgen den Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`). Vor dem Push prüfen, dass keine Geheimnisse dabei sind (`git diff origin/main..HEAD`). Bei größeren Änderungen danach `docs/CHECKLIST.md` durchgehen.

---

## 7. Übungsbibliothek erweitern

Die Bibliothek steht im Code (`src/data/exercises/`, eine Datei je Bereich: `hyrox.ts`, `strength-lower.ts`, `strength-push.ts`, `strength-pull.ts`, `core.ts`, `power.ts`, `endurance.ts`, `warmup.ts`, `mobility.ts`, `cooldown.ts`, `skills.ts`). Übungen der Kategorie `skill` plant der Generator nur für Skill-Ziele ein, nie im normalen Training.

**Übung hinzufügen:**

1. In der passenden Datei ein Objekt ergänzen, z. B.:

   ```ts
   {
     slug: 'plank',                       // eindeutig, klein, mit Bindestrichen – nie mehr ändern
     name: 'Unterarmstütz (Plank)',
     description: 'Gehaltener Unterarmstütz – Grundübung für Rumpfspannung.',
     category: 'strength',
     trainingTypes: ['stability'],
     movementPattern: 'core',
     primaryMuscles: ['abs'],
     secondaryMuscles: ['obliques', 'front_delts', 'glutes'],
     difficulty: 1,                       // 1 leicht · 2 mittel · 3 schwer
     measurement: 'time',                 // bestimmt, was im Training erfasst wird
     loadParams: LOAD.coreHold,           // fertige Bereiche aus presets.ts oder eigene
     instructions: ['…', '…'],            // mind. 2 Hinweise
     alternatives: ['dead-bug'],          // Slugs vorhandener Übungen
   },
   ```

   Erlaubte Werte (Muskeln, Geräte, Kategorien …) stehen in `vocabulary.ts`, Pflichtfelder in `schema.ts`. Geräte (`equipment`) weglassen = ohne Geräte.

2. In `src/data/exercises/index.ts` **`LIBRARY_VERSION` um 1 erhöhen**. Nur dann überträgt die App die Änderung beim nächsten Login in die Datenbank.
3. `npm run test` – die Tests prüfen alle Übungen (Felder, doppelte Slugs, Verweise auf Alternativen, alle HYROX-Stationen vorhanden).
4. Committen und pushen.

**Ändern:** Felder anpassen, Version erhöhen. Den `slug` **nie** ändern – er verknüpft die Übung mit gespeicherten Trainings.
**Entfernen:** Objekt löschen, Version erhöhen. In der Datenbank wird die Übung nur archiviert; alte Trainings bleiben vollständig.

Eigene Übungen, Präferenzen und Ausblenden gehen ohne Code direkt in der App (Mehr → Übungsbibliothek). Der Abgleich der Bibliothek fasst eigene Übungen und Präferenzen nie an.

---

## 8. Datenbank ändern

Änderungen an Tabellen oder Funktionen **ausschließlich** über neue Migrationen:

```powershell
npx supabase migration new kurzer_name     # legt supabase/migrations/<Zeitstempel>_kurzer_name.sql an
# SQL in die neue Datei schreiben
npx supabase db push --linked --dry-run
npm run db:push
npm run db:types
```

Regeln: bereits eingespielte Migrationen nie verändern; jede neue Tabelle mit Nutzerdaten bekommt RLS mit Policies auf `(select auth.uid()) = user_id`; Funktionen als `security invoker`; Rechte für `anon` entziehen. Vorlage: die vorhandenen Migrationen und `docs/DATABASE.md`. Danach Abschnitt 5 von `docs/CHECKLIST.md` prüfen.

---

## 9. Daten sichern

**Regelmäßig exportieren (empfohlen: monatlich und vor größeren Änderungen):** In der App → Mehr → **Datenexport** → „Daten zusammenstellen" → **JSON herunterladen**. Die Datei enthält alles: Profil, Ziele, alle Trainings mit Sätzen, Bestleistungen, Körperwerte, Check-ins, Wochenpläne, eigene Übungen und Präferenzen. Die CSV-Dateien sind für eigene Auswertungen in Excel gedacht.

Die Dateien enthalten persönliche Gesundheitsdaten – sicher aufbewahren (z. B. verschlüsselter Cloud-Ordner) und nicht ins Repository legen.

**Wiederherstellen:** Einen Import gibt es in Version 1 noch nicht. Die JSON-Sicherung ist so aufgebaut (`format`, `version`, eine Liste je Tabelle), dass sich ein Import später ergänzen lässt.

**Supabase pausiert im kostenlosen Tarif** Projekte nach etwa 7 Tagen ohne Nutzung. Die Daten bleiben erhalten; im Supabase-Dashboard das Projekt mit **Restore/Resume** wieder starten. Die App zeigt bis dahin Ladefehler.

---

## 10. Fehlerbehebung

| Problem | Lösung |
|---|---|
| Supabase-CLI hängt bei „Initialising login role…" | VPN trennen und erneut ausführen |
| App zeigt „Konfiguration fehlt" | `.env.local` bzw. Cloudflare-Umgebungsvariablen prüfen (URL ohne Pfad, publishable Key) |
| Alle Anfragen schlagen fehl, Login klappt nicht | Supabase-Projekt pausiert? → im Dashboard fortsetzen |
| Neue Version erscheint nicht am Handy | App vollständig schließen und neu öffnen; ggf. warten, bis Cloudflare den Build fertig hat |
| Neue Übung erscheint nicht | `LIBRARY_VERSION` erhöht? Nach dem Push einmal neu anmelden bzw. App neu laden |
| `npm run build` meldet Typfehler nach Datenbankänderung | `npm run db:types` ausführen |
| Training verloren? | Ein laufendes Training liegt lokal auf dem Gerät, bis es gespeichert ist – auf demselben Gerät „Training fortsetzen" |

---

## 11. Sicherheit – die festen Regeln

- Keine Geheimnisse ins Repository; `.env.local` bleibt lokal.
- Im Frontend nur Supabase-URL und publishable Key, niemals der secret/service_role-Key.
- Öffentliche Registrierung bleibt aus; das einzige Konto wird im Dashboard angelegt.
- Jede Tabelle mit Nutzerdaten hat RLS; Datenbankänderungen nur per Migration.
