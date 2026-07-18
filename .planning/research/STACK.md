# Stack Research

**Domain:** BYOD plugin system for a no-build, CDN-only React PWA (spell-pack import, IndexedDB storage, HTML sanitization)
**Researched:** 2026-07-18
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| DOMPurify | 3.4.12 | Sanitize imported spell `description` HTML before `dangerouslySetInnerHTML` | Industry-standard XSS sanitizer, actively maintained, handles mutation-XSS and obscure bypass vectors a hand-written tag whitelist will miss. This is a security boundary (untrusted BYOD content), not a place to save one dependency. ~20KB gzip, zero deps itself, ships a plain UMD `dist/purify.min.js` global (`window.DOMPurify`) — drops into the existing `<script>`+SRI loading pattern with no build step. |
| Raw `indexedDB` (native browser API) | n/a (Baseline, all evergreen browsers) | Store imported plugin packs (manifest + spells), keyed by plugin id | Only 4 operations needed: put pack, get pack, list all packs, delete pack. That's ~30 lines of hand-written Promise-wrapping — smaller than the payload of any wrapper library fetched over a network request. No new CDN dependency, no version to pin/SRI-hash, no third-party code touching data storage. |
| `<input type="file">` | n/a (native HTML) | Local file import (pick a `.json` plugin file) | Universal support (desktop + mobile, all browsers, including `file://`). The File System Access API's extra capabilities (persistent handles, write-back, directory access) aren't needed — this is read-once-and-parse. |
| `fetch()` (native) | n/a | URL import (fetch a plugin JSON from a user-given URL) | Already used elsewhere in the codebase for spell data loading. No library needed; the real constraint here is CORS (see Pitfalls below), which no client library can work around. |

### Supporting Libraries

None. This milestone adds exactly one new external dependency (DOMPurify) for the one requirement that's a genuine security boundary. Everything else is covered by native browser APIs already available in evergreen browsers.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| jsDelivr / unpkg SRI generation | Pin DOMPurify with an integrity hash | Match the existing pattern in `index.html` (React/ReactDOM/Babel are all loaded from unpkg with `integrity="sha384-..."`). Generate the hash the same way those were generated: `curl -s https://unpkg.com/dompurify@3.4.12/dist/purify.min.js \| openssl dgst -sha384 -binary \| openssl base64 -A`, then prefix with `sha384-`. |

## Installation

No `npm install` — this is a no-build CDN app. Add one script tag to `index.html`, after Babel standalone and before any script that renders spell descriptions:

```html
<script src="https://unpkg.com/dompurify@3.4.12/dist/purify.min.js" integrity="sha384-<generate-and-pin>" crossorigin="anonymous"></script>
```

