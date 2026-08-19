---
phase: 04-loader-integration-source-dispatch
reviewed: 2026-08-18T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - spells-data-loader.jsx
  - v10-hifi.jsx
  - index.html
  - plugin-store.jsx
  - pack-import-dialog.jsx
  - i18n.jsx
  - sw.js
  - scripts/check-source-dispatch.tests.ps1
  - scripts/check-plugin-store.tests.ps1
  - scripts/check-pack-wiring.tests.ps1
  - scripts/check-edition-compare.tests.ps1
  - scripts/check-loader-hardening.tests.ps1
  - scripts/qa-fixtures/hostile-html.json
findings:
  critical: 3
  warning: 6
  info: 8
  total: 17
status: issues_found
---

# Phase 4: Code Review Report (round 3)

**Reviewed:** 2026-08-18
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Third pass. The mandate was not to re-audit the closed findings but to ask whether 13 fixes
landed in one sweep introduced anything new. Two of them did, and one prior finding got worse
because of a fix that landed beside it.

Evidence method: every behavioural claim below was verified by executing the real registry in
Node, and every test-coverage claim by mutating a sandbox copy of the repo and re-running all 24
`scripts/check-*.tests.ps1`. Nothing here is inferred from reading alone.

**What is genuinely sound and should not be touched:**

- **The WR-02 in-flight guard does not deadlock or poison itself.** `.finally()` clears
  `_refreshInFlight` on both the resolve and the reject path, so a rejected enumeration cannot
  wedge the guard the way the memo WR-11 removed from `loadAllVersions` could. The only `await`
  inside the inner function is `listPacks()`, whose hang case is `openDB()`'s own memo — present
  with or without this guard. It does have a different defect (WR-01 below), but not that one.
- **WR-04's `getSpells()` throw is fully contained.** `loadVersion` is the only caller; the call
  sits inside the `_pending[key]` try/catch, which converts it to `[]` + a `toast.loadFailed`
  and deliberately does not cache the failure. No unhandled rejection, no blank screen.
- **WR-05's `school: null` is safe at every consumer.** `schoolKey`, `schoolName`,
  `HIFI_SCHOOL_FX_VARS[idx]` and `V8_DESCRIPTIONS_PT[idx]` all carry `||` fallbacks;
  `hifiFilterConfig.school.get` routes through `schoolKey`. `grimorio-helpers.jsx`'s
  Evocação default is *not* newly reachable: before WR-05 the loader already substituted `4`
  for an unknown school, so the rendered result is byte-identical. All six bundled JSONs use
  English school names that resolve, so `null` only ever comes from a BYOD pack. `hifiSpellKey`
  now emits `"null-3-Fireball"` for those, which churns their prepared/bookmark keys — but
  changing the key format now would invalidate *every* existing key, so leaving it is correct.
- **WR-05's `edition: ''` is safe.** `useEditionCompare` guards on `cur.edition` and on
  `v.edition`; both render sites use `s.edition ? ... : ''`.
- **CR-01's URL key whitelist rejects nothing legitimate.** All ten filter keys are static in
  `hifiFilterConfig`; the "+ mais" feature only re-exposes those same keys — nothing registers a
  filter key at runtime. Verified against `hifiShareViewUrl`, which emits only `class`/`level`/`school`.
- **Re-import cannot serve stale cached spells.** `freeIdentifier` allocates a new id, so a
  re-import never collides with a cached `plugin-*` key. The `!newKeys.has(key)` eviction is right.
- **i18n key parity is clean.** Every literal key used in `.jsx`/`.html` exists in both
  dictionaries, and every dynamically-built key (`ability.*`, `stats.*`, `noun.spell.*`,
  `packErr.*`) has full coverage.

## Critical Issues

### CR-01: WR-01's guard makes *all* preference persistence hostage to a version key that may never resolve

**File:** `index.html:478-481`, `spells-data-loader.jsx:99-109,152-156,678`

