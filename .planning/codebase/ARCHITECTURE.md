<!-- refreshed: 2026-07-17 -->
# Architecture

**Analysis Date:** 2026-07-17

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                        React App Shell                               │
│                    (index.html: App + ErrorBoundary)                 │
│  `index.html` (lines 374-587): Main entry, prefs persistence, hooks  │
└────────────────────┬─────────────────────────────────────────────────┘
                     │
         ┌───────────┼──────────────┬─────────────┐
         ▼           ▼              ▼             ▼
    ┌─────────┐  ┌──────────┐  ┌────────┐  ┌────────────┐
    │ Desktop │  │  Mobile  │  │  Print │  │ Onboarding│
    │ Layout  │  │  Layout  │  │ Sheet  │  │  Modal    │
    │ (v10)   │  │  (v10)   │  │(v10)   │  │           │
    └────┬────┘  └────┬─────┘  └───┬────┘  └────┬───────┘
         │            │            │            │
         └────────────┼────────────┴────────────┘
                      │
         ┌────────────┴─────────────┬──────────┬───────────┐
         ▼                          ▼          ▼           ▼
   ┌──────────────┐     ┌──────────────────┐ ┌────────┐ ┌─────────┐
   │    Spells    │     │  Character Store │ │ i18n   │ │ Helpers │
   │  Data Loader │     │   (v11)          │ │(i18n)  │ │(shared) │
   │  (spells-    │     │ localStorage +   │ └────────┘ └─────────┘
   │data-loader)  │     │ custom events    │
   │              │     │                  │
   │ JSON fetch + │     │ CRUD: create     │
   │ adaptation + │     │ edit/delete      │
   │ caching      │     │ character        │
   └──────┬───────┘     └────────┬─────────┘
          │                      │
          └──────────┬───────────┘
                     │
        ┌────────────┴─────────────┐
        ▼                          ▼
   ┌──────────────┐          ┌──────────────┐
   │ Design       │          │ Service      │
   │ Tokens       │          │ Worker       │
   │ (hifi-       │          │ (sw.js)      │
   │ tokens.css)  │          │              │
   │              │          │ PWA cache:   │
   │ CSS vars:    │          │ shell +      │
   │ colors,      │          │ spell JSON   │
   │ typography   │          │              │
   └──────────────┘          └──────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App | Root React component; manages dark/light mode, theme, character selection, language, version switching | `index.html` (lines 374-587) |
| HifiDesktop | Desktop layout: grid of spell cards + side panel detail | `v10-hifi.jsx` |
| HifiMobile | Mobile layout: single-column list + bottom drawer + full-screen detail | `v10-hifi.jsx` |
| HifiSpellCard | Reusable spell card; displays name, school, level, description snippet, ribbon toggle, bookmark star | `v10-hifi.jsx` (line 548+) |
| HifiPrintRoot | Print sheet renderer; renders to portal, triggered by print events | `v10-hifi.jsx` (line 152+) |
| CharacterEditor | Create/edit character panel; manages class levels, spellcasting stats, accent color | `v11-character-editor.jsx` |
| VersionSelector | Spell version switcher (2014/2024 × PT/EN); desktop dropdown or mobile bottom sheet | `spells-data-loader.jsx` (line 301+) |
| spellsDataLoader | Data fetching and caching; maintains spell JSON in-memory; adapts raw JSON to app format | `spells-data-loader.jsx` |
| i18n | String catalog; makeT / tt functions for localization | `i18n.jsx` |
| grimorio-helpers | Shared helpers: spellName, schoolKey, hifiNorm, v8Description, v8Upgrade | `grimorio-helpers.jsx` |

## Pattern Overview

**Overall:** Single-Page Application (SPA) with no build step — React + Babel transpile in browser

