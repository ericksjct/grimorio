# Codebase Concerns

**Analysis Date:** 2026-07-17

## Tech Debt

**Silent Error Handling (Systemic)**
- Issue: Widespread use of bare `catch (e) {}` blocks that silently swallow errors without logging
- Files: `v11-character-editor.jsx` (lines 227-233, 238, 305-322, 327, 377, 404), `v10-hifi.jsx` (lines 159, 788-796, 856-857, 864-868, 1019-1030), `spells-data-loader.jsx` (line 223)
- Impact: Silent failures make debugging difficult; users don't know when operations fail (localStorage quota, parsing errors, focus() failures)
- Fix approach: Replace bare catches with: (1) console.warn() for diagnostic errors, (2) try to recover gracefully, (3) show user-facing error only when operation is critical. Add a central error reporter function.

**Monolithic JSX Files**
- Issue: Two massive JSX components without modularization
- Files: `v10-hifi.jsx` (2,197 lines), `v11-character-editor.jsx` (946 lines)
- Impact: Difficult to test, reuse, or modify individual features; high cognitive load; difficult to reason about dependencies
- Fix approach: Extract UI components into smaller modules (e.g., `components/SpellCard.jsx`, `components/FilterPanel.jsx`, `hooks/useFilters.jsx`). Keep data logic in separate utility files.

**Global State via Window Globals**
- Issue: Extensive use of `window.xxx = yyy` for state management and function registration
- Files: `spells-data-loader.jsx` (lines 422-434), `v11-character-editor.jsx` (line 129), `i18n.jsx` (lines 283-289), `v10-hifi.jsx` (many references to `window.spellName`, `window.CLASS_PT`, etc.)
- Impact: Hard to track dependencies; pollutes global namespace; makes it hard to know what functions/state exist; no clear ownership model
- Fix approach: Create a module registry or context-based state management instead of window globals. Consider using a simple event bus pattern or React Context if refactoring to modular components.

**No Test Coverage**
- Issue: Zero unit, integration, or E2E tests
- Files: No test files found in repository
- Impact: Cannot verify core features work; refactoring is risky; character creation/deletion, spell filtering, spell slot tracking have no safety net
- Fix approach: Add Jest/Vitest config. Start with critical path tests: (1) character CRUD, (2) spell filtering (3) slot tracking. Use fixtures for spell data.

**Unstructured Error Reporting**
- Issue: No centralized error logging; errors only surface as console warnings or toasts
- Files: `spells-data-loader.jsx` (line 215 console.warn), `i18n.jsx` (line 241 console.warn)
- Impact: Production errors go unnoticed; cannot track failure patterns; users don't know if a failure is expected or a bug
- Fix approach: Create a `logError()` function that writes to console and optionally to a service (Sentry, etc.). Use structured logging with error codes.

---

## Known Bugs

**localStorage Quota Exhaustion Not Handled**
- Symptoms: App silently stops persisting characters/bookmarks/preferences when quota exceeded (~5-10MB depending on browser)
- Files: `v11-character-editor.jsx` (lines 238, 319, 327), `index.html` (lines 120-131)
- Trigger: User creates many characters with long names or imports many spell sets, then localStorage quota exceeded
- Workaround: None; users must manually clear browser storage
- Fix: Wrap localStorage writes in try/catch that catches QuotaExceededError and shows a clear message: "Your browser's storage is full. Delete some characters to continue."

**Service Worker Precache May Fail Silently**
- Symptoms: One or more spell JSON files don't cache; user gets blank spell list on first offline visit
- Files: `sw.js` (lines 44, uses Promise.allSettled which hides failures)
- Trigger: Network unstable during first visit when service worker installs; CDN is slow
- Workaround: Refresh the page when online
- Fix: Log which precache items failed; add a debug page showing cache status. Consider removing Promise.allSettled fallback for critical assets (spell JSONs); fail hard if a spell file can't be cached.