**Issue:** WR-01 gated the entire prefs-persistence effect on `hasPendingSpellVersion()`, but
that flag guards one field (`versionKey`) while suppressing the write of five (`dark`, `theme`,
`characterName`, `lang`, `versionKey`). `savePrefs` has exactly one call site, so when the flag
sticks, nothing is ever persisted again for the rest of the session — silently.

`_wantedVersionKey` is set unconditionally at loader init (`_initialVersionKey`, line 366) to
`urlV || prefs.versionKey || null`, and is cleared in only two places: the consume block at
line 152, and `setCurrentVersion` on an *effective* change. Two easily-reached states leave it set forever:

1. **A shared link.** `hifiShareViewUrl` writes `?v=` with whatever version is active, including
   `plugin-<id>`. Open that link on any device that does not have the pack: `_wantedVersionKey`
   is set to a key that will never resolve, `hasPendingSpellVersion()` stays `true`, and the
   recipient's dark-mode toggle, theme, active character and language stop persisting.
2. **IndexedDB unavailable.** `_refreshPluginVersionsInner` returns at line 100 (no
   `window.pluginStore`) or line 108 (`listPacks()` rejected — Firefox private browsing, storage
   blocked, `onblocked` from a second tab) *before* reaching the consume block at line 152. On any
   returning visit `_wantedVersionKey` is just the saved builtin key, which would have resolved
   instantly — but the early return means it is never even looked at. Every user in that state
   silently loses all preference persistence.

**Fix:** narrow the guard to the one field it is about, and clear the pending key on the
early-return paths so a failed enumeration cannot strand it.

```jsx
// index.html
React.useEffect(() => {
  const prev = loadPrefs();
  savePrefs({
    ...prev, dark, theme, characterName: character ? character.name : null, lang,
    // WR-01: só o versionKey espera o retry do loader; o resto persiste sempre.
    versionKey: window.hasPendingSpellVersion?.() ? (prev.versionKey ?? versionKey) : versionKey,
  });
}, [dark, theme, character, lang, versionKey]);
```

```js
// spells-data-loader.jsx — os dois early returns
if (!window.pluginStore || typeof window.pluginStore.listPacks !== 'function') {
  console.warn('[spells-data-loader] pluginStore ausente — nenhum pack enumerado.');
  _wantedVersionKey = null;   // não deixa uma preferência pendurada pra sempre
  return [];
}
```

### CR-02: the PT⇄EN footer toggle sends PHB readers into the SRD — the exact hazard WR-07 fixed next door

**File:** `v10-hifi.jsx:436-449`

**Issue:** WR-06 rewrote these lines to use the declared `edition` instead of a regex on the key,
but did not apply the `corpus` preference WR-07 introduced in the same pass for the sibling call
site. `versions.find()` respects registry order, and SRD occupies indices 0-1, so the first
`lang === 'en' && edition === '5e 2024'` match is always `srd-2024-en`.

Executed against the real `BUILTIN_VERSIONS`:

```
spells-5E-2024-PTBR    -> PT: spells-5E-2024-PTBR | EN: srd-2024-en      <-- should be spells-5E-2024-EN
spells-5E-2014-PTBR    -> PT: spells-5E-2014-PTBR | EN: srd-2014-en      <-- should be spells-5E-2014-EN
spells-5E-2024-EN      -> PT: spells-5E-2024-PTBR | EN: srd-2024-en
```

A reader on PHB 2024 PT-BR (391 spells) who clicks **EN** lands in SRD 5.2 (339 spells) — a
different corpus, 72 spells fewer, with no warning — and can never reach PHB 2024 EN (411) via
the toggle at all. WR-07's own comment names this precisely: *"SRD fica nos índices 0-1 do
registro, então `find` sozinho oferecia SRD 5.1"*. The fix stopped at `useEditionCompare`.

**Fix:** reuse the same preference the comparator already uses.

```jsx
const sameCorpus = (l) => (v) => v.lang === l && v.edition === curEdition && v.corpus === cur.corpus;
const anyCorpus  = (l) => (v) => v.lang === l && v.edition === curEdition;
const pt = curEdition ? (versions.find(sameCorpus('ptbr')) || versions.find(anyCorpus('ptbr')) || null) : null;
const en = curEdition ? (versions.find(sameCorpus('en'))   || versions.find(anyCorpus('en'))   || null) : null;
```