**Key Characteristics:**
- Babel standalone transpiles JSX modules at runtime; browser caches transpiled output
- All state persisted to localStorage (characters, preferences, bookmarks)
- Custom events dispatch for cross-component communication (theme, language, print, character changes)
- Service worker pre-caches app shell + 4 spell JSON files for offline-first PWA
- Responsive by viewport minimum dimension (mobile if `Math.min(w, h) < 768`)

## Layers

**Presentation (UI):**
- Location: `index.html`, `v10-hifi.jsx`
- Purpose: React components for desktop/mobile layouts, cards, modals, print sheet
- Contains: HifiDesktop, HifiMobile, HifiSpellCard, HifiPrintRoot, OnboardingModal
- Depends on: Data layer (spellsDataLoader), localization (i18n), design tokens (hifi-tokens.css)
- Used by: App (root)

**State Management & Persistence:**
- Location: `v11-character-editor.jsx` (characters + slots), `index.html` (UI prefs)
- Purpose: Character CRUD, localStorage persistence, custom event broadcasting
- Contains: loadCharacters, persistCharacters, loadBookmarks, persistBookmarks, character model schema
- Depends on: Nothing (filesystem/localStorage)
- Used by: App, HifiDesktop, HifiMobile, print functions

**Data Layer:**
- Location: `spells-data-loader.jsx`
- Purpose: Spell JSON fetching, caching, adaptation to app schema
- Contains: adaptSpell, loadVersion, buildSpellsFromRealData, useSpellVersions hook
- Depends on: Network (fetch) and design helpers (grimorio-helpers)
- Used by: App (via useSpellVersions), all spell-rendering components

**Localization:**
- Location: `i18n.jsx`
- Purpose: Central string catalog and translation functions
- Contains: STRINGS object (PT-BR / EN keys), tt() and makeT() memoized getters
- Depends on: Nothing
- Used by: All components that render strings