**Character ID Collision (Theoretical)**
- Symptoms: Two characters could theoretically have the same ID if created at same millisecond with same random slug
- Files: `index.html` (line 203: `Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6)`)
- Trigger: Extremely unlikely in practice; user creates character, immediately navigates to another tab and creates another at exact same time
- Fix: Use UUID library or extend random slug to more bytes. Add uniqueness check in `uniqueImportedCharacterName()`.

**12-Second Boot Timeout May Trigger Prematurely**
- Symptoms: On slow networks, user sees "Grimório está demorando" message even though React is still loading
- Files: `index.html` (lines 78-89)
- Trigger: Connection latency > 12s or network jitter during React/Babel CDN fetch
- Workaround: Refresh the page or wait
- Fix: Increase timeout to 15-20s OR show it only if React hasn't mounted AND the first spell JSON hasn't loaded. Make it dismissible.

---

## Security Considerations

**localStorage Accessible to XSS**
- Risk: If any third-party script or CDN (React, Babel from unpkg.com) is compromised, attacker can read/modify all stored characters, bookmarks, spell choices
- Files: `v11-character-editor.jsx`, `index.html` (localStorage usage), `sw.js` (caches unpkg.com resources)
- Current mitigation: Browser same-origin policy; SRI hash on React/Babel <script> tags
- Recommendations: 
  1. Use localStorage only for non-sensitive data (character names, layout preferences)
  2. Add Subresource Integrity (SRI) hashes to React/Babel loads (already done, good)
  3. Consider Content Security Policy (CSP) headers to restrict script sources to app origin + unpkg.com only
  4. Consider moving spell data to self-hosted copy instead of GitHub raw content to reduce external dependencies

**Unvalidated URL Parameters**
- Risk: `?build=` parameter accepts base64-encoded JSON without validation; could lead to XSS if crafted payload contains unescaped HTML
- Files: `index.html` (lines 163-182, `decodeSharedBuildPayload()`)
- Current mitigation: Only imports character data (name, slots, classes); description/display fields come from spell data, not URL
- Recommendations: Add schema validation to imported build payload (validate that slots.total and .used are objects with number values, classes is array of {class, level}, etc.). Strip any unexpected fields.

**Service Worker Caches Third-Party CDN**
- Risk: If unpkg.com is compromised, cached malicious React could persist for weeks
- Files: `sw.js` (lines 34-36, precaches unpkg.com)
- Current mitigation: SRI hashes prevent loading different versions
- Recommendations: Self-host React/Babel or use a more trusted CDN. At minimum, add Cache-Control headers that force revalidation daily. Consider removing unpkg.com from precache and loading on-demand only.

---

## Performance Bottlenecks

**4 × ~700KB Spell JSON Files Loaded on Demand**
- Problem: Each spell version (2014 PT, 2024 PT, 2014 EN, 2024 EN) is ~600-750 KB uncompressed. Switching versions triggers re-fetch + re-parse.
- Files: `spells-data-loader.jsx` (lines 10-15, SPELL_VERSIONS), `v10-hifi.jsx` (lines 1015-1030, version toggle)
- Current: Only active version is pre-cached; switching tabs loads the other version
- Cause: No gzip/brotli compression on JSON (server-side); no request deduplication if multiple tabs open
- Improvement path: 
  1. Gzip spell JSONs on deploy (90% smaller ~60-70KB)
  2. Deduplicate concurrent fetch requests (add request.clone() to `loadVersion`)
  3. Lazy-load less-common versions (2014 EN) only on-click, not on init
  4. Consider splitting large JSON by class (bard spells separate from wizard) if versions grow

**1-Frame Lag on Filter/Search Changes**
- Problem: Large spell list (~500+ spells) causes render lag when typing search or clicking filter chips
- Files: `v10-hifi.jsx` (lines 798-1100, filter state management and list rendering)
- Cause: No memoization of filtered list; re-renders entire list on every keypress
- Improvement path: Use `React.useMemo()` for filtered spell list; debounce search input by 200ms; virtualize spell list if > 300 items (use `react-window`)

**Synchronous JSON.parse on Large Spell Data**
- Problem: Main thread blocks for ~100-200ms when parsing 700KB JSON and adapting spell fields
- Files: `spells-data-loader.jsx` (lines 206-209, `adaptSpells()` loop is synchronous)
- Improvement path: Move JSON parse + adaptation to Web Worker to unblock main thread. Show loading spinner during parse.

