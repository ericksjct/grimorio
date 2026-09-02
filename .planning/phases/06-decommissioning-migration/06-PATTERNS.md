# Phase 6: Decommissioning & Migration - Pattern Map

**Mapped:** 2026-09-02  
**Files analyzed:** 7 (6 modified + 1 new component)  
**Analogs found:** 7/7 (100% coverage)

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|---|---|
| `sw.js` | config (service worker) | file-I/O (cache) | existing `sw.js` | exact |
| `spells-data-loader.jsx` | utility (data transformation) | CRUD + transform | existing `spells-data-loader.jsx` | exact |
| `v11-character-editor.jsx` | component (editor) | CRUD + event-driven | existing `v11-character-editor.jsx` | exact |
| `index.html` | config (HTML bootstrap) | file-I/O + component mounting | existing `index.html` | exact |
| `i18n.jsx` | utility (i18n strings) | request-response | existing `i18n.jsx` | exact |
| `transition-banner.jsx` (NEW) | component (banner UI) | state + request-response | `pack-manager.jsx` | role-match |

## Pattern Assignments

### `sw.js` (config, file-I/O)

**Analog:** existing `sw.js`

**Cache version bump pattern** (line 14):
```javascript
const CACHE_VERSION = 'grimorio-v1';
```

When removing JSONs from PRECACHE, follow D-14: **always bump `CACHE_VERSION`** (e.g., `'grimorio-v1'` → `'grimorio-v2'`). This forces old caches to be deleted by the `activate` event (line 65: `keys.filter((k) => k !== CACHE_VERSION)`).

**PRECACHE array structure** (lines 19-50):
```javascript
const PRECACHE = [
  './',
  './index.html',
  './pack-docs.html',
  // ... other files ...
  './spells-5E-2024-PTBR.json',    // Remove this line
  './spells-5E-2014-PTBR.json',    // Remove this line
  './spells-5E-2024-EN.json',      // Remove this line
  './spells-5E-2014-EN.json',      // Remove this line
  './srd-2024-en.json',            // Keep
  './srd-2014-en.json',            // Keep
  // ... vendor libs ...
];
```

Per D-15: Delete the 4 JSON lines as a single atomic commit with the version bump.

---

### `spells-data-loader.jsx` (utility, CRUD + transform)

**Analog:** existing `spells-data-loader.jsx`

**BUILTIN_VERSIONS structure** (lines 31-38):
```javascript
const BUILTIN_VERSIONS = [
  { key: 'srd-2024-en', source: 'fetch', file: 'srd-2024-en.json', lang: 'en', edition: '5e 2024', corpus: 'srd', labelPt: 'SRD 5.2 (EN)', labelEn: 'SRD 5.2 (EN)', short: 'SRD 5.2' },
  { key: 'srd-2014-en', source: 'fetch', file: 'srd-2014-en.json', lang: 'en', edition: '5e 2014', corpus: 'srd', labelPt: 'SRD 5.1 (EN)', labelEn: 'SRD 5.1 (EN)', short: 'SRD 5.1' },
  // Remove the 4 lines below:
  // { key: 'spells-5E-2024-PTBR', ... },
  // { key: 'spells-5E-2014-PTBR', ... },
  // { key: 'spells-5E-2024-EN', ... },
  // { key: 'spells-5E-2014-EN', ... },
];
```

Per D-17: Remove all 4 lines **before the `.slice()`** (line 46). SPELL_VERSIONS is mutated in-place; never reassign.

**Prefs version-key resolver with fallback** (lines 389-395):
```javascript
let prefs = {};
try { prefs = JSON.parse(localStorage.getItem('spellbook-ui-prefs') || '{}') || {}; } catch (e) {}
_wantedVersionKey = urlV || prefs.versionKey || null;
if (urlV && _versionByKey(urlV)) return urlV;
if (prefs.versionKey && _versionByKey(prefs.versionKey)) {
  return prefs.versionKey;
}
```

Per D-04: When `prefs.versionKey` points to a deleted key, map it to the SRD of the same edition:
- `spells-5E-2024-PTBR` / `spells-5E-2024-EN` → `srd-2024-en`  
- `spells-5E-2014-PTBR` / `spells-5E-2014-EN` → `srd-2014-en`

