# Phase 5: Plugin Manager UI & Version Selector - Pattern Map

**Mapped:** 2026-08-27
**Files analyzed:** 5 (1 new, 4 modified)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `pack-manager.jsx` (new — `PackManager` modal) | component (modal) | CRUD (list/read/delete over pluginStore) | `pack-import-dialog.jsx` (`PackImportDialog`) | exact (same dialog chrome/a11y/close pattern) |
| `spells-data-loader.jsx` (`VersionSelector`, ~L573-640) | component (dropdown) | CRUD (read) | itself, both branches (`compact`/desktop) | exact — extend, don't replace |
| `v10-hifi.jsx` (drawer VERSÃO section, ~L2548-2572) | component (drawer section) | CRUD (read) | itself (`HifiSectionLabel` + `HifiPill` block) | exact — extend, don't replace |
| `pack-import-dialog.jsx` (`PackImportRoot`, L277-293) | component (root/trigger) | request-response | itself | exact — remove floating trigger (D-03), keep `PackImportDialog` as sibling dialog opened from `PackManager` |
| `i18n.jsx` (new strings) | config (dictionary) | CRUD (static) | itself, `import.*` key block (ptbr L176, en L348) | exact |
| `index.html` (script tag) | config (load order) | n/a | existing `<script>` list L126-131 | exact |
| `scripts/check-pack-manager.tests.ps1` (new) | test | request-response (string-match assertions) | `scripts/check-pack-import-dialog.tests.ps1` | exact |

## Pattern Assignments

### `pack-manager.jsx` (new component, modal, CRUD)

**Analog:** `pack-import-dialog.jsx` — `PackImportDialog` (full file read, 294 lines).

**Header comment convention** (lines 1-14): every top-level module opens with a comment block stating what the module "possui"/"não possui" and its load-order contract. Copy this shape for `pack-manager.jsx`, e.g. "possui `PackManager` (lista, remoção inline, atribuição CC-BY, empty state); não possui import/validação — delega a `PackImportDialog`."