**Design System:**
- Location: `hifi-tokens.css`
- Purpose: CSS custom properties (colors, typography, sizing) for all themes
- Contains: 6 theme palettes (daylight, catppuccin, nord, monokai, solarized, parchment) × light/dark modes
- Depends on: Self-hosted fonts (fonts/*.woff2, marauder/*.woff2)
- Used by: All styled components (variables like `var(--text)`, `var(--accent)`, etc.)

**Shared Utilities:**
- Location: `grimorio-helpers.jsx`
- Purpose: Spell name resolution, school mapping, description fallbacks
- Contains: spellName, schoolKey, schoolName, hifiNorm, v8Description, v8Upgrade
- Depends on: Nothing
- Used by: Data layer (spells-data-loader), all components

**Offline Support:**
- Location: `sw.js`
- Purpose: Service worker; cache app shell + spell data for offline play
- Contains: PRECACHE array, network-first (shell) vs. stale-while-revalidate (data) strategies
- Depends on: Caches API
- Used by: Browser (auto-registered in index.html)

## Data Flow

### Primary Request Path: User Opens App

1. `index.html` loads (`<script type="text/babel">`) — App mounts, ErrorBoundary wraps
2. App React.useEffect → initializes prefs from localStorage, detects language/theme
3. App → calls setCurrentSpellVersion(initialVersionKey) → spells-data-loader listens
4. spells-data-loader.loadVersion(key) → fetches spell JSON from server
5. adaptSpells() transforms raw JSON → app schema (name, lvl, school, desc, etc.)
6. Cache in _cache[key]; dispatch `hifi-spells-source-changed` event
7. useSpellVersions hook updates → rerender with spells
8. HifiDesktop or HifiMobile renders grid/list; each spell → HifiSpellCard
9. User clicks card → detail panel opens, displays full description (v8DescriptionHtml)

### Spell Preparation (Mark As Prepared)

1. User clicks ribbon on HifiSpellCard → onTogglePrepared()
2. toggleSpellPrepared(character.id, spell.en) updates localStorage
3. persistCharacters([...updated]) dispatches `hifi-chars-changed` event
4. App/components listen → refresh prepared set, rerender

### Character Switch / Creation

1. User clicks character selector → CharacterEditor opens
2. CharacterEditor: form for name, class levels, accent color
3. On save: createCharacter() / updateCharacter() → persistCharacters()
4. Custom event `hifi-chars-changed` fires
5. App → setCharName(newChar.name), rerender with active character

### Print Prepared Spells

1. User clicks "Print prepared" button → hifiPrintPrepared(spells, lang, show)
2. Dispatches `hifi-print-request` event with spells array, mode='pack'
3. HifiPrintRoot listener → setPayload({ spells, lang, mode })
4. React renders HifiPrintRoot portal with <div id="hifi-print-sheet" data-mode="pack">
5. window.print() triggered after RAF (ensures React commits)
6. CSS @media print rules apply; browser prints packed 2-column layout

### Share Build URL

1. User clicks "Share build" → __shareBuild() (global hook set in index.html)
2. Encodes character data (name, prepared, classes, slots) to base64
3. navigator.share() or navigator.clipboard.writeText() with build URL
4. Shared link: `?build=<base64>` parsed on load
5. importSharedBuildUrl() decodes, creates new character, persists
6. Toast confirms import

### State Management

**Persisted to localStorage:**
- `spellbook-ui-prefs`: { dark, theme, characterName, lang, versionKey }
- `hifi_chars_v1`: array of character objects (name, id, classes, prepared, slots)
- `spellbook-bookmarks-v1`: global array of bookmarked spell names
- `spellbook-onboarding-v1`: '1' if user has seen onboarding (only once)

**In-Memory (not persisted):**
- Spell cache (_cache[key] in spells-data-loader)
- Active character (selected by name in App state)
- UI state (filters, search query, open modals, selected spell detail)

## Key Abstractions

**Spell Adapter Schema:**
- Purpose: Normalize raw spell JSON to consistent internal format
- Examples: `adaptSpell()`, `adaptSpells()` in `spells-data-loader.jsx`
- Pattern: Raw { name, level, school, description, … } → { en, pt, lvl, school, desc: { pt, en }, … }
- Used by: All spell-rendering logic to access consistent fields

**Character Model:**
- Purpose: User-created persisted spell list / spell slot tracker
- Schema: { id, name, accentId, prepared[], bookmarked[], classes[{class, level}], slots{total, used} }
- Pattern: CRUD via loadCharacters / persistCharacters; broadcasts changes via custom event
- Used by: App, CharacterEditor, print functions

**Design Token (CSS Variables):**
- Purpose: Theme-agnostic color/typography system
- Examples: --text, --accent, --level-0..9, --surface0..2, --subtext0..1
- Pattern: Class-based theme activation (.hifi-light.hifi-theme-catppuccin)
- Used by: All styled components

**Localization Function:**
- Purpose: Resolve string by language + key + optional interpolation
- Examples: tt(lang, 'spell.range'), tt(lang, 'spell.part', { i, n })
- Pattern: Memoized by language; centralized STRINGS catalog in i18n.jsx
- Used by: All components rendering text

## Entry Points

**index.html (main entry point):**
- Location: `index.html`
- Triggers: Browser loads page
- Responsibilities: Load React/Babel/Babel standalone from CDN, define global helpers, mount App to #root

**Service Worker Registration:**
- Location: `index.html` (lines 91-96)
- Triggers: On page load; checks navigator.serviceWorker support
- Responsibilities: Register `sw.js` for offline caching

**Spell Data Entry Points:**
- loadVersion(key) in `spells-data-loader.jsx`: called by useSpellVersions hook, triggered by version change
- buildSpellsFromRealData(): returns cached or empty array, triggers background load

**Character Entry Points:**
- loadCharacters(): reads localStorage, returns array
- persistCharacters(chars): writes localStorage, dispatches custom event

**Event Broadcast Listeners:**
- `hifi-spells-source-changed`: VersionSelector → App updates language/theme
- `hifi-chars-changed`: CharacterEditor/App → all components update character lists
- `hifi-print-request`: Print buttons → HifiPrintRoot renders sheet
- `hifi-toast`: Components → HifiToast displays notification

## Architectural Constraints

- **Threading:** Single-threaded event loop (browser). No workers. Spell JSON parsing happens on main thread.
- **Global state:** localStorage is the single source of truth for persistence. In-memory spell cache (_cache) is not persisted but is recreated on version switch. App state (dark mode, active character) is duplicated in localStorage and React state.
- **No circular imports:** Module order in index.html is strict: helpers → i18n → loader → editor → ui. helpers must load first (bare references in other modules).
- **Spell JSON size:** ~600KB per version file; service worker pre-caches all 4 (2.4MB total). Browser caches transpiled JSX output via bfcache.
- **URL state decay:** ?spell=, ?q=, ?f.class= params are read but not written back (filters/search are ephemeral); only ?build= and ?v= (version) are shareable. Shared view URLs (?q, ?f) must be reconstructed via hifiShareViewUrl().
- **Coupling:** Language is coupled to spell version (PT/EN version → UI language). No independent language toggle. Accent color is tied to character, not global.

## Anti-Patterns

### Transient State in localStorage

**What happens:** Filters, search queries, selected spell detail pane are NOT persisted (intentional). Only character data and theme prefs.

**Why it's right:** Transient UI state (search/filters) would clutter history and make mobile back-button confusing. Shared URLs (?q=, ?f.) are the only way to reproduce a view, not localStorage.

**Do this:** For anything that should survive a refresh, persist to localStorage via persistCharacters / savePrefs. For ephemeral UI, keep in React state.

### No Global Modal Manager

**What happens:** OnboardingModal, CharacterEditor, print sheets are rendered inline where they're triggered. No single modal stack or portal manager.

**Why it's right:** Small surface area. Desktop side-panel and mobile full-screen modals have different layouts; inline rendering lets HifiDesktop/HifiMobile control positioning.

**Do this:** New dialogs should render in App (index.html) as sibling to HifiDesktop/HifiMobile, with their own open/close state and event listeners if cross-component triggering is needed.

### Spell Cache Invalidation by Version Switch

**What happens:** Changing spell version (PT/EN or 2014/2024) clears the active spell list, re-triggers fetch. Old version cache stays in memory.

**Why it's right:** Spell versions are independent (different JSON files, incomparable). Clearing forces UI to reload. Cache stays to let user flip back quickly.

**Do this:** If adding a "compare versions" feature, keep both caches in _cache; don't clear on switch. Current behavior is correct for single-version UX.

## Error Handling

**Strategy:** Graceful degradation; errors don't crash the app.

**Patterns:**
- Spell load failure: console.warn, dispatch error toast, return empty spells array, retry on next switch
- Character load failure: loadCharacters catches JSON.parse errors, returns empty array (use default character)
- Missing translation: tt() checks both lang and fallback (PT-BR), returns ID if both miss
- React render error: ErrorBoundary catches, shows "something went wrong" page with reload button
- Service worker failures: registered with .catch(() => {}); graceful fallback to network if offline fails

## Cross-Cutting Concerns

**Logging:** Console.log for boot state, console.warn for spell load failures. No central logger; debug info is surfaced via toast (user-facing errors).

**Validation:** Character names validated by UI (trim, dedupe check). Spell level/school parsed and clamped (0-9 level, default school=4). No schema validation on load (trust source JSON).

**Authentication:** None. App is read-only + personal (localStorage). Sharing is via base64-encoded build URL (no server), not accounts.

**Accessibility:**
- Semantic HTML: buttons for interactive, img alt text, aria-label on icon-only buttons
- Keyboard: Tab order maintained; select/open via Enter/Space; close via Escape
- Screen readers: aria-label, aria-pressed, aria-hidden on decorative elements
- Color: Level colors (--level-0..9) are coded, not relying on color alone for meaning
- Motion: @media (prefers-reduced-motion: reduce) removes animations

---

*Architecture analysis: 2026-07-17*
