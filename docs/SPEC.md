# Projekt: HYROX Performance Coach – Persönliche Fitness-App

## 1. Deine Rolle und Aufgabe

Du bist ein erfahrener Senior Full-Stack Developer, UI/UX Designer und Spezialist für die Entwicklung von Fitness- und Trainingsanwendungen.

Ich möchte mit deiner Hilfe eine vollständige, moderne und funktionsfähige Fitness-App entwickeln, die ausschließlich für meinen persönlichen Gebrauch bestimmt ist.

Die App soll mich dabei unterstützen, meine **HYROX-Leistung, Muskelkraft, Muskelaufbau und Ausdauer** langfristig und systematisch zu verbessern.

Das Hauptziel ist ein intelligentes Trainingssystem, das abwechslungsreiche und individuell angepasste Workouts generiert, meine Trainingsleistungen dokumentiert und daraus sinnvolle Empfehlungen für zukünftige Trainingseinheiten ableitet.

Bitte entwickle eine tatsächlich funktionsfähige Anwendung und nicht nur ein Designkonzept oder einen Prototyp.

## 2. Technische Anforderungen

Ich möchte eine Progressive Web App (PWA), die sowohl auf Smartphones als auch auf Laptops funktioniert.

Verwende bevorzugt folgenden Technologie-Stack:

- **Frontend:** React mit TypeScript und Vite
- **Styling:** Tailwind CSS und moderne UI-Komponenten
- **Backend und Datenbank:** Supabase mit PostgreSQL
- **Authentifizierung:** Supabase Auth
- **Datenvisualisierung:** Recharts
- **Kalender:** FullCalendar oder eine vergleichbare React-Lösung
- **PWA:** Installation auf Smartphones über den Browser

Wichtige technische Anforderungen:

1. Responsive Design mit Mobile-First-Ansatz.
2. Automatische Synchronisierung zwischen Smartphone und Laptop.
3. Sichere Speicherung sämtlicher Nutzer- und Trainingsdaten.
4. Die App wird nur von einer Person verwendet. Es wird kein öffentliches Registrierungssystem benötigt.
5. Login mit E-Mail-Adresse und Passwort.
6. Sichere Zugriffsregeln über Row Level Security (RLS).
7. Keine unnötigen laufenden Kosten und möglichst kostenlose Hosting-Optionen.
8. Sauber strukturierter, wartbarer und erweiterbarer Code.
9. Metrische Einheiten (kg, km, Meter).
10. Sprache der Benutzeroberfläche: Deutsch.
11. Keine kostenpflichtige KI-API als zwingende Voraussetzung.

Wenn du aus technischen Gründen bessere Lösungen empfiehlst, begründe diese kurz. Bevorzuge eine einfache und zuverlässige Architektur.

## 3. Design und Benutzeroberfläche

Orientiere dich an modernen Fitness-Apps mit hochwertigem, sportlichem Design.

**Designrichtung: Dark, Modern, Athletic, Minimalistic.**

Designvorgaben:

- Dunkler Hintergrund in Anthrazit oder Schwarz.
- Dezente Akzentfarben, beispielsweise Orange oder Lime.
- Klare, moderne Typografie.
- Große, gut bedienbare Schaltflächen für die Smartphone-Nutzung.
- Hochwertige Karten, Fortschrittsanzeigen und Diagramme.
- Übersichtliche Navigation mit möglichst wenigen Schritten.
- Dezente Animationen und visuelles Feedback.
- Keine überladenen Menüs oder unnötigen Funktionen.

Die App soll optisch wie ein professionelles Fitness-Produkt wirken und nicht wie ein einfaches Studentenprojekt.

Erstelle folgende Hauptbereiche:

1. Dashboard
2. Trainingsgenerator
3. Trainingskalender
4. Übungsbibliothek
5. Fortschritt und Statistiken
6. Profil und Einstellungen

Auf dem Smartphone soll eine praktische Bottom-Navigation verwendet werden.

## 4. Erstmalige Einrichtung – Persönliches Onboarding

Beim ersten erfolgreichen Login soll ein einmaliger Onboarding-Prozess gestartet werden.

Erfasse folgende Informationen:

### Persönliche Angaben

- Alter beziehungsweise Geburtsdatum
- Körpergröße
- Körpergewicht
- Geschlecht (optional)
- Weitere optionale Körperdaten wie Körperfettanteil

### Trainingshintergrund