### CR-03: a crafted `?build=` link hangs the tab — the payload reaches React state unnormalized

**File:** `index.html:216-233`, `v11-character-editor.jsx:276-296`, `v10-hifi.jsx:507`

**Issue:** `importSharedBuildUrl` takes `slots` straight off the base64 payload
(`slots: build.slots || { total: {}, used: {} }`) with no validation, then calls
`persistCharacters([...chars, character])`. `persistCharacters` dispatches `HIFI_CHARS_EVENT`
with the **raw** array, and `useCharacters`'s listener does `setChars(e.detail)` — bypassing the
`_normChar` clamp that `loadCharacters()` and `update()` both apply. The raw character is what
renders, so `HifiSlotTracker` reaches:

```jsx
const total = slots.total[lvl];
Array.from({ length: total }, (_, i) => ...)   // v10-hifi.jsx:507
```

A link carrying `slots: { total: { "1": 1e9 } }` allocates a billion React elements and hangs the
tab. The `?build=` effect in `App` fires on **any** visit, before onboarding, so a single shared
URL is enough. `HifiSessionMode:1946` has the same shape.

Pre-existing — not introduced by this round's fixes — but it lives in a reviewed file and the
fix is one line at the single choke point that both the write and the event pass through.

**Fix:**

```js
// v11-character-editor.jsx
function persistCharacters(chars) {
  const safe = (chars || []).map(_normChar);   // nenhum caminho grava/emite personagem cru
  try { localStorage.setItem(HIFI_CHARS_KEY, JSON.stringify(safe)); } catch (e) {}
  window.dispatchEvent(new CustomEvent(HIFI_CHARS_EVENT, { detail: safe }));
}
```

## Warnings

### WR-01: `refreshPluginVersions()` coalesces, it does not serialize — a queued refresh can be dropped

**File:** `spells-data-loader.jsx:91-96`

**Issue:** The commit message says *serializar*, but the guard returns the **already-running**
promise to every later caller. That promise performed its `listPacks()` read *before* the later
caller's write. The dedup idiom borrowed from `_pending` is correct for a pure read keyed by an
immutable key; it is wrong for a read that must observe a write which happened after it started.

Concretely: import pack A → `handleSubmit` fires `refreshPluginVersions()` without awaiting →
while that enumeration is in flight, pack B's `putPack` commits → B's
`refreshPluginVersions()` returns A's promise → **B is never enumerated**, never appears in the
selector, and no error is shown. Same for the pending-preference consume at line 152, which then
runs against a stale enumeration. Self-heals only on reload.

**Fix:** chain instead of coalescing — same guarantee, no dropped run.

```js
// ponytail: fila de um, não dedup. Cada chamada observa o estado depois da anterior.
let _refreshChain = Promise.resolve([]);
function refreshPluginVersions() {
  _refreshChain = _refreshChain.catch(() => {}).then(_refreshPluginVersionsInner);
  return _refreshChain;
}
```

### WR-02: `check-edition-compare`'s "prova de execução" is a tautology — WR-07 can be fully reverted with all 24 scripts green

**File:** `scripts/check-edition-compare.tests.ps1:73,86-95`

**Issue:** Proven by mutation, not by reading. Removing `versions.find(sameCorpus) ||` from
`v10-hifi.jsx:1043` — a complete revert of WR-07's behaviour, leaving `sameCorpus` as dead code —
leaves the entire suite green:

```
MUT: WR-07 corpus preference no longer used (sameCorpus left dead)
  check-edition-compare.tests.ps1 :: "Edition comparator matches by declared edition..."  [PASS]
  ...all 24 scripts green
```

Two independent reasons:

1. The structural assertion at line 73 greps `$fnBody` for `v.corpus === cur.corpus`. That
   substring survives in the now-unused `sameCorpus` definition line.
2. The Node harness at lines 86-95 **re-implements** the selection expression inline instead of
   reading it out of `v10-hifi.jsx`. It reads `BUILTIN_VERSIONS` from the real file but the logic
   under test is a copy, so it can never observe a change to the production expression. It is a
   test of itself.

