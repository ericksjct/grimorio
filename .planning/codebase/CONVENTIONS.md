# Coding Conventions

**Analysis Date:** 2026-07-17

## Naming Patterns

**Files:**
- Kebab-case for CSS files: `hifi-tokens.css`
- Descriptive names with version prefix for major versions: `v10-hifi.jsx`, `v11-character-editor.jsx`
- Utility files with clear purpose: `spells-data-loader.jsx`, `grimorio-helpers.jsx`, `i18n.jsx`
- Service worker: `sw.js`

**Functions:**
- camelCase for all function names
- Prefixed names to group related functions: `hifi*` (e.g., `hifiSpellKey`, `hifiAccentsFor`, `hifiCharName`)
- Custom hooks prefixed with `use` (React convention): `useHifiToast`, `useCharacters`, `useBookmarks`, `useDialogA11y`
- Internal/private functions prefixed with underscore: `_normSlots`, `_normChar`, `_normClassLevels`, `_normClassLevels`
- Imperative verbs for action functions: `loadCharacters`, `persistCharacters`, `toggleBookmark`, `togglePreparedFor`, `stripHtml`, `normalizeComponents`

**Variables:**
- camelCase for all variable and parameter names
- Descriptive names indicating purpose: `classLevels`, `warlockLevel`, `casterLevel`, `accentId`, `versionKey`
- Ref suffixes for React refs: `restoreRef`, `onCloseRef`, `spellParamRef`
- Boolean state variables indicate their nature: `isShell`, `canSave`, `has_*` or `is_*` prefixes when used

**Types/Constants:**
- UPPER_CASE for constants and lookup tables: `ACCENT_SLOTS`, `THEME_PALETTES`, `TIER_SYMBOLS`, `SPELL_VERSIONS`, `SCHOOL_INDEX`, `CASTER_CLASSES`
- Semantic naming for configuration objects: `THEME_PALETTES`, `LEGACY_ACCENT_MAP`
- Keys for localStorage and events named with descriptive suffixes: `HIFI_CHARS_KEY`, `HIFI_CHARS_EVENT`, `HIFI_BOOKMARKS_KEY`, `HIFI_BOOKMARKS_EVENT`

## Code Style

**Formatting:**
- No enforced code formatter (no Prettier/ESLint config found)
- 2-space indentation (observed throughout codebase)
- Line length varies; reasonable wrapping around 100 characters
- Object literals use trailing comma style before closing brace
- Arrow functions for callbacks: `(e) => setToast(...)`, `(c) => ({ ...c, ... })`

**Linting:**
- No ESLint configuration detected
- No Prettier configuration detected
- VS Code settings limited to Peacock color theme customization (`.vscode/settings.json`)

**Spacing:**
- Single space after control keywords: `if (`, `for (`, `while (`
- No space between function name and parentheses for function calls
- Space around operators: `const x = a + b`, `if (x === y)`
- Compact conditional expressions: `x ? yes : no` on single line when brief

## Import Organization

**Order:**
- No module system used; files loaded sequentially in HTML `<script>` tags (`index.html`, lines 110-114)
- Load order critical: helpers → i18n → spells-data-loader → v11-character-editor → v10-hifi
- Comments in HTML explain dependency order: "ORDER MATTERS: helpers define spellName / schoolKey / v8Description that the components call by bare reference"

**Path Aliases:**
- No path aliases; all imports are relative URLs or window global references
- Global namespace pollution accepted by design: functions expose on `window` object when needed
- Example: `Object.assign(window, { spellName, schoolKey, schoolName, ... })` in `grimorio-helpers.jsx`

## Error Handling

**Patterns:**
- Silent try-catch blocks for non-critical operations: localStorage access, focus operations, print dialogs
- Fallback return values: return `null`, `[]`, or `{}` on catch
- Examples from codebase:
  ```javascript
  try { 
    localStorage.setItem(HIFI_CHARS_KEY, JSON.stringify(chars)); 
  } catch (e) {}  // silent fail, no log
  ```
  ```javascript
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed) && parsed.length) return parsed.map(_normChar);
  } catch (e) {}
  return HIFI_DEFAULT_CHARS.map(_normChar);  // fallback to default
  ```