`DOMPurify.sanitize(html)` is then available as a global, same access pattern as `React`/`ReactDOM`.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Raw `indexedDB` + hand-written promise wrapper | `idb` (Jake Archibald, latest 8.0.3, `https://cdn.jsdelivr.net/npm/idb@8/+esm`) | If the plugin system grows past simple key-value pack storage (indexes, cursors, versioned schema migrations, multiple object stores with complex queries) — `idb`'s promise-based `openDB`/transaction helpers pay for themselves once the raw-API boilerplate multiplies. Not the case here: one object store, four operations. |
| DOMPurify (CDN + SRI) | Hand-rolled tag/attribute whitelist regex or DOM-walk sanitizer | Never for this use case — sanitizing arbitrary untrusted HTML correctly (mutation XSS, `<svg>`/`<math>` namespace tricks, malformed markup re-parsing differently after serialization) is a well-known hard problem; hand-rolled sanitizers have a long history of bypasses. Only consider hand-rolling if the import format is restricted to plain text/Markdown with no raw HTML at all — which would remove the sanitization need entirely, not replace the library. |
| `<input type="file">` | File System Access API (`showOpenFilePicker`) | Only if a future feature needs to *re-read or write back* to the same file handle (e.g., "sync from this file on disk"). Chromium-only (Chrome/Edge/Opera 86+); Firefox has no plans to ship it (flagged as harmful in Mozilla's standards position) and Safari ships only the Origin Private File System, not the picker. Using it as the primary import path would silently break import for ~25%+ of users (Firefox, Safari, mobile). |
| Plain `fetch()` for URL import | A CORS proxy service or self-hosted proxy | If URL import needs to support arbitrary hosts without CORS headers. Out of scope here — the app is static-only with no server component (locked constraint), so no proxy is available. Document the limitation instead (see Pitfalls). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `mode: 'no-cors'` on the URL-import `fetch()` | Response body is opaque in `no-cors` mode — you get a response object but cannot read its content. It looks like it "works" (no thrown error) but the JSON can never be parsed. This is a common trap, not a workaround. | Plain `fetch(url)` (default `cors` mode); catch the failure and tell the user to download the file and use file import instead when the host doesn't send CORS headers. |
| Any React-specific "safe HTML" component library (e.g., wrapper packages around DOMPurify) | Adds a second dependency and build-step assumptions (most ship as ESM-only npm packages without a plain UMD CDN build) for zero benefit over calling `DOMPurify.sanitize()` directly inside the existing render code. | `DOMPurify.sanitize(html)` called directly wherever `dangerouslySetInnerHTML` is used for spell descriptions. |
| A full ORM/query layer over IndexedDB (Dexie, etc.) | Massive overkill for "store a handful of plugin packs, list them, delete one." Dexie alone is ~25KB+ and brings a whole schema/versioning API this project doesn't need. | Raw `indexedDB` with a ~30-line hand-written promise wrapper. |

## Stack Patterns by Variant

**If plugin storage needs grow (multiple object stores, indexed queries by spell name/class across packs):**
- Reconsider `idb` at that point — re-evaluate, don't pre-adopt now.
- Because YAGNI: today's requirement is single-store put/get/getAll/delete, which raw IndexedDB handles in fewer lines than fetching and pinning a new CDN library.

**If URL import needs to support hosts without CORS headers (e.g., arbitrary GitHub file URLs that aren't `raw.githubusercontent.com`):**
- Document the limitation in the import UI ("URL must serve the file with CORS headers — GitHub raw links, jsDelivr, and Gist raw links work; most other hosts will fail") rather than building a proxy.
- Because the app is explicitly static/serverless (locked constraint) — a proxy would require a backend this project has ruled out.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| DOMPurify 3.4.12 | React 18.3.1 (existing), no build step | UMD global build, no ESM/bundler requirement; works identically to the existing unpkg-loaded React/Babel scripts. |
| Raw `indexedDB` | All evergreen browsers (Chrome, Firefox, Safari, Edge) | Baseline-available API since long before this project's minimum target; no polyfill needed. Safari's older IndexedDB bugs (pre-Safari 14) are not a concern given the project already assumes modern evergreen browsers for the service-worker PWA. |
| `<input type="file">` | All browsers, including `file://` origin | Already implicitly relied upon by the existing "no build step, works on file://" constraint — no new compatibility surface. |

## Sources

- jsDelivr package page for `dompurify` — confirmed latest version 3.4.12, dual MPL-2.0/Apache-2.0 license (WebFetch, MEDIUM-HIGH confidence, cross-checked against npm search results showing the same version).
- WebSearch: "idb library IndexedDB wrapper npm jsdelivr esm latest version" — confirmed `idb` (Jake Archibald) latest 8.0.3, ~1.19KB brotli'd, available at `cdn.jsdelivr.net/npm/idb@8/+esm` — evaluated as an alternative, not adopted (MEDIUM confidence, web search aggregation).
- WebSearch: "File System Access API browser support Firefox Safari showOpenFilePicker" — confirmed Chromium-only support (Chrome/Edge/Opera 86+), Firefox has no picker support and flagged it as harmful in their standards position, Safari ships only Origin Private File System (MEDIUM confidence, cross-checked against MDN/Chrome-for-Developers results in the same search).
- WebSearch: "fetch() cross-origin JSON CORS error client-side browser no server" — confirmed CORS is enforced browser-side and unresolvable without server cooperation or a proxy; `no-cors` mode returns an opaque, unreadable response (MEDIUM confidence, MDN-backed).
- Existing codebase (`index.html` lines 102-104) — confirmed project's established pattern of unpkg.com + `integrity="sha384-..."` SRI pins for CDN scripts, reused for the DOMPurify recommendation (HIGH confidence, direct repo inspection).

---
*Stack research for: BYOD plugin system (v2.0 Plugins BYOD milestone)*
*Researched: 2026-07-18*