This is the WR-12 defect class: an assertion that cannot fail for the reason it claims.

**Fix:** extract the `other` expression from `v10-hifi.jsx` and `eval` it, the same way
`BUILTIN_VERSIONS` is already extracted from the loader:

```js
const ui = fs.readFileSync('v10-hifi.jsx', 'utf8');
const sel = ui.match(/const sameCorpus = [\s\S]*?const other = [\s\S]*?: null;/)[0];
const versions = BUILTIN_VERSIONS;
const cur = versions.find(v => v.key === 'spells-5E-2024-EN');
const other = eval('(() => { ' + sel + ' return other; })()');
```

and assert `v.corpus === cur.corpus` appears in the `const other = ...` expression itself, not
merely somewhere in the function body.

### WR-03: 10 of the 13 round-2 fixes have no regression coverage at all

**File:** `scripts/check-source-dispatch.tests.ps1`, `scripts/check-loader-hardening.tests.ps1`, `scripts/check-edition-compare.tests.ps1`

**Issue:** Each fix was reverted in a sandbox copy and all 24 `check-*.tests.ps1` re-run.
Results:

| fix | reverted → suite |
|---|---|
| CR-01 (hifiFilterConfig prototype-less) | **caught** |
| CR-01 (URL key whitelist, `v10-hifi.jsx:807`) | undetected |
| WR-01 (`hasPendingSpellVersion` guard) | undetected |
| WR-02 (in-flight guard) | **caught** |
| WR-03 (`_versionByKey(key)` before caching) | undetected |
| WR-04 (`getSpells` throws) | undetected |
| WR-05 (`school: null` / `edition: ''`) | undetected |
| WR-06 (`HifiLangToggle` declared edition) | undetected |
| WR-07 (corpus preference) | undetected (see WR-02 above) |
| WR-08 (dialog reset on reopen) | undetected |
| WR-09 (quota detection) | undetected |
| WR-10 (`.catch` after install) | undetected |
| WR-11 / WR-12 | **caught** |

The suite's job in this repo is to be the regression net for a no-build codebase with no runtime
tests. Twelve atomic fix commits landed with the net having a hole exactly where each one lands.

**Fix:** the highest-value four, all cheap structural assertions in the existing scripts:

```powershell
# check-source-dispatch: WR-03 — não cachear um load de versão já removida
if ($loader -notmatch 'if \(_versionByKey\(key\)\)[\s\S]{0,120}?_cache\[key\] = adapted') {
  throw 'WR-03: loadVersion() must re-check _versionByKey(key) before writing _cache[key].'
}
# check-plugin-store: WR-04 — registro ausente lança, não vira []
if ($store -notmatch 'if \(!record\) throw new Error') {
  throw 'WR-04: getSpells() must throw on a missing record, not return [].'
}
# check-loader-hardening: WR-05 — não inventar escola/edição
if ($loader -notmatch "school: typeof schoolIdx === 'number' \? schoolIdx : null") {
  throw 'WR-05: adaptSpell() must propagate null for an unrecognized school, not default to 4.'
}
# check-pack-import-dialog: WR-09 — quota é detectada fora do enum de PACK_ERROR_CODES
if ($dialog -notmatch "QuotaExceededError") {
  throw 'WR-09: packErrKeyFor() must map a quota failure to packErr.quota.'
}
```

### WR-04: WR-08 left the duplicate-install path open — the submit button stays live on the success screen

**File:** `pack-import-dialog.jsx:123-124,258-266`

**Issue:** WR-08 reset the form on `open`, which closes the close-and-reopen path. But the footer
button renders **outside** the `result ? ... : ...` conditional, and neither `file` nor `url` is
cleared on success. After a successful install the success screen shows while
`submitDisabled = busy || !hasValue` is still `false` — the button reads "Instalar pacote" and is
clickable. Clicking it re-runs `handleSubmit` with the same file; `freeIdentifier`
(`pack-import.jsx:232`) hands out `<source>-2`, so this installs a genuine **duplicate pack**,
which is verbatim the outcome WR-08's own commit message says it was closing.

