# Manuelle Prüfliste – HYROX Performance Coach

Ergänzt die automatischen Tests (`npm run test`). Diese Punkte lassen sich nur am echten Gerät prüfen. Vor einer größeren Änderung oder nach einem Update der Abhängigkeiten einmal durchgehen.

Stand: Schritt 4.4 (03.11.2026)

## 1. Synchronisierung zwischen Geräten

| # | Schritte | Erwartet |
|---|---|---|
| 1.1 | Am Handy ein kurzes Training starten, 1–2 Sätze abhaken, beenden und speichern | Bestätigung „Gespeichert" |
| 1.2 | Am Laptop die App öffnen (oder Seite neu laden) | Training erscheint im Dashboard („Letzte Trainings"), im Kalender und in der Historie |
| 1.3 | Am Laptop in der Historie die Notiz des Trainings ändern | Am Handy nach Wechsel zurück in die App bzw. Neuladen sichtbar |
| 1.4 | Am Laptop die Woche planen, am Handy den Kalender öffnen | Gleicher Wochenplan |
| 1.5 | Am Handy einen Check-in machen, am Laptop die Training-Seite öffnen | Generator zeigt „Aus deinem Check-in" |
| 1.6 | Am Laptop eine eigene Übung anlegen, am Handy die Übungsliste öffnen | Übung mit Badge „Eigene" vorhanden |

Hinweis: Ein laufendes Training liegt nur auf dem Gerät, auf dem es gestartet wurde. Es erscheint erst nach dem Speichern auf anderen Geräten.

## 2. Anmeldung

| # | Schritte | Erwartet |
|---|---|---|
| 2.1 | Mehr → Abmelden | Login-Seite; geschützte Seiten (z. B. `/stats`) leiten zum Login |
| 2.2 | Mit falschem Passwort anmelden | Verständliche Fehlermeldung, kein Zugang |
| 2.3 | Richtig anmelden | Dashboard mit allen bisherigen Daten |
| 2.4 | Während eines laufenden Trainings abmelden und wieder anmelden | Hinweis „Training läuft" bzw. „Laufendes Training fortsetzen" – nichts verloren |

## 3. PWA und Offline

| # | Schritte | Erwartet |
|---|---|---|
| 3.1 | App vom Startbildschirm öffnen | Vollbild ohne Browserleiste |
| 3.2 | Flugmodus an, App schließen und neu öffnen | App startet, Offline-Hinweis oben |
| 3.3 | Im Flugmodus Training starten, Satz abhaken, Flugmodus aus, Training speichern | Speichern klappt, nichts verloren |
| 3.4 | Nach einem Push: App öffnen | „Neue Version verfügbar" → „Aktualisieren" lädt die neue Version |

## 4. Training im Studio (einmal real durchspielen)

| # | Schritte | Erwartet |
|---|---|---|
| 4.1 | Training starten und Handy liegen lassen | Bildschirm bleibt an |
| 4.2 | Satz abhaken, Pause laufen lassen | Vibration am Ende der Pause (Android; iPhone vibriert in Web-Apps nicht) |
| 4.3 | Während einer Pause die App wechseln und nach 1 Minute zurückkehren | Pausenzeit stimmt (läuft über Zeitstempel weiter) |
| 4.4 | Seite während des Trainings neu laden | Training läuft an derselben Stelle weiter |
| 4.5 | Gleiches Training zweimal speichern (z. B. bei schlechtem Netz erneut tippen) | Nur ein Eintrag in der Historie |

## 5. Sicherheit (bei Änderungen an der Datenbank)

Prüfung per SQL (`npx supabase db query --linked`, ohne VPN):

- Alle Tabellen in `public` haben RLS aktiv und Policies (zuletzt 03.11.2026: 11 Tabellen, je 3–4 Policies).
- Rolle `anon` hat keine Tabellenrechte und darf keine Speicherfunktion ausführen.
- Registrierung ist in Supabase deaktiviert (Authentication → Sign In / Providers).