Add this mapping logic **after** line 394:
```javascript
const EDITION_FALLBACK = {
  'spells-5E-2024-PTBR': 'srd-2024-en',
  'spells-5E-2024-EN': 'srd-2024-en',
  'spells-5E-2014-PTBR': 'srd-2014-en',
  'spells-5E-2014-EN': 'srd-2014-en',
};
if (prefs.versionKey && !_versionByKey(prefs.versionKey) && EDITION_FALLBACK[prefs.versionKey]) {
  return EDITION_FALLBACK[prefs.versionKey];
}
```

**adaptSpell function** (lines 295-330):
```javascript
function adaptSpell(s, versionLang, edition) {
  // ... existing code ...
  // Nome: displayName (pt) ou name (en slug)
  const ptName = s.displayName || s.name || '';
  const enName = s.name || '';
  
  return {
    en: enName,
    pt: ptName,
    displayName: ptName,
    // ... rest of return object ...
  };
}
```

Per fold-todo `srd-pack-nomes-slug-e-markdown-cru`: The adaptSpell already uses `displayName` for pt (line 305), but `enName` is assigned the slug (line 306). For SRD packs with valid `displayName`, use it for EN too. Conversions:
- For markdown (`**bold**`, `*italic*`): use minimal conversion. DOMPurify is already loaded (index.html line 107).

**stripHtml function** (lines 258-270):
```javascript
function stripHtml(s) {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
```

This already handles basic HTML cleanup. For markdown in SRD packs (fold-todo), convert `**text**` → `<strong>text</strong>` and `*text*` → `<em>text</em>` **before** calling stripHtml, or extend stripHtml to preserve these as semantic tags.

---

### `v11-character-editor.jsx` (component, CRUD + event-driven)

**Analog:** existing `v11-character-editor.jsx`

**Orphan spells section in filteredSpells** (lines 539-550):
```javascript
// Add a new section AFTER the resolved spells list
const orphanedSpells = prepared.filter(key => !resolvedByKey.has(key)).map(key => {
  // Parse key: "school-lvl-slug"
  const parts = key.split('-');
  if (parts.length < 3) return null;
  const lvl = parseInt(parts[1], 10);
  const slug = parts.slice(2).join('-');
  // Derive school from key (reconstruct from school index)
  return { key, lvl, slug, school: parts[0] };
}).filter(Boolean);
```

Per D-10/D-11: Display orphaned spells in a **separate section** at the end of each tab (prepared/bookmarked) with:
- Heading: Count + label (bilingual via `tt(lang, ...)`), e.g., "2 magias em pacotes não instalados"
- Each row: Title Case slug + level + school icon (same as resolved spells, no data needed from pack)

**Empty state on 985**:
```javascript
// When filteredSpells.orphaned.length > 0, add contextual info about the count
// to the empty state message (not used here, but notify user of orphans available)
```

**loadBookmarks with migration branch** (lines 347-378):
```javascript
// Existing code that handles legacy bookmark migration.
// Per WR-01 (fold-todo): This must be idempotent and called early in boot.
// Do NOT add new persists here; only read + transform existing data.
```

---

### `index.html` (config, file-I/O + component mounting)

**Analog:** existing `index.html`

**UI preferences key and loader** (lines 136-149):
```html
<script type="text/babel">
const UI_PREFS_KEY = 'spellbook-ui-prefs';
const ONBOARDING_SEEN_KEY = 'spellbook-onboarding-v1';
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(UI_PREFS_KEY)) || {}; } catch (e) { return {}; }
}
function savePrefs(p) {
  try { localStorage.setItem(UI_PREFS_KEY, JSON.stringify(p)); } catch (e) {}
}
```

Per D-07: The new `migrationNoticeDismissed` flag **must** be persisted as a field in the `spellbook-ui-prefs` blob, **not** a separate localStorage key:
```javascript
function savePrefs(p) {
  try { 
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify({
      ...p,
      migrationNoticeDismissed: p.migrationNoticeDismissed || false,
    })); 
  } catch (e) {}
}
```