- Trainingsniveau: Anfänger, Fortgeschritten oder Erfahren
- Bisherige Erfahrung mit HYROX
- Erfahrung mit Krafttraining
- Erfahrung mit Ausdauertraining
- Aktuelle sportliche Leistungsfähigkeit
- Bekannte Bestleistungen, falls vorhanden

### Trainingsziele

Meine grundsätzlichen Ziele sind gleichmäßig gewichtet:

- Muskelaufbau
- Kraftsteigerung
- Verbesserung der Ausdauer
- Verbesserung meiner HYROX-Leistung

Die App soll zusätzlich erlauben, die Gewichtung dieser Ziele später individuell anzupassen.

### Trainingsbedingungen

- Verfügbare Trainingstage pro Woche
- Bevorzugte Trainingstage
- Standard-Trainingsdauer: 45–60 Minuten
- Trainingsort: Fitnessstudio mit vollständigem HYROX-Equipment
- Bevorzugte und unbeliebte Übungen
- Einschränkungen, Verletzungen oder Bewegungsprobleme (optional)
- Verfügbare Geräte und Ausrüstung

Alle Angaben müssen später im Profil bearbeitet werden können.

Erfasse nur tatsächlich benötigte Informationen. Körperdaten dürfen nicht als alleinige Grundlage für konkrete Trainingsgewichte verwendet werden.

## 5. Intelligenter Trainingsgenerator – Kernfunktion

Dies ist die wichtigste Funktion der gesamten App.

Ich möchte unmittelbar vor dem Training innerhalb weniger Sekunden ein vollständiges, individuell angepasstes Workout erstellen können.

Zusätzlich soll die App automatisch strukturierte Wochenpläne erstellen können.

### A. Spontanes Workout generieren

Vor Trainingsbeginn möchte ich folgende Angaben festlegen können:

- Trainingsdauer (Standard: 45–60 Minuten)
- Schwerpunkt: HYROX, Kraft, Ausdauer, Ganzkörper oder Mixed
- Gewünschte Intensität
- Aktuelle Tagesform
- Optional: Muskelgruppen oder bestimmte HYROX-Stationen
- Optional: Geräte, die heute nicht verfügbar sind

Anschließend soll die App einen vollständigen Trainingsplan generieren.

Ein Workout soll abhängig vom Trainingstyp enthalten:

1. Warm-up
2. Haupttraining
3. Kraft-, Ausdauer- oder HYROX-spezifische Übungen
4. Sinnvolle Satz-, Wiederholungs-, Distanz- und Pausenvorgaben
5. Cool-down

Die Gesamtzeit muss realistisch zur ausgewählten Dauer passen.

### B. Automatischer Wochenplan

Erstelle eine Funktion, die basierend auf meinem Profil und meinem Trainingsverlauf einen sinnvollen Wochenplan generiert.

Berücksichtige dabei:

- Meine verfügbare Anzahl an Trainingstagen
- Meine vier Hauptziele
- Sinnvolle Belastungsverteilung
- Regenerationszeiten
- Kraft- und Ausdauertraining
- HYROX-spezifische Belastungen
- Meine tatsächlich abgeschlossenen Trainingseinheiten

Der Wochenplan soll bearbeitbar sein.

Ich möchte Trainingstage verschieben, einzelne Workouts ersetzen und zusätzliche spontane Einheiten ergänzen können.

### C. Intelligente Trainingslogik

Die generierten Workouts dürfen nicht einfach zufällige Übungskombinationen sein.

Implementiere eine nachvollziehbare regelbasierte Trainingslogik, die folgende Faktoren berücksichtigt:

- Zuletzt trainierte Muskelgruppen
- Trainingsvolumen der vergangenen Tage
- Bisherige Leistungen
- Regeneration und Belastung
- Subjektive Anstrengung (RPE)
- Persönliche Trainingsziele
- Verfügbare Trainingszeit
- Verfügbare Geräte
- Variation gegenüber vergangenen Workouts

Die App soll abwechslungsreich trainieren lassen, ohne wichtige HYROX-Bewegungsmuster oder die langfristige Trainingsprogression zu vernachlässigen.

Zu hohe Belastungssteigerungen sollen vermieden werden.

Berücksichtige Progressive Overload mit konservativen, leistungsbasierten Steigerungen sowie leichtere Trainingseinheiten, wenn es die Erholung erfordert.

Zeige optional eine kurze Erklärung an, warum das jeweilige Training vorgeschlagen wurde.

Baue den Generator zunächst ohne kostenpflichtige KI-Abhängigkeit. Strukturiere ihn aber so, dass später optional ein KI-Modell integriert werden kann.

