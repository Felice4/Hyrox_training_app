# HYROX Performance Coach – Projektdokumentation

> Lebendes Dokument. Wird nach jeder abgeschlossenen Phase aktualisiert.
> Vollständige Anforderungen: [`docs/SPEC.md`](docs/SPEC.md) · Regeln für Claude Code: [`CLAUDE.md`](CLAUDE.md)

**Letzte Aktualisierung:** 16.10.2026

---

## 0. Aktueller Stand

| | |
|---|---|
| **Aktuelle Phase** | Setup – Entwicklungsumgebung (Setup 3 abgeschlossen) |
| **Letzter verifizierter Meilenstein** | Setup 3 – Projektdokumentation angelegt |
| **Nächster Schritt** | Setup 4 (optional): privates GitHub-Repository → danach Phase 1 (Planung) |
| **Blocker** | keine |

---

## 1. Vision und Ziele

Eine private, moderne Fitness-PWA für genau einen Nutzer, die HYROX-Leistung, Kraft, Muskelaufbau und Ausdauer langfristig und systematisch verbessert.

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
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL) |
| Authentifizierung | Supabase Auth (E-Mail + Passwort, Registrierung deaktiviert) |
| Diagramme | Recharts |
| Kalender | FullCalendar oder vergleichbar – Entscheidung in Phase 1 |
| PWA | Entscheidung in Phase 1 |
| Tests | Entscheidung in Phase 1 (vorgesehen: Vitest) |
| Hosting | kostenlos – Entscheidung in Phase 1 |

---

## 4. Architektur

*Wird in Phase 1 erstellt.*

---

## 5. Datenbankstruktur

*Wird in Phase 1 erstellt.*

---

## 6. Roadmap

Die Entwicklungsphasen werden in Phase 1 in kleine, einzeln testbare Schritte unterteilt.

| Phase | Inhalt | Status |
|---|---|---|
| Setup 1 | Werkzeuge: VS Code, Git, Node.js, Claude Code | ✅ erledigt |
| Setup 2 | Git konfiguriert, Repository, `.gitignore`, `.gitattributes` | ✅ erledigt |
| Setup 3 | VS Code-Einstellungen, `CLAUDE.md`, `PROJECT.md`, `docs/SPEC.md` | ✅ erledigt |
| Setup 4 | *(optional)* privates GitHub-Repository | offen |
| Phase 1 | Planung: Architektur, DB-Schema, Ordnerstruktur, Komponenten, Generator-Algorithmus, detaillierte Roadmap | offen |
| Phase 2 | Basisversion: Projektsetup, DB & Auth, Onboarding, Übungsdatenbank, Generator, Workout-Durchführung & Speicherung, Dashboard | offen |
| Phase 3 | Erweiterung: Wochenplanung, Kalender, Fortschrittsanalysen, Historie, Regenerationslogik, erweiterte Übungsverwaltung | offen |
| Phase 4 | Fertigstellung: Responsive-Optimierung, PWA, Tests, Sync-Prüfung, Deployment, Installationsanleitung | offen |

---

## 7. Abgeschlossene Meilensteine

| Datum | Meilenstein | Commit |
|---|---|---|
| 16.10.2026 | Setup 1 – Node v24.20.0, npm 11.19.0, VS Code 1.141.2, Claude Code 2.1.301, Git 2.55.0 installiert | – |
| 16.10.2026 | Setup 2 – Git-Repository mit `.gitignore` und `.gitattributes` initialisiert | `6daabbe` |
| 16.10.2026 | Setup 3 – Projektdokumentation und VS Code-Einstellungen angelegt | siehe `git log` |

---

## 8. Bekannte Bugs und Einschränkungen

*Keine.*

---

## 9. Nächste Aufgaben

1. Setup 4 (optional): privates GitHub-Repository anlegen und verbinden.
2. Phase 1 starten: Architektur, Datenbankkonzept, Projektstruktur, Implementierungsplan.

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
