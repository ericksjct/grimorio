# Testing Patterns

**Analysis Date:** 2026-07-17

## Test Framework

**Runner:**
- Not detected - No test runner configured (no Jest, Vitest, Mocha, or similar)
- No test configuration files found (`jest.config.*`, `vitest.config.*`, etc.)

**Assertion Library:**
- Not applicable - No testing setup present

**Run Commands:**
- Not defined - Project has no test suite

## Test File Organization

**Location:**
- Not applicable - No test files found in repository
- Glob search for `*.test.*` and `*.spec.*` files returned no results
- All code exists as single-file production modules loaded via `<script>` tags

**Naming:**
- Not applicable

**Structure:**
- Not applicable

## Testing Strategy

**Current State:**
- No automated testing framework present in this codebase
- Code is browser-based single-file modules (React + Babel transpilation in-browser)
- No CI/CD pipeline detected for running tests

**Manual Testing:**
- Project appears to rely on manual browser testing
- Design-focused application (spellbook UI) emphasizes visual correctness over unit tests
- service worker (`sw.js`) handles offline functionality and caching strategy

## Patterns for Future Testing

If testing were to be added, the following patterns emerge from the codebase:

**Unit Test Candidates:**

1. **Data Transformation Functions** (`spells-data-loader.jsx`):
   ```javascript
   // Functions that should have tests:
   function stripHtml(s)                    // HTML entity handling
   function normalizeComponents(comp)       // String tokenization
   function detectEdition(fileName)         // Edition detection
   function adaptSpell(s, versionLang, edition)  // Complex data mapping
   ```

2. **State Management Helpers** (`v11-character-editor.jsx`):
   ```javascript
   // Pure functions that could be tested:
   function normalizeAccentId(accentId)     // Legacy mapping
   function paletteFor(accentId, theme)     // Color palette lookup
   function _normSlots(slots)               // Validation + clamping
   function _normChar(c)                    // Normalization
   function _normClassLevels(list)          // Deduplication + bounds
   function hifiSuggestedSlots(classLevels) // Complex calculation
   ```

3. **Search + Normalization** (`grimorio-helpers.jsx`):
   ```javascript
   function hifiNorm(str)                   // Normalization for search
   function spellName(s, lang)              // Language-aware naming
   ```

4. **URL Encoding/Decoding** (`index.html`):
   ```javascript
   function decodeSharedBuildPayload(payload)    // Base64 + URL encoding
   function decodeSharedBuildFromUrl(value)      // URL parsing
   function uniqueImportedCharacterName(baseName, chars, lang)  // Name collision handling
   ```

## Mocking

**Current Approach:**
- Window object used for global state and function references
- No mocking library present; would need Jest or Vitest for mocking

**If Testing Were Added:**
- Mock `localStorage` for persistence tests
- Mock `navigator.clipboard` for copy-to-clipboard tests
- Mock `navigator.share` for native share API tests
- Mock `window.dispatchEvent` for custom event testing
- Mock `navigator.serviceWorker` for SW registration tests

**What to Mock:**
- Browser APIs (localStorage, clipboard, share, print)
- Custom event dispatch/listen cycles
- Service worker registration (offline behavior)
- Internationalization lookups via `window.makeT`

**What NOT to Mock:**
- Core data transformation functions (`stripHtml`, `normalizeComponents`, `adaptSpell`)
- Pure calculation functions (`hifiSuggestedSlots`, color palette resolution)
- Normalization functions (`_normChar`, `_normSlots`, `hifiNorm`)
- These should run against real input/output to catch regression bugs

## Fixtures and Factories

**Test Data:**
- Not present in codebase
- Would need to create:
  - Sample spell objects matching `adaptSpell()` output format
  - Character objects with various class/level combinations
  - Theme/palette configurations
  - Mock JSON spell data samples

**Location (if added):**
- Could live in `tests/fixtures/` directory
- Or co-locate in `tests/` near the test files

## Coverage

**Requirements:**
- Not enforced - No coverage tool configured or CI check present