**Fix:**

```jsx
const submitDisabled = busy || !hasValue || !!result;   // sucesso na tela = nada mais a enviar
```

### WR-05: `setCurrentVersion` early-returns before clearing the pending preference

**File:** `spells-data-loader.jsx:384-391`

**Issue:** Carried over from round 2 (IN-02), now materially worse. The guard runs first:

```js
function setCurrentVersion(key) {
  if (_currentVersion === key) return;   // <-- sai antes do clear
  _wantedVersionKey = null;
```

Selecting the version you are already on is a no-op that also fails to consume the pending
preference. Before WR-01 that only delayed a version retry; now it is one of only two ways to
clear a flag that gates *all* preference persistence (see CR-01), so the manual escape hatch
does not work for the most obvious user action.

**Fix:** the clear is unconditional — an explicit selection always cancels a pending preference.

```js
function setCurrentVersion(key) {
  _wantedVersionKey = null;              // escolha explícita sempre cancela a pendência
  if (_currentVersion === key) return;
  _currentVersion = key;
  window.dispatchEvent(new CustomEvent('hifi-spells-source-changed', { detail: key }));
}
```

### WR-06: a third-party pack is visually indistinguishable from a bundled edition in the selector

**File:** `spells-data-loader.jsx:64-78,585-603,636-653`

**Issue:** Carried over from round 2 (IN-07), still live. `_packToVersion` copies `meta.name`
straight into `labelPt`/`labelEn`, and `VersionSelector` renders `{lang === 'ptbr' ? v.labelPt :
v.labelEn}` with the same language dot and the same row treatment as a builtin. A pack whose
`meta.name` is `"SRD 5.2 (EN)"` or `"PHB 2024"` produces a selector row that is pixel-identical
to the bundled entry. Content is DOMPurify-sanitized so this is not XSS — it is provenance
spoofing, and the selector is the user's only signal of which corpus they are reading. That
signal is the trust surface of the whole BYOD milestone.

**Fix:** the registry already discriminates by origin; surface it.

```jsx
<span style={{ flex: 1 }}>{lang === 'ptbr' ? v.labelPt : v.labelEn}</span>
{v.source === 'idb' && (
  <span className="hifi-mono" style={{ fontSize: 9, color: 'var(--overlay0)' }}>pack</span>
)}
```

## Info

### IN-01: corrupt saved prefs discard a valid `?v=` from a shared link

**File:** `spells-data-loader.jsx:361-377`

**Issue:** `JSON.parse(localStorage.getItem('spellbook-ui-prefs') || '{}')` sits on line 365,
*before* the `if (urlV && _versionByKey(urlV)) return urlV;` on line 367. A corrupt prefs blob
throws, the whole `try` unwinds, and a perfectly valid `?v=` is silently dropped in favour of
`_defaultVersion()`. `index.html`'s own `loadPrefs()` already tolerates this by returning `{}`.

**Fix:** parse prefs defensively, the same way `index.html` does:

```js
let prefs = {};
try { prefs = JSON.parse(localStorage.getItem('spellbook-ui-prefs') || '{}') || {}; } catch (e) {}
```

### IN-02: silent early return when `window.pluginStore` is missing

**File:** `spells-data-loader.jsx:99-101`

**Issue:** If `plugin-store.jsx` fails to load, every installed pack vanishes from the selector
with zero diagnostics — which is exactly the failure mode the deliberate script order in
`index.html` exists to prevent. A `console.warn` costs one line and turns a silent regression
into a one-glance diagnosis. (The `_wantedVersionKey` half of this path is CR-01.)

**Fix:** `console.warn('[spells-data-loader] window.pluginStore ausente — packs não enumerados.');`

### IN-03: stale and triplicated comments in `sw.js`

**File:** `sw.js:8,23,24,39`

**Issue:** Line 8 says *"Os 4 JSONs são pré-cacheados no install"* — `PRECACHE` now carries six
(four legacy + two SRD). The same "CACHE_VERSION não muda, acréscimo puro" ponytail note is
repeated on lines 23, 24 and 39; one instance above the list carries the point.