---

## Fragile Areas

**Spell Data Format Coupling**
- Files: `spells-data-loader.jsx` (lines 83-140, `adaptSpell()`)
- Why fragile: `adaptSpell()` directly accesses 15+ properties of raw JSON objects (s.school, s.level, s.class, etc.). If source JSON schema changes, silent failures occur (missing fields default to '' or 0)
- Safe modification: Add schema validation at JSON load time (e.g., `assert(json.every(s => 'school' in s && 'level' in s && 'class' in s))`). Add `??` fallbacks for every field access. Test against all 4 spell version files.
- Test coverage: No unit tests for `adaptSpell()`. Need fixtures from each of the 4 JSON files.

**Character Serialization/Deserialization**
- Files: `v11-character-editor.jsx` (lines 218-223, `_normChar()`, lines 226-234, `loadCharacters()`)
- Why fragile: Many fields have optional/fallback logic (_normSlots, _normClassLevels); missing fields don't error, they silently default. Unknown structure in localStorage causes confusing behavior.
- Safe modification: 
  1. Add version number to stored character format (`{ _v: 2, name, slots, ... }`)
  2. Add migration function for v1 → v2 format changes
  3. Add JSON Schema or Zod validation at load time, reject malformed entries instead of trying to fix them
- Test coverage: None. Need tests for: (1) loading v1 format, (2) round-trip (save → load), (3) corrupted JSON handling.

**Class/Level Filtering Logic**
- Files: `v10-hifi.jsx` (lines 830-849, auto-filter by character classes), `spells-data-loader.jsx` (lines 31-43, CLASS_PT/CLASS_EN mappings)
- Why fragile: Multi-language mapping with hardcoded strings; if spell data uses unexpected class names, filtering silently breaks. No validation that spell.class is in {bard, cleric, ...}.
- Safe modification: Add validation at spell load time: warn if a spell has a class not in CLASS_PT or CLASS_EN. Add test fixtures that include edge cases (class name typos, mixed case).

---

## Scaling Limits

**localStorage Limit (~5-10MB)**
- Current capacity: Typical user can store ~20-50 characters before hitting quota
- Limit: When reached, all writes fail silently; app appears broken
- Scaling path: 
  1. For light users: current storage is fine
  2. For power users (100+ characters): migrate to IndexedDB (much larger, ~100s of MB), or compress character data
  3. Add storage quota monitoring; warn user at 80% full

**Service Worker Precache Size**
- Current: ~2.6 MB (all 4 spell JSONs + React/Babel + CSS/fonts)
- Limit: Browser cache may evict old SWs if total size > available storage
- Scaling path: 
  1. Load only active spell version on first visit (already done)
  2. Lazy-load other versions via on-demand fetch (already done)
  3. Compress spell JSONs server-side (not done)
  4. If adding new features, keep precache < 5 MB

**Browser DevTools Console Spam**
- Current: console.warn() on every spell load failure; no rate limiting
- Issue: If network is flaky and user switches versions repeatedly, console fills with warnings
- Fix: Add one console.warn per version per session; deduplicate by error message

---

## Dependencies at Risk

**React 18.3.1 from unpkg.com**
- Risk: Unpkg.com could go down, CDN could be slow in some regions, or package could disappear
- Impact: App fails to load; no spell functionality
- Migration plan: Self-host React and Babel from `/vendor/` directory. Rebuild and test quarterly.

**Babel Standalone 7.29.0 from unpkg.com**
- Risk: Same as React; also Babel is large (~700KB) and slow to transpile JSX in browser
- Impact: Slow load on first visit; worse on slow connections
- Migration plan: Pre-transpile JSX files server-side using Babel build step, ship only JS bundles. Removes runtime dependency on Babel entirely.

**No Service Worker Cache Versioning**
- Risk: Deploying new spell data but cache key stays 'grimorio-v1'; users get stale data
- Impact: Users see outdated spells or missing new spells for weeks until cache expires
- Fix: Bump CACHE_VERSION (sw.js line 10) on every spell data update and on every app update. Test cache invalidation strategy.