## 6. Umfangreiche Übungsdatenbank

Ich möchte eine möglichst umfangreiche Übungsbibliothek, um langfristig abwechslungsreich trainieren zu können.

Erstelle eine hochwertige Ausgangsdatenbank mit möglichst **200 oder mehr realen, sinnvoll unterschiedlichen Übungen**.

Berücksichtige folgende Kategorien:

### HYROX

Sämtliche HYROX-Disziplinen:

- SkiErg
- Sled Push
- Sled Pull
- Burpee Broad Jumps
- Rowing
- Farmers Carry
- Sandbag Lunges
- Wall Balls
- Running

Zusätzlich HYROX-spezifische Kombinationen, Intervallformen, Technikübungen und sinnvolle Vorbereitungsübungen.

### Krafttraining

- Oberkörper
- Unterkörper
- Push
- Pull
- Core
- Ganzkörper
- Explosivkraft
- Funktionelles Krafttraining
- Übungen mit Langhanteln, Kurzhanteln, Kettlebells, Maschinen und Körpergewicht

### Ausdauertraining

- Lauftraining
- Intervalltraining
- Tempoläufe
- Grundlagen-Ausdauertraining
- Ergometer
- Rudern
- SkiErg
- Assault Bike
- Weitere sinnvolle Cardio-Varianten

### Weitere Trainingsformen

- Mobility
- Stabilität
- Koordination
- Warm-up
- Cool-down
- Regeneration

### Datenstruktur

Jede Übung soll mindestens folgende Informationen besitzen:

- Eindeutige ID
- Name
- Beschreibung
- Kategorie
- Primäre Muskelgruppen
- Sekundäre Muskelgruppen
- Benötigtes Equipment
- Schwierigkeitsgrad
- Trainingstyp
- Geeignete Belastungsparameter
- Ausführungshinweise
- Geeignete Alternativübungen

Entwickle ein erweiterbares System.

**Besonders wichtig:** Ich möchte Übungen unkompliziert direkt im Code hinzufügen, bearbeiten oder entfernen können.

Verwende dafür eine zentrale, gut dokumentierte Datenstruktur, beispielsweise TypeScript oder JSON, sowie einen nachvollziehbaren Datenbank-Import beziehungsweise Synchronisierungsmechanismus.

Zusätzlich wäre eine einfache Verwaltungsoberfläche innerhalb der App wünschenswert.

Eigene Übungen und historische Trainingseinträge dürfen durch spätere Aktualisierungen der Übungsbibliothek nicht verloren gehen.

## 7. Trainingsmodus

Nach der Generierung möchte ich das Workout direkt starten können.

Während des Workouts benötige ich:

- Übersicht der aktuellen und nächsten Übung
- Satz- und Wiederholungsanzeige
- Vorgesehene Gewichte
- Eingabe tatsächlich verwendeter Gewichte
- Eingabe tatsächlich absolvierter Wiederholungen
- Distanz- und Zeiterfassung
- Pausentimer
- Intervalltimer
- Rundenzähler
- Markieren abgeschlossener Sätze
- Übungen überspringen
- Übungen spontan austauschen
- Training pausieren und fortsetzen

Zeige bei Bedarf die zuletzt verwendeten Gewichte oder bisherigen Bestleistungen.

Bei einem Übungsaustausch soll die App möglichst eine Alternative mit vergleichbarem Trainingseffekt auswählen.

Nach dem Workout möchte ich:

- Das Training speichern
- Meine Anstrengung bewerten
- Optionale Notizen ergänzen
- Eine Zusammenfassung sehen

Auch teilweise absolvierte Workouts sollen korrekt dokumentiert werden können.

## 8. Trainingskalender

Integriere einen modernen Trainingskalender mit Monats- und Wochenansicht.

Der Kalender soll folgende Informationen darstellen:

- Geplante Trainingseinheiten
- Abgeschlossene Trainingseinheiten
- Ausgefallene oder verschobene Einheiten
- Trainingstypen
- Trainingstage pro Woche und Monat

Bei Auswahl eines Trainingstags möchte ich die vollständigen Workout-Details sehen.

Ermögliche das einfache Verschieben und Bearbeiten zukünftiger Einheiten.

Vergangene Trainingseinheiten dürfen nicht unbeabsichtigt durch eine neue Planung überschrieben werden.

## 9. Trainingsfortschritt und Statistiken

Erstelle einen aussagekräftigen Analytics-Bereich.

Ich möchte mindestens folgende Daten einsehen können:

### Trainingshäufigkeit