**Target (recommended if testing added):**
- High priority: Data transformation (100%) — affects all spell data
- High priority: State management (95%+) — spell slot calculations critical
- Medium priority: UI component rendering (60-80%) — visual correctness hard to test
- Low priority: Browser API fallbacks (40-60%) — require browser environment

**View Coverage (if Jest/Vitest added):**
```bash
npm test -- --coverage
# or
npm run test:coverage
```

## Test Types

**Unit Tests (Recommended):**
- Scope: Individual pure functions and data transformers
- Approach: Jest/Vitest with standard test suite format
- Focus on data transformation edge cases:
  - Invalid HTML in descriptions
  - Missing fields in spell objects
  - Out-of-range class levels (< 1 or > 20)
  - Multiclass warlock combinations
  - Legacy accent ID migration

**Integration Tests (Secondary):**
- Scope: State management lifecycle (load → persist → broadcast)
- Test localStorage round-trip: save and load characters
- Test CustomEvent broadcasting between components
- Test URL encoding/decoding for shared builds

**E2E Tests (Not Present):**
- Not set up; would require Playwright or Cypress
- Project uses `openspec-playwright` in dependencies (`package.json`) but for different purpose
- Could be used to test:
  - Full page load and render
  - Theme switching
  - Character creation workflow
  - Search/filter interactions

## Service Worker Testing

The application includes a service worker (`sw.js`) with offline-first caching strategy:

```javascript
// Strategy:
// - App shell (HTML/CSS/JSX): NETWORK-FIRST
// - Data (JSON spells, fonts): STALE-WHILE-REVALIDATE
```

**Manual validation needed for:**
- First visit: Spells precache successfully
- Offline mode: Spell data loads from cache
- Online update: New spell data fetches and updates cache
- Service worker activation: Old cache versions deleted

Would require manual browser DevTools testing or Playwright with offline mode.

## Debugging Patterns

**Console Debugging:**
- No console logging found in production code
- Comments used instead for documentation
- If adding logging, follow pattern: `console.error()` only for serious issues

**Browser DevTools Usage:**
- Project includes screenshot utilities (`capture-scroll.js`)
- Debug PNG files in root directory suggest development/screenshot testing
- React DevTools would be useful for component tree inspection

## Common Test Patterns (If Implemented)

**Async Testing:**
```javascript
// Example structure for testing localStorage operations:
test('should load characters from localStorage', async () => {
  localStorage.setItem(HIFI_CHARS_KEY, JSON.stringify(mockChars));
  const result = loadCharacters();
  expect(result).toEqual(expectedNormalized);
});
```

**Error Handling Testing:**
```javascript
// Test silent fail patterns:
test('should return default on corrupt localStorage', () => {
  localStorage.setItem(HIFI_CHARS_KEY, '{invalid json}');
  const result = loadCharacters();
  expect(result).toEqual(HIFI_DEFAULT_CHARS.map(_normChar));
});
```

**Normalization Testing:**
```javascript
// Test guard clauses and bounds:
test('should clamp class level to 1-20 range', () => {
  const input = { class: 'wizard', level: 99 };
  const result = _normClassLevels([input]);
  expect(result[0].level).toBe(20);
});
```

## Recommended First Steps for Testing

If testing is to be added to this project:

1. **Install Jest**: `npm install --save-dev jest`
2. **Create test directory**: `mkdir tests`
3. **Add test script**: `"test": "jest"` in package.json
4. **Start with data transformers**: `tests/spells-data-loader.test.js`
   - `adaptSpell()` has complex logic, worth testing
   - Good ROI for bug prevention
5. **Add state management tests**: `tests/v11-character-editor.test.js`
   - Slot calculations critical for gameplay
   - Multiclass edge cases need coverage
6. **Mock localStorage**: Create `tests/setupTests.js` with localStorage mock
7. **Sample spell fixtures**: Create `tests/fixtures/spells.json` with test data

## No Test Configuration Files

No configuration files found for:
- `.eslintignore`
- `.prettierignore`
- `.mocharc*`
- `.jestrc*`
- `vitest.config.*`
- `jest.config.*`

This indicates the project has not yet adopted automated testing infrastructure.

---

*Testing analysis: 2026-07-17*
