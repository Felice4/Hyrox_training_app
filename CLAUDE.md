# CLAUDE.md – Arbeitsanweisungen für Claude Code

Diese Datei wird von Claude Code zu Beginn jeder Sitzung gelesen. Sie enthält dauerhafte Regeln für die Entwicklung dieses Projekts.

## Projekt in einem Satz

**HYROX Performance Coach** – eine private Progressive Web App (nur ein Nutzer) für HYROX-, Kraft-, Muskelaufbau- und Ausdauertraining mit regelbasiertem Trainingsgenerator, Trainingsmodus, Kalender und Statistiken.

- Maßgebliche, vollständige Spezifikation: `docs/SPEC.md`
- Aktueller Stand, Roadmap, Entscheidungen, bekannte Bugs: `PROJECT.md`

Bei Widersprüchen gilt: ausdrückliche Anweisung des Nutzers > `PROJECT.md` (Entscheidungen) > `docs/SPEC.md`.

## Ablauf zu Beginn jeder Sitzung

1. `CLAUDE.md` und `PROJECT.md` lesen; `docs/SPEC.md` lesen, sobald Anforderungen relevant sind.
2. `git status` und `git log --oneline -10` prüfen.
3. Die aktuelle Projektstruktur ansehen, bevor Code geändert wird.
4. Dem Nutzer kurz zusammenfassen: letzter verifizierter Meilenstein, aktuelle Phase, offene Aufgaben, bekannte Bugs, uncommittete Änderungen.
5. Erst nach Bestätigung des Nutzers mit der Arbeit beginnen.

Bereits funktionierende Funktionalität niemals unnötig neu bauen.

## Arbeitsregeln

1. **Eine Phase zur Zeit.** Nur den Umfang der aktuellen Phase bzw. des aktuellen Schritts umsetzen. Keine zukünftigen Features vorwegnehmen.
2. **Erst lesen, dann ändern.** Betroffene Dateien vollständig lesen, bevor sie bearbeitet werden.
3. **Bestehendes erhalten.** Nach Änderungen Typprüfung, Tests und Build ausführen (sobald vorhanden: `npm run typecheck`, `npm run test`, `npm run build`).
4. **Fehler zuerst.** Bekannte Fehler beheben, bevor neue Funktionen begonnen werden.
5. **Abschluss jeder Phase / jedes Schritts:**
   - erklären, was umgesetzt wurde (Dateien, wichtige Entscheidungen),
   - konkrete Testschritte für den Nutzer angeben (was klicken, was erwarten),
   - `PROJECT.md` aktualisieren (Stand, Meilensteine, Bugs, nächste Aufgaben, Entscheidungen),
   - nach erfolgreichem Test durch den Nutzer einen Git-Commit erstellen,
   - auf die Freigabe des Nutzers warten, bevor die nächste Phase beginnt.
6. **Commits** nur mit grünem Build und erfolgreichen Tests. Format: Conventional Commits, Beschreibung auf Deutsch, z. B. `feat: Onboarding-Formular für Profildaten`, `fix: …`, `docs: …`, `test: …`, `refactor: …`, `chore: …`.
7. **Nur nach Rückfrage:** neue größere Abhängigkeiten, Löschen von Dateien, Änderungen am Datenbankschema außerhalb einer Migration, `git reset --hard`, `git push --force`, Umschreiben der Git-Historie.
8. Keine Pseudocode-Platzhalter in Kernfunktionen, keine Oberflächen, die nur optisch funktionieren, keine erfundenen APIs oder Bibliotheksfunktionen.

## Sicherheit (verbindlich)

- Niemals Geheimnisse committen. Werte stehen in `.env.local` (git-ignoriert); `.env.example` enthält nur Platzhalter.
- Im Frontend ausschließlich Supabase-URL und der öffentliche anon/publishable Key. Der `service_role`-Key gehört niemals ins Frontend oder ins Repository.
- Jede Tabelle mit Nutzerdaten hat Row Level Security aktiviert; Policies prüfen `auth.uid()`.
- Öffentliche Registrierung ist deaktiviert; das einzige Konto wird manuell angelegt. Keine Umgehung der Authentifizierung.
- Datenbankänderungen ausschließlich über versionierte SQL-Migrationen in `supabase/migrations/`.

## Technische Leitplanken (aus der Spezifikation)

- React + TypeScript (strict) + Vite, Tailwind CSS, Supabase (PostgreSQL, Auth), Recharts, PWA.
- Mobile-first, dunkles sportliches Design, Bottom-Navigation auf dem Smartphone.
- Benutzeroberfläche auf Deutsch; Bezeichner im Code auf Englisch; erklärende Kommentare dürfen Deutsch sein.
- Metrische Einheiten (kg, km, m).
- Keine kostenpflichtige KI-API als Voraussetzung; der Trainingsgenerator ist regelbasiert, aber so gekapselt, dass später ein KI-Modell ergänzt werden kann.
- Trainingslogik als reine, deterministisch testbare Funktionen ohne UI- oder Datenbankabhängigkeit; Tests mit Vitest.
- Übungsbibliothek: zentrale, dokumentierte Datenquelle im Code; Synchronisierung in die Datenbank darf eigene Übungen und historische Trainingsdaten nie löschen oder verändern.
- Vergangene Trainingseinheiten werden durch Neuplanung nie überschrieben; Speichern ist idempotent (keine Doppeleinträge).

Detaillierte Architektur- und Konventionsentscheidungen werden in Phase 1 festgelegt und in `PROJECT.md` (Abschnitt „Technische Entscheidungen") dokumentiert.

## Kommunikation mit dem Nutzer

- Sprache: Deutsch.
- Der Nutzer hat Grundkenntnisse im Programmieren: wichtige Befehle und Entscheidungen kurz und verständlich erklären, ohne lange Theorie.
- Entwicklungsumgebung: Windows 11, PowerShell, VS Code. Terminal-Befehle für PowerShell angeben.
- Bei Unklarheiten nachfragen statt raten.