**Component mounting pattern** (lines 124-132):
```html
<script type="text/babel" src="grimorio-helpers.jsx"></script>
<script type="text/babel" src="i18n.jsx"></script>
<script type="text/babel" src="plugin-store.jsx"></script>
<script type="text/babel" src="spells-data-loader.jsx"></script>
<script type="text/babel" src="pack-import.jsx"></script>
<script type="text/babel" src="v11-character-editor.jsx"></script>
<script type="text/babel" src="pack-import-dialog.jsx"></script>
<script type="text/babel" src="pack-manager.jsx"></script>
<script type="text/babel" src="v10-hifi.jsx"></script>
```

Add `transition-banner.jsx` after `pack-manager.jsx` (order: setup helpers → loaders → pack system → UI components).

---

### `i18n.jsx` (utility, request-response)

**Analog:** existing `i18n.jsx`

**Bilingual string pattern** (lines 451-463):
```javascript
const _tCache = {};
function tt(lang, key, vars) {
  const L = normLang(lang);
  if (!_tCache[L]) _tCache[L] = makeT(L);
  return _tCache[L](key, vars);
}

function bilingual(lang) {
  const pt = normLang(lang) === 'ptbr';
  return (ptStr, enStr) => (pt ? ptStr : enStr);
}
```

Per D-08, add new string keys for the transition banner to `STRINGS` object (lines 15-413). Recommended keys:
```javascript
// In STRINGS.ptbr and STRINGS.en:
'migration.bannerHeading': 'Mudanças no Grimório',  // PT-BR
'migration.bannerBody': 'Os pacotes de magias em português foram removidos. Você pode importar seus próprios pacotes.',  // Simplified
'migration.bannerOrphans': '{n} magias em seus personagens estão em pacotes não instalados.',
'migration.openPacks': 'Gerenciar pacotes',
'migration.learnMore': 'Saiba mais',
'migration.dismiss': 'Entendi',
```

Use `tt(lang, 'migration.bannerHeading')` in the banner component and `bilingual(lang)(ptStr, enStr)` for inline PT-BR/EN toggles.

---

### `transition-banner.jsx` (NEW component, state + request-response)

**Analog:** `pack-manager.jsx` (Phase 5, component mounting pattern)

**Root component with window export** (pack-manager.jsx, lines 509-539):
```javascript
function PackManagerRoot({ lang, dark, theme }) {
  const [view, setView] = React.useState('closed');

  React.useEffect(() => {
    const open = () => setView('manager');
    window.__openPackManager = open;
    return () => {
      if (window.__openPackManager === open) delete window.__openPackManager;
    };
  }, []);

  return (
    <>
      <PackManager {...props} />
      <PackImportDialog {...props} />
    </>
  );
}

Object.assign(window, { PackManager, PackManagerRoot });
```