**Fix:** correct the count to six, keep one ponytail note above `PRECACHE`.

### IN-04: `event.respondWith` can resolve to `undefined`

**File:** `sw.js:84`

**Issue:** `network` is `fetch(request).catch(() => cached)`. Offline for a resource that was
never cached makes `cached` `undefined`, so the shell branch `network.then(res => res || cached)`
resolves to `undefined`. Per spec `respondWith` then fails the request with a `NetworkError` and
logs a `TypeError` in the SW — instead of letting the browser fall through to its own offline
handling. Outcome is similar, the console noise is not.

**Fix:** `return isShell ? network.then((res) => res || cached || Response.error()) : (cached || network);`

### IN-05: the hostile QA fixture is published on the deploy origin

**File:** `scripts/qa-fixtures/hostile-html.json`

**Issue:** There is no build step and no Pages workflow — the branch root is published as-is, and
`scripts/` is tracked and not ignored, so
`https://<site>/scripts/qa-fixtures/hostile-html.json` is live. GitHub Pages serves it as
`application/json`, so it does not execute; and the payload is DOMPurify-sanitized if it is ever
imported. It is hygiene, not a vulnerability: a same-origin URL that reads as a hosted XSS
payload to any scanner, for a file whose only consumer is a manual QA run.

**Fix:** add `scripts/qa-fixtures/` to `.gitignore`-adjacent deploy exclusion, or move the
fixture under `.planning/` where the rest of the phase's test material lives. If it must stay
tracked, the check scripts should assert it is not reachable from the published root.

### IN-06: the URL filter whitelist admits keys that have no visible chip

**File:** `v10-hifi.jsx:800-811`

**Issue:** The CR-01 whitelist accepts all ten `hifiFilterConfig` keys, but `extraFilters`
(which draws the chips) is component state seeded to `[]`. A hand-crafted `?f.src=PHB` therefore
applies a real, invisible filter: the result count drops and no chip explains why. Only the empty
state's "limpar filtros" clears it, and only if the filtered set happens to be empty.
`hifiShareViewUrl` emits only `class`/`level`/`school`, so nothing the app produces exercises the
other seven keys.

**Fix:** narrow the whitelist to what the app actually shares — one condition, no new UI:

```jsx
// só as chaves que hifiShareViewUrl realmente emite têm chip visível pra desfazer
if (!['class', 'level', 'school'].includes(k)) return;
```

### IN-07: `exportPack` revokes the object URL synchronously after `click()`, contradicting its own comment

**File:** `plugin-store.jsx:216`

**Issue:** The comment says *"depois do click — revogar cedo cancela o download em alguns
navegadores"*, but a synchronous revoke immediately after `a.click()` **is** the early case:
the download may not have been initiated when the URL is invalidated. Chrome usually survives it;
Firefox historically does not. Currently latent — nothing calls `exportPack` yet — which makes it
cheap to fix before Phase 5 wires it up.

**Fix:** `setTimeout(() => URL.revokeObjectURL(url), 0);`

### IN-08: `STRINGS` is the last lookup table in the codebase that still carries a prototype

**File:** `i18n.jsx:15,381`

**Issue:** `makeT` does `dict[key]` on a plain object literal. `SCHOOL_INDEX`, `CLASS_PT`,
`CLASS_EN`, `SOURCE_CODE`, `hifiFilterConfig` and `PACK_ERR_KEY_BY_CODE` were all converted to
`Object.create(null)` for exactly this shape of lookup. Not currently reachable — every `tt()`
call site uses a literal or prefixed key (`ability.*`, `stats.*`, `noun.spell.*`), and
`packErrKeyFor` returns only whitelisted values — so this is consistency, not a live hole. It is
also the one table a future dynamic key would land in.

**Fix:** `const STRINGS = { ptbr: Object.assign(Object.create(null), {...}), en: Object.assign(Object.create(null), {...}) };`
or, cheaper, guard the read: `const s = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : null;`

---

_Reviewed: 2026-08-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