**Guard Clauses:**
- Early returns for invalid state: `if (!toast) return null;`, `if (!list.length) return null;`
- Null/undefined checks with optional chaining: `c?.accentId`, `s?.school`, `navigator.clipboard?.writeText`
- Type checks before operations: `if (!Array.isArray(list)) return [];`, `typeof s.desc === 'string'`

**Validation:**
- Input normalization functions with bounds-checking: `_normSlots`, `_normChar`, `_normClassLevels`
- HTML stripping for user-entered text: `stripHtml(s)` removes tags and normalizes entities
- Math.max/Math.min for clamping values: `Math.max(0, Math.min(9, parseInt(...)))`

## Logging

**Framework:** `console` (no logging library used)

**Patterns:**
- Heavy use of inline code comments (Portuguese) instead of logging
- No runtime logging detected in production code
- Comments explain state transitions and algorithm logic rather than adding debug logs
- Example: "Espaços de magia: totais e gastos por nível (1..9). Guardados como objetos { "1": 4, "3": 2 } — só níveis com valor > 0."

## Comments

**When to Comment:**
- Architectural decisions: "Store persists to localStorage and broadcasts changes via a custom event, so every artboard on the design canvas stays in sync."
- Complex algorithms: Spell slot calculations with multiclass warlock logic
- Intent of design patterns: "Compat: nomes antigos (Catppuccin) → slots semânticos atuais"
- Migration notes: "Migração única: junta as favoritas que estavam salvas por personagem"
- Deliberate simplifications marked with `// ponytail:` comments: "ponytail: metade (paladino/patrulheiro/artífice) conta ceil(L/2) — exato pra classe única, levemente generoso em multiclasse"

**JSDoc/TSDoc:**
- Not used in this codebase; functions documented via inline comments above their definitions
- Example structure: multiline comment block starting with `//` followed by descriptive text

**Section Separators:**
- Use of long dash sequences to organize code: `// ──────────────────────────────────────────────────────────────────`
- Sections named with double-dash prefix: `// ── name: adapted spells carry { pt, en } ──`

## Function Design

**Size:** 
- Mix of small utility functions (1-5 lines) and medium component functions (50-200 lines)
- Small: `tierSymbol(lvl)`, `spellName(s, lang)`, `schoolKey(idx)`
- Medium: React components and complex state management hooks
- Large data transformation functions kept organized with helper functions

**Parameters:**
- Limit to 2-3 main parameters; extra configuration passed as objects
- Default parameters used: `function paletteFor(accentId, theme = 'catppuccin')`
- Optional parameters passed via destructuring: `{ query, filters, onlyPrepared, versionKey }`
- Updater functions passed as callbacks to hooks: `update(prevState => nextState)`

**Return Values:**
- Explicit return types via comments: `// Returns: { id, name, light, dark }`
- Consistent null for empty/falsy cases, never undefined
- Objects returned with spread operator for state updates: `{ ...c, prepared: [...s] }`
- Arrays normalized in helper functions before use

## Module Design

**Exports:**
- No ES6 export/import; functions attached to `window` global when needed
- Private functions stay file-local (underscore prefix indicates this intent)
- Example: `Object.assign(window, { spellName, schoolKey, ... })` exposes public API

**Barrel Files:**
- Not applicable; all modules loaded via `<script>` tags in HTML
- Single point of dependency definition in `index.html`

## Special Patterns

**Deliberate Simplifications (ponytail comments):**
- Marked with `// ponytail:` prefix to indicate intentional shortcuts
- Examples in codebase:
  - Spell slot calculation: "metade (paladino/patrulheiro/artífice) conta ceil(L/2)" — simpler than official floor-based calculation
  - Component memoization: "compara só os props de dados — os callbacks são arrows recriadas" — accepts recreated callbacks to avoid complexity

**State Management:**
- localStorage for persistence: `loadCharacters()` and `persistCharacters()`
- CustomEvent for cross-component communication: `hifi-chars-changed`, `hifi-bookmarks-changed`
- No Redux/Zustand; simple React hooks with localStorage

**i18n Pattern:**
- Centralized i18n dictionary in `i18n.jsx` with `tt(lang, 'key')` function
- Memoization by language: `tt` caches by idiom
- Interpolation syntax: `tt(lang, 'spell.part', { i: 1, n: 3 })`
- Two languages: Portuguese (ptbr) and English (en)

---

*Convention analysis: 2026-07-17*
