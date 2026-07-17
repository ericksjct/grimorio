# Codebase Structure

**Analysis Date:** 2026-07-17

## Directory Layout

```
grimorio-do-jogador/
├── index.html                      # Entry point: React app shell + App component
├── hifi-tokens.css                 # Design tokens: colors, typography, sizing
│
├── grimorio-helpers.jsx            # Shared helpers: spellName, schoolKey, descriptions
├── i18n.jsx                        # Localization: STRINGS catalog, tt() function
├── spells-data-loader.jsx          # Spell data: fetch, cache, adapt to app schema
├── v10-hifi.jsx                    # UI components: desktop + mobile layouts, spell cards
├── v11-character-editor.jsx        # Character CRUD + localStorage persistence
│
├── sw.js                           # Service worker: offline caching, PWA support
├── manifest.json                   # PWA manifest
├── favicon.svg                     # App icon (SVG)
│
├── fonts/                          # Self-hosted fonts
│   ├── texturina-latin.woff2
│   ├── texturina-latin-ext.woff2
│   ├── jetbrainsmono-latin.woff2
│   └── jetbrainsmono-latin-ext.woff2
│
├── marauder/                       # Marauder Text font (body serif)
│   ├── webfonts/
│   │   ├── marauder-text.woff2
│   │   └── marauder-text-italic.woff2
│   └── […license files]
│
├── docs/                           # Documentation
│   └── superpowers/                # Project superpowers (Claude Code integrations)
│
├── .claude/                        # Claude Code config
│   ├── commands/                   # Custom commands
│   └── skills/                     # Project-specific skills
│
├── .planning/                      # Planning and analysis docs
│   └── codebase/                   # ← YOU ARE HERE
│       ├── ARCHITECTURE.md         # System design, layers, data flow
│       └── STRUCTURE.md            # Directory layout, file purposes
│
├── .superpowers/                   # Claude superpowers brainstorm
│   └── brainstorm/
│
├── .vscode/                        # VS Code settings
├── .git/                           # Version control
├── .gitignore                      # Git ignore patterns
└── package.json                    # Dependencies (minimal; no build step)
```

## Directory Purposes

**Root (Project Root):**
- Purpose: Application root; contains entry point, styles, data loaders, component modules
- Contains: Single-file components (JSX modules) + CSS + service worker
- Key files: `index.html` (entry), `hifi-tokens.css` (design system), `sw.js` (offline)

**fonts/ :**
- Purpose: Self-hosted web fonts (no Google Fonts → offline support + privacy)
- Contains: Texturina (display, variable weight 400-800), JetBrains Mono (mono labels)
- Key files: `texturina-latin.woff2`, `jetbrainsmono-latin.woff2`
- Generated: No; manually added via @font-face in hifi-tokens.css

**marauder/ :**
- Purpose: Marauder Text serif font (body/content text)
- Contains: WOFF2 files + license (font is self-hosted, not from Google)
- Key files: `webfonts/marauder-text.woff2`
- Committed: Yes

**.planning/codebase/ :**
- Purpose: Generated analysis documents for Claude Code integration
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md
- Generated: Yes (by /gsd-map-codebase tool)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `index.html` (lines 1-617): Main HTML page; loads React/Babel, defines App component, mounts to #root
- `index.html` (lines 374-587): App component; root React component that manages theme, language, character selection
- `sw.js`: Service worker; auto-registered on load (line 92-96 of index.html)

**Configuration:**
- `hifi-tokens.css`: CSS custom properties for all themes (colors, fonts, sizing); used by all components
- `manifest.json`: PWA manifest; app name, icons, display mode
- `package.json`: Minimal; declares dependencies (React, Babel, openspec)

**Core Logic:**
- `v10-hifi.jsx`: Main UI components — HifiDesktop (desktop layout), HifiMobile (mobile layout), HifiSpellCard (reusable card)
- `spells-data-loader.jsx`: Spell data fetching, caching, schema adaptation; useSpellVersions hook
- `v11-character-editor.jsx`: Character CRUD; localStorage persistence (loadCharacters, persistCharacters)
- `grimorio-helpers.jsx`: Shared utilities (spellName, schoolKey, hifiNorm, v8Description)

**Localization:**
- `i18n.jsx`: Central string catalog (STRINGS object) for PT-BR / EN; tt() and makeT() functions

**Styling:**
- `hifi-tokens.css`: ~400 lines; defines CSS variables for 6 themes × light/dark + typography + layout utilities

**Offline & PWA:**
- `sw.js`: Service worker; pre-caches app shell + 4 spell JSONs; network-first (shell) vs. stale-while-revalidate (data)
- `manifest.json`: PWA metadata; start_url, display, theme_color
- `favicon.svg`: App icon (transparent, works in both light and dark)

## Naming Conventions

**Files:**
- Modules with React components: PascalCase + `.jsx` (e.g., `v10-hifi.jsx`, `v11-character-editor.jsx`)
- Versioned files: `v{X}-{purpose}.jsx` (v10 = current UI, v11 = character editor, higher versions for future iterations)
- Utilities & loaders: kebab-case + `.jsx` (e.g., `spells-data-loader.jsx`, `grimorio-helpers.jsx`)
- Styles: kebab-case + `.css` (e.g., `hifi-tokens.css`)
- Service worker: `sw.js` (standard convention)

**Directories:**
- Self-hosted assets: lowercase plural (fonts/, marauder/)
- Meta directories: dot-prefix (`.claude/`, `.planning/`, `.vscode/`, `.git/`)
- Documentation: docs/