- Trainingseinheiten pro Woche
- Trainingseinheiten pro Monat
- Gesamte Trainingszeit
- Trainingshäufigkeit im Zeitverlauf
- Geplante gegenüber abgeschlossenen Einheiten

### Kraftentwicklung

- Entwicklung meiner Trainingsgewichte
- Wiederholungen und Trainingsvolumen
- Persönliche Bestleistungen
- Fortschritt einzelner Übungen

### Ausdauer und HYROX

- Laufzeiten und Distanzen
- Pace-Entwicklung
- Ergometerleistungen
- HYROX-Stationsleistungen
- Persönliche Bestleistungen

Verwende moderne Diagramme und übersichtliche Statistikkarten.

Vergleiche vergleichbare Trainingsergebnisse miteinander, statt Fortschritte aus unterschiedlichen Belastungsbedingungen abzuleiten.

### Persönliche Körperentwicklung

Ermögliche die optionale Dokumentation von Körpergewicht und weiteren Körpermesswerten über die Zeit.

Zeige nur Daten an, die tatsächlich erfasst wurden.

## 10. Dashboard

Die Startseite soll mir unmittelbar zeigen:

- Begrüßung
- Nächstes geplantes Training
- Button „Workout generieren“
- Button „Training starten“
- Anzahl meiner Trainingseinheiten diese Woche
- Aktuelle Trainingsbelastung
- Letzte absolvierte Workouts
- Relevante persönliche Fortschritte
- Übersicht der kommenden Trainingstage

Das Dashboard muss besonders auf Smartphones schnell und übersichtlich bedienbar sein.

## 11. Regeneration und Tagesform

Vor einem Workout soll optional ein kurzer Check-in möglich sein.

Dabei möchte ich angeben können:

- Energielevel
- Muskelkater
- Schlafqualität
- Subjektives Erholungsgefühl

Verwende einfache Skalen.

Bei deutlichen Ermüdungsanzeichen soll die Trainingsintensität sinnvoll reduziert oder eine regenerative Einheit vorgeschlagen werden.

Nutze keine medizinischen Diagnosen oder scheinbar exakte Gesundheitsprognosen.

## 12. Datenbank und Datensicherheit

Entwickle ein konsistentes relationales Datenbankmodell für mindestens:

- Benutzerprofil
- Trainingsziele
- Übungskatalog
- Geplante Workouts
- Abgeschlossene Trainingseinheiten
- Übungen innerhalb einer Trainingseinheit
- Sätze und Leistungswerte
- Körpermesswerte
- Tagesform
- Persönliche Bestleistungen

Berücksichtige Relationen, IDs, Zeitstempel, Validierung und zuverlässige Speicherung.

Die App wird ausschließlich privat genutzt. Andere Personen dürfen keinen Zugriff auf meine Daten erhalten.

Implementiere eine sichere Lösung, bei der mein Benutzerkonto manuell eingerichtet werden kann und öffentliche Registrierung deaktiviert ist.

Verwende sichere Supabase-RLS-Regeln, keine geheimen Schlüssel im Frontend und keine unsichere Umgehung der Authentifizierung.

Ermögliche später einen Export meiner Trainingsdaten als CSV oder JSON.

## 13. PWA und Smartphone-Nutzung

Die Anwendung muss auf aktuellen Smartphone-Browsern komfortabel funktionieren.

Berücksichtige:

- Installation auf dem Startbildschirm
- Responsive Darstellung
- Touch-Bedienung
- Geeignete Eingabefelder für numerische Trainingsdaten
- Schnelle Ladezeiten
- Angemessene Darstellung von Timern
- Synchronisierung zwischen Geräten

Eine vollständige Offline-Synchronisierung ist für die erste Version nicht zwingend erforderlich.

Falls Offline-Funktionen eingebaut werden, müssen Datenkonflikte und Speicherung zuverlässig behandelt werden.

## 14. Erweiterbarkeit

Plane die Anwendung so, dass später unter anderem folgende Funktionen ergänzt werden können:

- Optionale KI-Trainingsanalyse
- Erweiterte HYROX-Wettkampfvorbereitung
- Individuelle Trainingszyklen
- Erweiterte Leistungsprognosen
- Apple Health oder andere Fitness-Integrationen
- Export von Trainingsberichten
- Zusätzliche Trainingsarten

Diese Funktionen sind zunächst nicht notwendig und sollen die erste funktionsfähige Version nicht unnötig kompliziert machen.

## 15. Qualität und Tests

Berücksichtige folgende Anforderungen:

