# Technology Stack

**Analysis Date:** 2026-07-17

## Languages

**Primary:**
- JavaScript (JSX) - All application code, no TypeScript
- JSON - Spell data and configuration
- CSS - Design tokens and styling
- HTML - Single entry point

## Runtime

**Environment:**
- Browser (no Node.js backend)
- Runs on `file://` (local), web server, or GitHub Pages
- No build step required

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 18.3.1 (from unpkg CDN) - UI library via UMD bundle
- ReactDOM 18.3.1 (from unpkg CDN) - DOM rendering via UMD bundle
- Babel standalone 7.29.0 (from unpkg CDN) - In-browser JSX transpilation (production.min.js)

**No Build Step:**
- App loads JSX files directly in browser via Babel standalone
- `.jsx` modules transpiled at runtime in the browser
- All scripts use SRI (Subresource Integrity) for CDN safety
- Works offline via Service Worker

**Testing/Development:**
- openspec ^0.0.0 - Test orchestration framework (in node_modules only, not used in production)
- openspec-buddy ^0.19.0 - Testing utilities
- openspec-extensions ^1.4.5 - Testing extensions
- openspec-playwright ^0.3.51 - Playwright integration for tests

## Key Dependencies

**Production (Bundled via CDN):**
- React 18.3.1 - UI rendering (pinned version with SRI)
- ReactDOM 18.3.1 - DOM integration (pinned version with SRI)
- Babel standalone 7.29.0 - JSX transpilation (pinned version with SRI)

**Data:**
- 4 JSON files with D&D 5e spell data:
  - `spells-5E-2024-PTBR.json` (~578 KB)
  - `spells-5E-2014-PTBR.json` (~747 KB)
  - `spells-5E-2024-EN.json` (~579 KB)
  - `spells-5E-2014-EN.json` (~734 KB)
- Single-purpose helpers: No external libraries for data manipulation

**Infrastructure:**
- Service Worker (`sw.js`) - Offline caching, progressive web app
- Manifest file (`manifest.json`) - PWA installability
- localStorage API - Client-side persistence (no database)

## Configuration

**Environment:**
- No environment variables required for production
- URLs for spell data are relative paths (work offline and on any origin)
- CDN URLs pinned with exact versions and SRI hashes

**Build:**
- No build configuration files (no webpack, Vite, esbuild, etc.)
- CSS preprocessor: None (plain CSS with CSS custom properties)
- No linting config (no eslint, prettier, biome, etc.)

**Runtime Environment:**
- Runs at any origin (no CORS restrictions needed)
- Service Worker requires HTTPS (or file://) to register
- localStorage available (no quota enforcement in code)

## Platform Requirements

**Development:**
- Modern browser with ES2015+ support
- ES modules understanding (used in .jsx imports)
- Service Workers support for offline features
- localStorage support for data persistence
- No Node.js required for development (pure browser-based)

**Production:**
- Hosting: Any static web server (GitHub Pages, Vercel, Netlify, S3 + CloudFront, etc.)
- No server-side code required
- HTTPS recommended (for Service Worker registration)
- No database required

## File Organization

**Entry Point:**
- `index.html` - Main HTML file with React root div, boot loader, and script includes

**Module Load Order (Critical):**
1. `grimorio-helpers.jsx` - Shared utility functions
2. `i18n.jsx` - i18n string catalog (PT-BR / EN)
3. `spells-data-loader.jsx` - Spell JSON loading and caching
4. `v11-character-editor.jsx` - Character management and persistence
5. `v10-hifi.jsx` - Main UI (desktop + mobile)

**Styling:**
- `hifi-tokens.css` - Design tokens (Catppuccin, Nord, Monokai, Solarized, Parchment themes)
- `index.html` embedded styles - Boot animation CSS

**Fonts:**
- Self-hosted WOFF2 files in `fonts/` (Texturina, JetBrains Mono)
- Self-hosted WOFF2 files in `marauder/webfonts/` (Marauder Text, Marauder Display)
- No external font services (was Google Fonts, now removed for offline support)

**Data:**
- `spells-5E-2024-PTBR.json` - Portuguese spell data (2024 edition)
- `spells-5E-2014-PTBR.json` - Portuguese spell data (2014 edition)
- `spells-5E-2024-EN.json` - English spell data (2024 edition)
- `spells-5E-2014-EN.json` - English spell data (2014 edition)

---

*Stack analysis: 2026-07-17*