**React Components (in `.jsx`):**
- Functional components: PascalCase (e.g., `HifiDesktop`, `HifiSpellCard`, `CharacterEditor`)
- Custom hooks: use + PascalCase (e.g., `useViewport()`, `useHifiToast()`, `useSpellVersions()`, `useCharacters()`)
- Helper functions: camelCase (e.g., `spellName()`, `schoolKey()`, `hifiNorm()`)

**CSS & Design Tokens:**
- Custom properties: `--kebab-case` (e.g., `--text`, `--accent`, `--level-0`, `--surface1`)
- Theme classes: `.hifi-{theme-name}` (e.g., `.hifi-daylight`, `.hifi-catppuccin`, `.hifi-dark`, `.hifi-light`)
- Component classes: `.hifi-{component-name}` (e.g., `.hifi-card`, `.hifi-btn-primary`, `.hifi-input`)

**Data & State Keys:**
- localStorage keys: kebab-case or camelCase + version suffix (e.g., `spellbook-ui-prefs`, `hifi_chars_v1`, `spellbook-bookmarks-v1`)
- Custom events: kebab-case + hifi prefix (e.g., `hifi-chars-changed`, `hifi-spells-source-changed`, `hifi-print-request`, `hifi-toast`)
- URL parameters: short letter codes (e.g., `?v=` version, `?q=` query, `?f.class=` filter, `?spell=` detail, `?build=` import)

## Where to Add New Code

**New Feature (spell filtering, sorting, etc.):**
- Primary logic: `v10-hifi.jsx` (component) or `spells-data-loader.jsx` (data layer)
- Tests: No test directory; would create `v10-hifi.test.jsx` or `spells-data-loader.test.jsx` if testing is added
- Example: Adding a "rarity" filter → add filterKey to useSpellGrid hook, update filter UI in HifiFilterBar
- Strings: Add key to STRINGS.ptbr and STRINGS.en in `i18n.jsx`

**New Theme:**
- Theme palette: Add entry to THEME_PALETTES in `v11-character-editor.jsx` (or separate theme file if growing)
- CSS tokens: Add new theme class (e.g., `.hifi-theme-newname`) to `hifi-tokens.css` with custom property overrides
- Example: New "Cyberpunk" theme → add `cyberpunk: { red: {...}, blue: {...}, … }` to THEME_PALETTES, add `.hifi-theme-cyberpunk { --red: #ff00ff; … }` to CSS

**New Spell Version (e.g., 5E Revised):**
- Config: Add to SPELL_VERSIONS array in `spells-data-loader.jsx`
- JSON data: Place `spells-5E-YYYY-LANG.json` in root; reference in SPELL_VERSIONS + PRECACHE in `sw.js`
- No code changes needed; data-driven from config

**New Character Attribute (e.g., multiclassing info):**
- Schema: Extend character model in `v11-character-editor.jsx` (e.g., add `multiclass[]` field)
- UI: Update CharacterEditor form to capture new field
- Persistence: Automatically persisted via persistCharacters (existing code handles it)
- Display: Update print sheet or character summary if attribute should be shown

**New Responsive Layout (e.g., tablet mode):**
- Logic: Update isMobile calculation in App (`Math.min(w, h) < BREAKPOINT`)
- Components: Create HifiTablet component parallel to HifiDesktop / HifiMobile
- Rendering: App → conditionally render HifiTablet in addition to the two existing layouts

**Shared Utility Function:**
- If generic (spell naming, normalization): Add to `grimorio-helpers.jsx`
- If data-related (filtering, sorting): Add to module that owns the data (`spells-data-loader.jsx`)
- If UI-related (formatting, layout): Add to `v10-hifi.jsx`

**New Localization String:**
- Add key to STRINGS.ptbr AND STRINGS.en in `i18n.jsx`
- Use: `tt(lang, 'namespace.key')` or `tt(lang, 'namespace.key', { var: value })`
- Convention: Namespace keys like `spell.`, `char.`, `filter.`, `action.`, `toast.`

**Unit Test (when testing is added):**
- Location: Would place in root alongside source (e.g., `spells-data-loader.test.jsx`)
- Framework: Jest or Vitest (not yet set up)
- Pattern: Test data adapters, helpers, and state logic; mock localStorage

## Special Directories

**.claude/ :**
- Purpose: Claude Code configuration
- Generated: No; user-created
- Committed: Yes
- Use: Store project-specific skills and commands

**.planning/codebase/ :**
- Purpose: Generated analysis documents
- Generated: Yes (by /gsd-map-codebase)
- Committed: Yes
- Use: Read-only reference for Claude during code generation

**.superpowers/ :**
- Purpose: Claude superpowers brainstorm/notes
- Generated: Yes (manually or by Claude)
- Committed: Yes
- Use: Project context and collaboration notes

**.vscode/ :**
- Purpose: VS Code workspace settings
- Generated: No; user-created
- Committed: Yes
- Use: Standardize editor config across team

**docs/ :**
- Purpose: Project documentation
- Generated: No; user-created
- Committed: Yes
- Use: Design specs, guides, feature docs

## Loading Order (Critical)

Module load order in `index.html` is strict:

1. React 18 UMD (from unpkg CDN)
2. React-DOM UMD
3. Babel standalone UMD
4. **grimorio-helpers.jsx** — must load first; defines bare functions referenced by later modules
5. **i18n.jsx** — localization; defines tt(), makeT()
6. **spells-data-loader.jsx** — data layer; references spellName, schoolKey from helpers
7. **v11-character-editor.jsx** — character editor; references spellName, hifiNorm
8. **v10-hifi.jsx** — UI components; references everything above
9. **Final `<script type="text/babel">`** in index.html — App component, uses all above

If order changes, bare references will fail. Babel transpiles in-browser, so modules execute in order and share global scope (window).

---

*Structure analysis: 2026-07-17*