- Saubere Komponentenstruktur
- Verständliche Benennung
- Wiederverwendbare Funktionen
- Fehlerbehandlung
- Loading- und Empty-States
- Formularvalidierung
- Keine fehlerhaften Datenbankzugriffe
- Keine doppelten Trainingseinträge durch wiederholtes Speichern
- Nachvollziehbare Trainingsberechnungen

Erstelle insbesondere Tests für den Trainingsgenerator.

Teste beispielsweise, dass:

1. Die angeforderte Trainingsdauer berücksichtigt wird.
2. Nicht verfügbare Geräte ausgeschlossen werden.
3. Zuletzt stark belastete Muskelgruppen angemessen berücksichtigt werden.
4. Alternativübungen sinnvoll ausgewählt werden.
5. Trainingsdaten korrekt gespeichert und wieder geladen werden.
6. Daten nach einem erneuten Login und auf einem zweiten Gerät verfügbar sind.

## 16. Vorgehensweise bei der Entwicklung

Bitte gehe systematisch vor.

### Phase 1 – Planung

Erstelle zunächst:

- Kurze Zusammenfassung der Anwendung
- Technische Architektur
- Datenbankstruktur
- Projektordnerstruktur
- Übersicht der wichtigsten Komponenten
- Übersicht des Trainingsgenerator-Algorithmus
- Sinnvolle Implementierungsreihenfolge

Vermeide unnötige Komplexität.

### Phase 2 – Funktionsfähige Basisversion

Implementiere zuerst:

1. Projektsetup
2. Datenbank und Authentifizierung
3. Onboarding
4. Übungsdatenbank
5. Trainingsgenerator
6. Workout-Durchführung und Speicherung
7. Dashboard

### Phase 3 – Erweiterung

Ergänze:

1. Wochenplanung
2. Trainingskalender
3. Fortschrittsanalysen
4. Trainingshistorie
5. Regenerationslogik
6. Erweiterte Übungsverwaltung

### Phase 4 – Fertigstellung

- Responsive Design optimieren
- PWA konfigurieren
- Tests durchführen
- Synchronisierung prüfen
- Deployment vorbereiten
- Installationsanleitung erstellen

## 17. Anforderungen an deine Antworten

Ich möchte die Anwendung tatsächlich umsetzen.

Deshalb:

- Schreibe ausführbaren, vollständigen Code.
- Nenne jeweils die zugehörigen Dateipfade.
- Erkläre, wo ich die Dateien erstellen muss.
- Gib notwendige Installationsbefehle an.
- Liefere vollständige SQL-Migrationen und Datenbankregeln.
- Erkläre, welche Umgebungsvariablen benötigt werden.
- Verwende keine Pseudocode-Platzhalter für Kernfunktionen.
- Vermeide unvollständige Beispielimplementierungen, die nur optisch funktionieren.
- Erfinde keine externen APIs oder Integrationen.
- Teile größere Implementierungen in überschaubare, nachvollziehbare Schritte auf.
- Gib nach jedem Implementierungsschritt an, wie ich ihn testen kann.
- Stelle sicher, dass das Projekt lokal ausführbar und später deploybar ist.

Ich habe grundlegende Programmiererfahrung und möchte den Code selbst verstehen und später erweitern können.

Erkläre wichtige Architekturentscheidungen verständlich, ohne unnötig lange theoretische Ausführungen.

## 18. Fertiges Ergebnis

Am Ende möchte ich eine vollständig funktionsfähige persönliche HYROX-App besitzen, mit der ich:

- Mich sicher einloggen kann.
- Meine persönlichen Trainingsdaten verwalten kann.
- Spontan ein individuelles Workout erstellen kann.
- Einen intelligenten Wochenplan generieren kann.
- Aus einer umfangreichen Übungsbibliothek trainieren kann.
- Übungen hinzufügen, ersetzen und entfernen kann.
- Meine Trainingseinheiten direkt am Smartphone durchführen kann.
- Gewichte, Wiederholungen, Zeiten und Distanzen erfassen kann.
- Meine Trainingshistorie im Kalender sehen kann.
- Meine Trainingshäufigkeit und Leistungsentwicklung analysieren kann.
- Meine Daten auf Smartphone und Laptop synchronisiert vorfinde.

Die Anwendung soll langfristig erweiterbar sein, aber von Beginn an einfach und angenehm funktionieren.

**Beginne jetzt mit Phase 1: Architektur, Projektstruktur, Datenbankkonzept und Implementierungsplan. Anschließend führe mich strukturiert durch die tatsächliche Umsetzung.**
