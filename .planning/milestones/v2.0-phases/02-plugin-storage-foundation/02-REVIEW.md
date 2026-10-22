---
phase: 02-plugin-storage-foundation
reviewed: 2026-07-18T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - index.html
  - plugin-store.jsx
  - scripts/check-plugin-store-persistence-export.tests.ps1
  - scripts/check-plugin-store.tests.ps1
  - sw.js
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

`plugin-store.jsx` is a new 220-line IndexedDB CRUD layer. It is careful, defensive
code: `_tx()` only resolves on `tx.oncomplete` (never on an isolated request's
`onsuccess`), both `onerror` and `onabort` are wired, `openDB()` resets its memoized
promise on failure so a later call retries instead of caching a dead connection,
`_assertPackShape()` validates shape before any transaction opens, and the one
deliberately-swallowed error path (`requestPersistence()`'s best-effort persist
request) is logged via `console.warn` and documented, not silent. The `T-02-06`
filename-sanitization mitigation in `_packFileName()` correctly strips path
separators and `..` before the value ever reaches the `download` attribute (verified
by hand-tracing `'../../etc/passwd'` through the reduction). I did not find a data-
corruption, silent-failure, or cross-origin-leak defect in the new file.

The `index.html` diff (comment + one `<script>` tag) and the `sw.js` diff (one
`PRECACHE` entry) are both minimal and correctly wired per the two PowerShell gate
scripts. The gate scripts themselves are logically sound with one weak regex
(WR-03). The `sw.js` comment attached to the new PRECACHE line makes a claim about
service-worker `Cache` semantics that is not true of the `Cache.add()` API (WR-01),
and the pre-existing shell fetch strategy that now also governs `plugin-store.jsx`
has a gap where a non-2xx network response is preferred over a known-good cache
entry (WR-02) — worth a look given this app's explicit "works at the table without
wifi" goal, even though that logic predates this phase's diff.

## Warnings

### WR-01: Misleading comment about `Cache.add()` semantics on the new PRECACHE line

**File:** `sw.js:22`
**Issue:** The comment on the newly-added PRECACHE entry claims: `CACHE_VERSION não
muda — install() reabre o mesmo cache e só adiciona este arquivo, sem re-baixar os
JSONs de magias já cacheados` ("...without re-downloading the already-cached spell
JSONs"). That is not how `Cache.add()`/`cache.add(url)` behaves: it always performs
a fresh `fetch()` for every URL passed to it, regardless of whether that URL is
already present in the cache (line 45: `Promise.allSettled(PRECACHE.map((url) =>
cache.add(url)))`). Every time this service worker's `install` event runs (i.e. on
every deploy where `sw.js` bytes changed), **all** PRECACHE entries — including the
four spell JSONs, four font files, and the pinned React/ReactDOM/Babel vendor
scripts — are re-fetched from the network, not just the newly added file. The
comment will mislead a future contributor into believing precache growth is "free"
between installs.
**Fix:** Correct the comment to describe actual behavior, e.g.:
```js
'./plugin-store.jsx', // CACHE_VERSION unchanged: install() re-adds every PRECACHE
                       // URL (cache.add() always re-fetches, cached or not) — this
                       // entry doesn't add a migration step, but every install still
                       // re-downloads the full list, JSONs included.
```
If the "no re-download" property is actually desired, use
`cache.match(url).then(hit => hit || cache.add(url))` per URL instead of blindly
mapping `cache.add`.

### WR-02: Shell (network-first) strategy prefers a non-ok network response over a known-good cache entry

**File:** `sw.js:67-78` (pre-existing logic; now also governs the newly-added
`plugin-store.jsx`, which matches `SHELL_RE`)
**Issue:** For shell resources (`isShell === true`, which now includes
`plugin-store.jsx`), the fetch handler does:
```js
const network = fetch(request)
  .then((res) => { if (res && res.ok) cache.put(request, res.clone()); return res; })
  .catch(() => cached);
return isShell ? network.then((res) => res || cached) : (cached || network);
```
If `fetch()` succeeds but returns a non-2xx response (500 during a bad deploy, 404
from a mis-routed host, a captive-portal page, etc.), `res` is a truthy `Response`
object, `cache.put` is skipped (correctly, since `res.ok` is false), but
`res || cached` still evaluates to `res` — the error response is served to the page
instead of falling back to the perfectly good previously-cached shell. Given the
product's stated purpose (functioning "at the table without wifi", i.e. on flaky
connections, not just fully-offline ones), a transient bad response for
`plugin-store.jsx` or `index.html` will break the app even though a working cached
copy exists.
**Fix:** Only trust the network response when it's actually usable:
```js
return isShell
  ? network.then((res) => (res && res.ok ? res : cached) || res)
  : (cached || network);
```

### WR-03: `DB_VERSION` regression guard uses an unanchored regex

**File:** `scripts/check-plugin-store.tests.ps1:30-32`
**Issue:**
```powershell
if ($store -notmatch 'DB_VERSION\s*=\s*1') {
  throw 'DB_VERSION is not set to 1.'
}
```
This regex has no boundary after the `1`, so it matches as a substring: source text
`const DB_VERSION = 10;` or `DB_VERSION = 15;` would also satisfy
`DB_VERSION\s*=\s*1` (matches the leading `1` of `10`/`15`) and the check would
pass silently even though the actual version is not `1`. The gate is intended to
catch an accidental version bump, but as written it can't distinguish `1` from any
number starting with `1` (`1`, `10`, `100`, `19`, ...).
**Fix:** Anchor the digit boundary, e.g.:
```powershell
if ($store -notmatch 'DB_VERSION\s*=\s*1\s*;') {
  throw 'DB_VERSION is not set to 1.'
}
```

## Info

### IN-01: `openDB()` never closes or watches for `versionchange`

**File:** `plugin-store.jsx:24-44`
**Issue:** The opened `IDBDatabase` connection is kept alive for the lifetime of the
page and there is no `db.onversionchange` handler. This is not a bug at
`DB_VERSION = 1` (no upgrade path exists yet), but it means that whenever a future
phase bumps `DB_VERSION`, a tab left open on the old schema will hold the connection
open indefinitely and block the new tab's `indexedDB.open()` from firing
`onupgradeneeded` — the existing `onblocked` handler will surface that as a clear
rejected-promise error (good), but the *blocked* tab itself will never proactively
close its stale connection to unblock the other tab.
**Fix:** Not required for this phase; when a future phase introduces `DB_VERSION`
bumps, add `db.onversionchange = () => db.close();` inside `openDB()`'s
`req.onsuccess` handler so an old tab releases its connection instead of
indefinitely blocking a newer one.

---

_Reviewed: 2026-07-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