**Dialog chrome + a11y pattern** (lines 44-68, 131-169):
```javascript
function PackImportDialog({ lang, dark, theme, open, onClose }) {
  ...
  const dialogRef = React.useRef(null);
  window.useDialogA11y?.(dialogRef, open, onClose);
  ...
  if (!open) return null;
  const themeClass = `hifi ${dark ? 'hifi-dark' : 'hifi-light'}${theme && theme !== 'catppuccin' ? ' hifi-theme-' + theme : ''}`;
  return (
    <div className={themeClass} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }} onClick={onClose}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={tt(lang, 'import.title')} tabIndex={-1} onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--base)', color: 'var(--text)', border: '1px solid var(--surface1)', borderRadius: 8, boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}>
        <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--surface1)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>{tt(lang, 'import.title')}</h2>
          <button type="button" className="hifi-btn-ghost" onClick={onClose}>{tt(lang, 'import.close')}</button>
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* body */}
        </div>
        <footer style={{ flexShrink: 0, padding: 16, borderTop: '1px solid var(--surface1)' }}>{/* primary action */}</footer>
      </section>
    </div>
  );
}
```
`PackManager` must reuse this exact skeleton (zIndex 100, `useDialogA11y`, `role="dialog"`, header/body/footer split). Use `zIndex: 100` for `PackManager` and note `PackImportDialog` opened from within it will stack at the same z-index — D-04/D-05 says one overlay level at a time in practice (import dialog replaces manager's view rather than stacking); confirm in plan whether `PackManager` unmounts/hides while `PackImportDialog` is open, or use `useDialogA11y`'s own return-focus handling for both since only one is ever visually open.

**List + CRUD read pattern (listPacks/deletePack):** `plugin-store.jsx` lines 112-121:
```javascript
async function listPacks() {
  const records = await _tx('readonly', (store) => store.getAll());
  return (records || []).filter((r) => r && r.meta).map((r) => r.meta);
}

async function deletePack(id) {
  await _tx('readwrite', (store) => store.delete(id));
}
```
`PackManager` calls `window.pluginStore.listPacks()` to render rows, and on confirmed removal calls `window.pluginStore.deletePack(id)` **then** `window.refreshPluginVersions()` — copy the exact sequencing/catch pattern from `pack-import-dialog.jsx` lines 107-110:
```javascript
if (typeof window.refreshPluginVersions === 'function') {
  window.refreshPluginVersions().catch(e =>
    console.warn('[pack-manager] refreshPluginVersions falhou após remover:', e));
}
```
This is the "first write from UI outside import" callsite noted in CONTEXT.md — the `_refreshChain` queue in `spells-data-loader.jsx` (lines 104-115) already serializes concurrent calls; no new serialization needed in `pack-manager.jsx`.

**Toast pattern** (`pack-import-dialog.jsx` line 97):
```javascript
window.dispatchEvent(new CustomEvent('hifi-toast', { detail: { msg: tt(lang, 'import.success', { identifier: res.identifier }) } }));
```
Copy this for the D-08 removal-feedback toast (no undo), e.g. `tt(lang, 'manager.removed', { name })`.

**Live re-render on `hifi-plugins-changed`:** `pack-manager.jsx` should subscribe with `React.useEffect` + `window.addEventListener('hifi-plugins-changed', ...)` and re-run `listPacks()` — no existing exact analog for the listener side (the *dispatch* side lives in `spells-data-loader.jsx`'s `_refreshPluginVersionsInner`), but the subscribe/cleanup shape is standard React and needs no borrowed pattern; grep `hifi-plugins-changed` in `spells-data-loader.jsx` for the dispatch contract before wiring.

**Sibling dialog composition (D-04):** `PackManager` renders a "Importar pacote" button that sets local `importOpen` state and mounts `<PackImportDialog lang={lang} dark={dark} theme={theme} open={importOpen} onClose={() => setImportOpen(false)} />` exactly as `PackImportRoot` does today (lines 277-292) — just move the trigger from a fixed floating button into the manager's body/empty-state.

**Inline confirm-in-row pattern (D-05):** no direct analog exists in this codebase (no existing two-state inline confirm button). Nearest structural precedent is the `mode` toggle in `PackImportDialog` (lines 45, 70-76, `switchMode`) — a local per-row `React.useState(false)` "confirming" flag toggled the same way, swapping button label/class between `hifi-btn-secondary` "Remover" and a `Sim`/`Não` pair, is the natural extension; call this out in the plan as new code, not borrowed.

**Empty state text + docs link pattern** (`pack-import-dialog.jsx` lines 188-197):
```javascript
<h3 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, margin: '0 0 8px' }}>{tt(lang, 'import.emptyHeading')}</h3>
<p style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.5, margin: '0 0 16px' }}>
  {tt(lang, 'import.emptyBody')}{' '}
  {tt(lang, 'import.docsPrefix')}
  <a href="pack-docs.html" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>{tt(lang, 'import.docsLink')}</a>.
</p>
```
Copy this shape verbatim for D-16's empty state (new i18n keys, same `pack-docs.html` link, same `hifi-btn-primary` "Importar pacote" CTA below it).

**CC-BY attribution collapsible block (D-12/D-13/D-14):** no existing `<details>`/collapsible component in the codebase (checked `v10-hifi.jsx`, `v11-character-editor.jsx` — none found). Plan should use a plain `<details><summary>` (native HTML disclosure, no library, no custom expand/collapse state needed — matches the no-build/no-new-dependency architecture) with the attribution text rendered as `{meta.attribution}` directly inside a text node (never `dangerouslySetInnerHTML` — D-14 requires verbatim text, not markdown, and React already escapes string children by default, which is the correct/simplest way to satisfy "no HTML sanitization surface").

**Error/validation reference** (`pack-import.jsx` line 63 meta schema, line 327 `META_LICENSE_TEXT_FIELDS`) — read-only reference for what shape `meta.attribution`/`meta.modifications` already have; `pack-manager.jsx` does no new validation, only display.

---

### `spells-data-loader.jsx` — `VersionSelector` (extend in place, lines 573-640)

**Analog:** itself (desktop branch lines ~618-640, mobile `compact` branch lines ~584-616).

**Dropdown item mapping pattern** (desktop, lines 630-638):
```javascript
{versions.map(v => (
  <button key={v.key} onClick={() => { onChange(v.key); setOpen(false); }} className="hifi-btn-ghost"
    style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '8px 12px', textAlign: 'left', color: v.key === current ? 'var(--accent)' : 'var(--text)' }}>
    <span style={langDot(v)}/>
    <span style={{ flex: 1 }}>{lang === 'ptbr' ? v.labelPt : v.labelEn}</span>
    {v.key === current && <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, color: 'var(--accent)' }}>✓</span>}
  </button>
))}
```
D-02's "Gerenciar pacotes…" desktop item is one more `<button>` appended after this `.map()`, preceded by a `<div style={{ borderTop: '1px solid var(--surface1)', margin: '4px 0' }}/>` separator (no existing separator element in this file — plain divider div is the minimal option, matches inline-style convention). The new item calls a prop like `onOpenManager` passed down from the app root, then `setOpen(false)`.

**Risk guard (D-19) — MUST FIX as part of this phase's touch of this function:**
```javascript
// line 574 (desktop) and mobile compact branch use the same expression:
const currentVer = versions.find(v => v.key === current) || versions[0];
```
`versions[0]` is `undefined` when `versions` is empty, and `currentVer.lang` is dereferenced immediately after (line 578 in desktop `langDot`/label usage, and inside `compact` branch too). Any new empty-list-capable surface (the packs list inside `PackManager`, not `VersionSelector` itself since `BUILTIN_VERSIONS` never empties) must not copy this guardless pattern — add an explicit empty check before any `.find()||[0]` array access in `pack-manager.jsx`.

---

### `v10-hifi.jsx` — Drawer VERSÃO section (extend in place, lines 2548-2572)

**Analog:** itself.

**Section label + pill list pattern** (lines 2548-2572, already excerpted above): `HifiSectionLabel` wraps the `tt(lang, 'version.label')` heading, followed by a flex-wrap row of `HifiPill` per version. D-02's mobile "Gerenciar pacotes" row is a **new line below the pills, inside the same section `<div>`**, not another pill (per context: "seguindo o padrão `HifiSectionLabel` + conteúdo já usado nas outras seções" — i.e., keep the section boundary, add a row). Closest concrete row-button precedent in the same drawer is the "section.tools" icon-button row a few lines below (lines ~2576-2593):
```javascript
<button
  onClick={() => window.__shareBuild && window.__shareBuild()}
  className="hifi-icon-btn"
  title={tt(lang, 'action.shareBuild')}
  style={{ fontSize: 13, background: 'var(--surface1)' }}
>↗</button>
```
For a full-width text row instead of icon button, use `hifi-btn-secondary` at `width: '100%'` similar to the desktop dropdown item style shown above, and close the drawer (`setDrawerOpen(false)`) then open `PackManager` — mirror the `switchVersion` pill's `onClick` shape (`() => { ...; setDrawerOpen(false); showToast(...) }` at lines 2554-2560) minus the toast.

---

### `pack-import-dialog.jsx` — remove `PackImportRoot` floating trigger (D-03)

**Target for deletion:** lines 277-293, entire `PackImportRoot` function including the `ponytail:` comment at lines 281-283 that explicitly marks it for removal in Phase 5. `PackImportDialog` (lines 44-275) itself is untouched and becomes the sibling dialog opened by `PackManager` (see pattern above). Whatever currently instantiates `<PackImportRoot .../>` in `index.html` or `v10-hifi.jsx` mount code must instead render `<PackManager .../>` (or nothing, if `PackManager` is mounted from the app root and owns its own `PackImportDialog` instance) — grep `PackImportRoot` usage sites before editing.

---

### `i18n.jsx` — new strings

**Analog:** existing `import.*` key block, `ptbr` object starting line ~176, `en` object starting line ~348 (mirrored 1:1, verified by `i18nParityCheck()` at line 419).

**Pattern:** every new UI string needs a matching key in both the `ptbr` and `en` dictionaries or `i18nParityCheck` fails (referenced in CONTEXT.md canonical refs). New keys needed: `manager.*` (title, list item fields, remove-confirm inline text, impact count, attribution disclosure label, empty state heading/body — mirror `import.emptyHeading`/`import.emptyBody` naming), `version.manage` (the "Gerenciar pacotes…" label used in both `VersionSelector` and the drawer). Add each key to both blocks in the same edit/commit.

---

### `index.html` — script load order

**Analog:** existing script list, lines 126-131:
```html
<script type="text/babel" src="plugin-store.jsx"></script>
<script type="text/babel" src="spells-data-loader.jsx"></script>
<script type="text/babel" src="pack-import.jsx"></script>
<script type="text/babel" src="v11-character-editor.jsx"></script>
<script type="text/babel" src="pack-import-dialog.jsx"></script>
<script type="text/babel" src="v10-hifi.jsx"></script>
```
Per CONTEXT.md's Integration Points, `pack-manager.jsx` loads **after** `pack-import-dialog.jsx` (needs `PackImportDialog`) and **before** `v10-hifi.jsx` (which needs `window.PackManager` to mount it from the drawer/dropdown):
```html
<script type="text/babel" src="pack-import-dialog.jsx"></script>
<script type="text/babel" src="pack-manager.jsx"></script>
<script type="text/babel" src="v10-hifi.jsx"></script>
```

---

### `scripts/check-pack-manager.tests.ps1` (new test)

**Analog:** `scripts/check-pack-import-dialog.tests.ps1` (full file pattern, ~8.3K, string-match style).

**Core pattern** (lines 1-30 of analog):
```powershell
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$dialogPath = Join-Path $repoRoot 'pack-import-dialog.jsx'
$i18nPath = Join-Path $repoRoot 'i18n.jsx'
$dialog = Get-Content -Raw -LiteralPath $dialogPath
$i18n = Get-Content -Raw -LiteralPath $i18nPath

foreach ($needle in @(
  'function PackImportDialog',
  'role="dialog"',
  'aria-modal="true"',
  'useDialogA11y',
  ...
)) {
  if ($dialog -notlike "*$needle*") {
    throw "Missing pack-import-dialog.jsx implementation detail: $needle"
  }
}
```
`check-pack-manager.tests.ps1` follows the identical shape: assert presence of `function PackManager`, `role="dialog"`, `useDialogA11y`, `pluginStore.listPacks`, `pluginStore.deletePack`, `refreshPluginVersions`, `hifi-toast`, `meta.attribution`, i18n key parity for new `manager.*`/`version.manage` keys, and (per D-03) assert `PackImportRoot` and its `ponytail:` marker comment are **absent** from `pack-import-dialog.jsx` (inverse `-notlike` check). Must be registered in `scripts/run-tests.ps1` alongside the other `check-*.tests.ps1` files (grep that file for the array/list of test scripts before adding).

## Shared Patterns

### Dialog chrome + accessibility
**Source:** `pack-import-dialog.jsx` lines 44-68, 131-169; `useDialogA11y` defined `v11-character-editor.jsx:408`
**Apply to:** `PackManager` modal root.
```javascript
const dialogRef = React.useRef(null);
window.useDialogA11y?.(dialogRef, open, onClose);
```

### Toast feedback
**Source:** `pack-import-dialog.jsx` line 97, 116
**Apply to:** removal success/failure feedback in `PackManager` (D-08, no undo).
```javascript
window.dispatchEvent(new CustomEvent('hifi-toast', { detail: { msg, kind: 'err' /* omit kind for success */ } }));
```

### Post-write refresh sequencing
**Source:** `pack-import-dialog.jsx` lines 107-110; queue mechanics in `spells-data-loader.jsx` lines 104-115 (`_refreshChain`)
**Apply to:** any write path in `PackManager` (`deletePack` today; nothing else per D-07's prohibition on touching character `prepared`/`bookmarked` keys).
```javascript
if (typeof window.refreshPluginVersions === 'function') {
  window.refreshPluginVersions().catch(e => console.warn('[pack-manager] refreshPluginVersions falhou:', e));
}
```

### i18n parity
**Source:** `i18n.jsx` `ptbr`/`en` blocks (lines ~176, ~348), `i18nParityCheck()` line 419
**Apply to:** all new UI copy across `pack-manager.jsx`, `VersionSelector`, drawer VERSÃO section.

### Empty-array `.find()`/`[0]` guard risk (D-19)
**Source:** `spells-data-loader.jsx` line 574 (`VersionSelector`), the exact anti-pattern to avoid
**Apply to:** any new list rendering in `pack-manager.jsx` that can legitimately be empty (installed-packs list). Always branch on `.length === 0` before indexing/deref, never rely on `|| arr[0]` alone.

## No Analog Found

| File/Feature | Role | Data Flow | Reason |
|---|---|---|---|
| Inline confirm-in-row ("Remover? Sim / Não", D-05) | component fragment | request-response | No existing two-state inline confirm toggle in codebase; nearest precedent is `PackImportDialog`'s `mode` state toggle (structurally similar, not a direct copy) |
| CC-BY attribution collapsible block (D-12) | component fragment | display-only | No `<details>`/accordion component exists yet; use native `<details><summary>`, no library needed |
| Duplicate-spell note in spell detail (D-09) | component fragment | CRUD (read, derived) | Spell detail view file not in the phase's known-analog list; locate the spell-detail render function in `v10-hifi.jsx` or `v11-character-editor.jsx` during planning and confirm exact insertion point under "Fonte" |

## Metadata

**Analog search scope:** `pack-import-dialog.jsx`, `plugin-store.jsx`, `spells-data-loader.jsx`, `v10-hifi.jsx`, `v11-character-editor.jsx`, `i18n.jsx`, `index.html`, `scripts/check-pack-import-dialog.tests.ps1`
**Files scanned:** 8 direct reads + grep sweeps across `.jsx`/`.ps1`
**Pattern extraction date:** 2026-08-27