---

## Missing Critical Features

**Offline Indicator**
- Problem: No visual indicator that user is offline. App appears broken but is actually in offline mode.
- Fix: Add a small banner at top showing "No connection — using cached data" when navigator.onLine === false. Add ConnectionProvider or similar to detect status.

**Error Recovery UI**
- Problem: When spell version fails to load (console shows warning), user sees blank spell list with no explanation
- Fix: Show a clear error message: "Failed to load spells. Check your connection. [Retry]" with a retry button that calls `loadVersion()` again.

**Data Import/Export**
- Problem: If browser storage is cleared, user loses all characters and bookmarks. No way to back up or transfer between devices.
- Fix: Add "Export my characters" (JSON download) and "Import" (file picker) buttons. Makes user data portable.

**Spell Comparison**
- Problem: No way to compare spells side-by-side (e.g., Fireball vs Cone of Cold)
- Current: Only view one spell at a time
- Note: This is a feature gap, not a bug, but blocks some UX workflows.

---

## Test Coverage Gaps

**Character CRUD (Create, Read, Update, Delete)**
- What's not tested: Creating character, renaming, changing accent, deleting character, importing from URL
- Files: `v11-character-editor.jsx` (lines 225-294), `index.html` (lines 199-216)
- Risk: Regression in character lifecycle could break app for users
- Priority: High

**Spell Filtering and Search**
- What's not tested: Filter by class, level, school, prepared-only; search by name; URL restoration (?q=, ?f.class=, ?prep=)
- Files: `v10-hifi.jsx` (lines 798-849, filter state changes)
- Risk: Search/filter could subtly break (e.g., empty filter returns no results instead of all results)
- Priority: High

**Spell Data Adaptation**
- What's not tested: JSON parsing, field mapping (en→pt, school index, class normalization), edge cases (missing fields, unknown school, bad level)
- Files: `spells-data-loader.jsx` (lines 83-145)
- Risk: Spell data displayed incorrectly; searches break if adapted fields are null/undefined
- Priority: High

**localStorage Persistence Round-Trip**
- What's not tested: Save character → close/reload → character still there; bookmarks persist; preferences survive
- Files: `v11-character-editor.jsx` (lines 226-239), `index.html` (lines 120-131)
- Risk: Users lose work if storage fails; migration logic never tested
- Priority: Medium

**Slot Tracking**
- What's not tested: Increment/decrement used slots, long rest clears slots, can't exceed max slots
- Files: `v11-character-editor.jsx` (lines 280-295)
- Risk: Character sheet could show wrong spell slots; user confusion
- Priority: Medium

**URL Parameter Parsing**
- What's not tested: Malformed ?spell=, ?build=, ?q=, ?f.class=, ?f.level=, ?prep= parameters; edge cases like ?spell=<xss payload>
- Files: `v10-hifi.jsx` (lines 855-868), `index.html` (lines 163-182)
- Risk: XSS or app crash on malformed URLs
- Priority: Medium

---

## Code Quality Issues

**No JSDoc or Type Hints**
- Issue: 4000+ lines of JSX with no function documentation or TypeScript types
- Files: All JSX files
- Impact: Hard to understand parameter types, return types, or expected errors
- Fix: Add JSDoc comments to all exported functions. Consider migrating to TypeScript.

**Inconsistent Naming Conventions**
- Issue: Mix of snake_case (HIFI_CHARS_KEY) and camelCase (setCharName); inconsistent prefixes (SPELL_, hifi, CLASS_)
- Files: Various
- Fix: Define and enforce naming convention: constants = UPPER_CASE, functions/variables = camelCase, React components = PascalCase, CSS classes = kebab-case.

**Magic Numbers and Strings**
- Issue: 12000 (boot timeout), 2400 (toast timeout), 600 (debounce ms), "hifi-chars-v1" (storage keys) scattered throughout code
- Files: Various
- Fix: Define constants at top of each file or in a shared config file.

---

*Concerns audit: 2026-07-17*
