# External Integrations

**Analysis Date:** 2026-07-17

## Overview

**Grimório do Jogador** is a self-contained client-side application. It does not require external APIs, databases, authentication providers, or third-party services. All data is sourced locally and persisted on-device.

## CDN & Libraries

**JavaScript Runtime:**
- React 18.3.1 from `unpkg.com`
  - URL: `https://unpkg.com/react@18.3.1/umd/react.production.min.js`
  - SRI: `sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z`
  - Cached by Service Worker for offline use

- ReactDOM 18.3.1 from `unpkg.com`
  - URL: `https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js`
  - SRI: `sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1`
  - Cached by Service Worker for offline use

- Babel standalone 7.29.0 from `unpkg.com`
  - URL: `https://unpkg.com/@babel/standalone@7.29.0/babel.min.js`
  - SRI: `sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y`
  - Cached by Service Worker for offline use

## Data Storage

**Local Only (No External Storage):**
- All spell data stored as local JSON files (4 datasets)
- Character data persisted to `localStorage` (device-only)
- No cloud backup or sync

**Spell Data Files:**
- `spells-5E-2024-PTBR.json` - Loaded via fetch (cached by Service Worker)
- `spells-5E-2014-PTBR.json` - Loaded via fetch (cached by Service Worker)
- `spells-5E-2024-EN.json` - Loaded via fetch (cached by Service Worker)
- `spells-5E-2014-EN.json` - Loaded via fetch (cached by Service Worker)

**Persistence:**
- localStorage keys (`spellbook-ui-prefs`, `spellbook-onboarding-v1`)
- Character store persisted per-device (no sync across devices)

## Authentication & Identity

**Auth Provider:**
- None - No user authentication system
- Grimório is fully anonymous
- No login, sign-up, or user accounts

**Character Identification:**
- Implementation: Local ID generation (`char-${Date.now().toString(36)}-${Math.random().toString(36)}`)
- Scope: Device-only (not synced to cloud)

## APIs & External Services

**None.**

The application has zero external API dependencies:
- No spell data from remote APIs (all local JSON)
- No telemetry or analytics
- No social features requiring backend services
- No cloud sync or backup
- No ads or tracking

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Caching Strategy

**Service Worker (sw.js):**

**App Shell (HTML/CSS/JSX):**
- Strategy: **Network-first**
- Regex: `/\.(html|css|jsx)$/`
- Behavior: Online fetches newest code; offline uses cache
- Impact: Ensures fresh app updates when online, but cached shell allows offline access

**Data & Vendors (JSON, Fonts, CDN):**
- Strategy: **Stale-while-revalidate**
- Resources:
  - All 4 spell JSON files
  - Self-hosted fonts (`fonts/*.woff2`)
  - CDN bundles (React, ReactDOM, Babel from unpkg)
- Behavior: Responds immediately from cache, updates in background
- Impact: Fast load (cache hit), eventual consistency (background refresh)

**Precache List:**
- All app shell files loaded on first visit
- All 4 spell JSONs precached during Service Worker install
- React/ReactDOM/Babel from unpkg precached (with fallback to network)
- Fonts precached

**Offline Behavior:**
- Full offline functionality after first visit
- Service Worker cache remains valid across sessions
- No expiration enforced (users must manually clear cache)

## Hosting

**Deployment Options:**
- GitHub Pages (current: `grimorio-do-jogador` repo)
- Any static web server (Netlify, Vercel, S3, Apache, Nginx, etc.)
- Local file system (`file://`)

**Requirements:**
- HTTPS recommended (for Service Worker)
- HTTP 200 for all assets (no redirect chains)
- CORS not needed (no cross-origin requests)

## Browser APIs Used

**Standard Web APIs (No External Services):**
- `localStorage` - Character and UI preferences persistence
- `fetch()` - Load spell JSON files and cached CDN bundles
- `Service Worker API` - Offline caching and app installation
- `Clipboard API` - Copy build URL to clipboard (fallback if unavailable)
- `Share API` - Native share sheet (fallback to clipboard)
- `navigator.share()` - System-level sharing (optional)

## Version Control

**Source Control:**
- GitHub repository (this codebase)
- No CI/CD pipeline required
- Manual deployment to hosting service

## Environment Configuration

**Required Environment Variables:**
- None - App is fully self-contained

**Configuration:**
- Hard-coded spell versions in `spells-data-loader.jsx` (SPELL_VERSIONS array)
- Theme definitions in `v11-character-editor.jsx` (THEME_PALETTES object)
- i18n strings in `i18n.jsx` (STRINGS object)

## External Links (No Integration)

**Credited Resources (Linked in Footer):**
- Catppuccin color scheme (https://catppuccin.com/)
- Nord theme (https://www.nordtheme.com/)
- Monokai Pro (https://monokai.pro/)
- Solarized (https://ethanschoonover.com/solarized/)
- Marauder font (https://github.com/indestructible-type/Marauder)
- Texturina font (https://fonts.google.com/specimen/Texturina)
- JetBrains Mono (https://www.jetbrains.com/lp/mono/)

These are **attribution links only** — no runtime dependency.

## URL Sharing

**Build URL Encoding:**
- Custom implementation: `btoa(unescape(encodeURIComponent(JSON.stringify(...))))`
- No third-party URL shortener
- No analytics tracking on shared links
- All parameters in query string for complete portability

**URL Parameters:**
- `?v=` - Spell version selection
- `?build=` - Shared character build (base64 encoded)
- `?q=` - Search query
- `?f.class=` - Filter by class
- `?f.level=` - Filter by spell level
- `?f.school=` - Filter by school
- `?prep=1` - Show prepared spells only
- `?spell=` - Open specific spell detail

---

*Integration audit: 2026-07-17*