Create `TransitionBannerRoot` following this pattern:
1. Manage banner visibility in local state: `dismissed` (read from prefs on init)
2. Export a global dismissal function or handle it via local button click
3. Register the component on `window` (for consistency with pack-manager pattern)
4. Return the banner **only if**:
   - User is existing (D-06): has `prefs.versionKey` in {4 deleted keys} **or** `hifi_chars_v1` not empty **or** `hifi_bookmarks_v1` not empty
   - AND `!prefs.migrationNoticeDismissed`
   - AND orphan count > 0 (from `pack-manager.jsx`'s `packSpellIndex()`, line 159)

**Banner UI structure** (D-08, non-technical guidance; adapt hifi-tokens.css classes):
```javascript
function TransitionBanner({ lang, dark, theme, orphanCount, onDismiss }) {
  return (
    <div className={`hifi ${dark ? 'hifi-dark' : 'hifi-light'}`} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      padding: '12px 16px', borderBottom: '1px solid var(--surface1)',
      background: 'var(--mantle)', color: 'var(--text)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>
            {tt(lang, 'migration.bannerHeading')}
          </h3>
          <p style={{ margin: '0 0 8px', fontSize: 14 }}>
            {tt(lang, 'migration.bannerBody')}
          </p>
          {orphanCount > 0 && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--subtext0)' }}>
              {tt(lang, 'migration.bannerOrphans', { n: orphanCount })}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="hifi-btn-primary" onClick={() => window.__openPackManager?.()}>
              {tt(lang, 'migration.openPacks')}
            </button>
            <a href="pack-docs.html" target="_blank" rel="noopener" className="hifi-btn-secondary" 
               style={{ textDecoration: 'none' }}>
              {tt(lang, 'migration.learnMore')}
            </a>
          </div>
        </div>
        <button className="hifi-btn-ghost" onClick={onDismiss} title={tt(lang, 'nav.close')}>
          ✕
        </button>
      </div>
    </div>
  );
}
```

---

## Shared Patterns

### localStorage + prefs persistence
**Source:** `index.html` (lines 136-149) + `spells-data-loader.jsx` (lines 391)  
**Apply to:** transition-banner.jsx, any new preference flag  

Pattern:
```javascript
// Read (defensive)
let prefs = {};
try { prefs = JSON.parse(localStorage.getItem('spellbook-ui-prefs') || '{}') || {}; } catch (e) {}

// Write (also defensive)
function savePrefs(p) {
  try { localStorage.setItem('spellbook-ui-prefs', JSON.stringify(p)); } catch (e) {}
}
```

**Never** create a separate localStorage key for a UI preference — extend the `spellbook-ui-prefs` blob instead.

### CustomEvent pattern for global state
**Source:** `spells-data-loader.jsx` (line 425, line 158)  
**Apply to:** Banner dismissal, orphan count updates  

```javascript
// Dispatch
window.dispatchEvent(new CustomEvent('hifi-spells-source-changed', { detail: key }));
window.dispatchEvent(new CustomEvent('hifi-plugins-changed', { detail: entries.length }));

// Listen
window.addEventListener('hifi-spells-source-changed', (e) => console.log('Version changed:', e.detail));
return () => window.removeEventListener('hifi-spells-source-changed', handler);
```

When orphan count changes (pack installed/removed), dispatch:
```javascript
window.dispatchEvent(new CustomEvent('hifi-migration-orphans-changed', { detail: orphanCount }));
```

### hifiSpellKey resolution
**Source:** `v10-hifi.jsx` (line 9)  
**Apply to:** Orphan spell identification  

```javascript
function hifiSpellKey(s) { return `${s.school}-${s.lvl}-${s.en}`; }
```

To identify orphans, parse the key in reverse:
```javascript
const keyParts = key.split('-'); // e.g., "4-1-acid-splash" → ["4", "1", "acid", "splash"]
const school = parseInt(keyParts[0], 10); // school index (0-7)
const lvl = parseInt(keyParts[1], 10);   // spell level
const slug = keyParts.slice(2).join('-'); // spell name (en)
```

---

## Static Gate-Script Test Pattern

**Source:** `scripts/check-browser-language-detection.tests.ps1`  
**Apply to:** Verification of new migration logic  

```powershell
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$index = Get-Content -Raw -LiteralPath $indexPath

# Test 1: Key exists
if ($index -notmatch 'migrationNoticeDismissed') {
  throw 'Migration notice dismissal flag not found in index.html'
}

# Test 2: Prefs integration
if ($index -notmatch 'spellbook-ui-prefs') {
  throw 'UI prefs key not found'
}

# Test 3: String keys exist (in i18n.jsx)
$i18nPath = Join-Path $repoRoot 'i18n.jsx'
$i18n = Get-Content -Raw -LiteralPath $i18nPath
if ($i18n -notmatch "'migration\.bannerHeading'") {
  throw 'Migration i18n keys not found'
}

Write-Output 'Migration pattern checks passed.'
```

Save as `scripts/check-migration-phase6-structure.tests.ps1`.

---

## No Analog Found

All files have close analogs in the existing codebase. No placeholder implementations needed.

---

## Metadata

**Analog search scope:**  
- Modified files: searched existing analogs in-place  
- New component (`transition-banner.jsx`): closest match is `pack-manager.jsx` (component mounting + state + i18n)

**Files scanned:** 7  
**Pattern extraction complete:** Yes  

**Key dependencies for planner:**
- The 4 JSONs (spells-5E-*.json) are **removed** in a single atomic commit (D-15), forcing `CACHE_VERSION` bump.
- `filteredSpells()` must filter orphans **separately** from resolved spells (D-11).
- The banner appears **only for existing users** with specific signals (D-06) and can be dismissed **once per device** (D-07).
- All new UI strings go into `i18n.jsx` STRINGS blob (bilingual pattern, no new localStorage keys).
- Fallback mapping for deleted versions is in `spells-data-loader.jsx`, not runtime (D-04).
