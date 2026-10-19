# HYROX Performance Coach

Private Progressive Web App für HYROX-, Kraft-, Muskelaufbau- und Ausdauertraining.

- Anforderungen: [`docs/SPEC.md`](docs/SPEC.md)
- Stand und Roadmap: [`PROJECT.md`](PROJECT.md)
- Architektur: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Lokal starten (PowerShell)

```powershell
npm install        # einmalig bzw. nach Änderungen an package.json
npm run dev        # App unter http://localhost:5173
npm run dev:lan    # zusätzlich im Heimnetz erreichbar (Handy-Test)
```

## Deployment

Cloudflare Pages baut die App automatisch bei jedem Push auf `main`:
Build-Befehl `npm run build`, Ausgabeordner `dist`, Node-Version aus `.node-version`.
HTTP-Header stehen in `public/_headers`.

## App-Icons

Vorlage: `public/app-icon.svg`. Die PNG-Icons in `public/` wurden daraus einmalig erzeugt
(64, 192, 512, maskable 512, Apple 180). Bei einer Änderung des Icons müssen sie neu erzeugt werden.

## Prüfen

```powershell
npm run typecheck  # TypeScript-Typprüfung
npm run lint       # Codeprüfung (oxlint)
npm run test       # Tests (Vitest)
npm run build      # Produktions-Build nach dist/
npm run preview    # Produktions-Build lokal ansehen (inkl. PWA/Service Worker)
npm run format     # Code einheitlich formatieren (Prettier)
```
