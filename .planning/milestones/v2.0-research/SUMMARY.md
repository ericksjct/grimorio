# Project Research Summary

**Project:** Grimório do Jogador — v2.0 Plugins BYOD
**Domain:** BYOD (bring-your-own-data) plugin/content system for a no-build, client-only D&D 5e spellbook PWA
**Researched:** 2026-07-18
**Confidence:** HIGH

## Executive Summary

This is a client-side "bring your own content" system layered onto an existing no-build React PWA — closest analogs are Foundry VTT's module manifest system and 5etools' homebrew JSON convention, both of which converge on the same shape: a metadata manifest (name/author/version/source), file-or-URL install, IndexedDB-class local storage, and source-namespaced identity to avoid collisions. The recommended approach adds exactly one new dependency (DOMPurify, loaded via the existing unpkg+SRI CDN pattern) and otherwise leans entirely on native browser APIs (`indexedDB`, `<input type="file">`, `fetch()`) — everything else, including update-checking and a pack marketplace, is explicitly deferred or rejected as out of scope for a static, backend-less app.

The core architectural move is non-invasive: `spells-data-loader.jsx`'s existing `loadVersion()` gets one new dispatch branch (`source: 'idb'` vs `'fetch'`), and every pack — bundled SRD or user-imported — funnels through the same `adaptSpells()` normalization already in production. This means the version selector, spell browser, and prepared/bookmark logic (`hifiSpellKey()` is already pack-agnostic) require zero changes. The two new files (`plugin-store.jsx`, `plugin-import.jsx`) match the codebase's existing one-concern-per-file convention.

The dominant risk cluster is security and data-integrity, not technology choice: the app already has four unsanitized `dangerouslySetInnerHTML` sinks that become live XSS vectors the moment untrusted pack content flows through them, and IndexedDB write failures/Safari eviction are currently unhandled (mirroring an existing `localStorage` bug noted in `CONCERNS.md`). A second, distinct risk is legal/migration: decommissioning the four bundled copyrighted JSONs must not silently orphan existing users' prepared-spell references, and the CC-BY SRD replacement requires verbatim, edition-specific attribution text. Both risk clusters have concrete, low-cost mitigations documented below and must ship in the same phase as the feature they protect — not deferred to polish.

## Key Findings

### Recommended Stack

No `npm install` — this stays a no-build, CDN-script app. One new dependency: **DOMPurify 3.4.12** (UMD, unpkg + SRI hash, same pattern as existing React/Babel script tags) for sanitizing imported spell HTML before `dangerouslySetInnerHTML`. Everything else is native: raw `indexedDB` (hand-written ~30-line promise wrapper, no `idb` library — overkill for one object store/four operations), `<input type="file">` for local import, and plain `fetch()` for URL import (not `mode:'no-cors'`, which returns an unreadable opaque response).

**Core technologies:**
- DOMPurify 3.4.12 (CDN, SRI-pinned) — sanitizes untrusted spell-description HTML; the one genuine security boundary in this milestone
- Raw `indexedDB` — stores imported plugin packs (put/get/list/delete); avoids a needless new dependency for a tiny surface
- `<input type="file">` + `fetch()` — universal, no-build-compatible import paths; File System Access API rejected (Chromium-only, ~25%+ of users would be excluded)

### Expected Features

Comparable systems (Foundry VTT, 5etools/Plutonium, Obsidian community plugins) converge on the same MVP shape: manifest metadata, file/URL install, list/remove UI, and source-namespaced spell identity instead of a merge-conflict UI.

**Must have (table stakes):**
- Manifest metadata: name, author, version, license, source (foundation — everything else depends on it)
- Install via file upload and via URL
- List installed packs / uninstall a pack
- Source-namespaced identity `(source, name)` to avoid spell collisions (no merge UI needed)
- Built-in free SRD pack pre-installed (prevents empty-state-on-first-open)
- Dynamic version selector reading installed packs instead of 4 hardcoded entries
- CC-BY attribution notice, edition-correct (SRD 5.1 vs 5.2 have different required text)
- Empty-state onboarding for the rare zero-pack case

**Should have (competitive):**
- Import-time XSS sanitization stricter than either comparable system does by default
- Offline-first pack storage — no comparable system (Foundry, 5etools) offers a fully offline installable PWA with arbitrary user content
- Enforced (not just conventional) unique `source` tag validation at import

**Defer (v2+):**
- Update-check via manifest URL re-fetch (semver compare) — only valuable once packs are actually updated post-install
- "You have 2 versions of X" duplicate-info note — polish, not required for correctness
- Central pack directory/marketplace — explicitly rejected as an anti-feature (requires a backend, violates locked no-backend constraint); a docs page is the acceptable substitute
- Pack export/backup — not requested this milestone, though PITFALLS research flags it as important for Safari-eviction recovery (see Gaps below)
- PT-BR SRD pack — blocked on nonexistent official source material

### Architecture Approach

The plugin system extends rather than replaces the existing loader: `SPELL_VERSIONS` becomes a runtime-built array (1 static SRD entry + N IndexedDB-sourced entries appended at boot), and `loadVersion()` gains a `source: 'fetch'|'idb'` dispatch that still funnels every path through the same `adaptSpells()` call — no forked normalization logic, no changes needed in `VersionSelector`, `useSpellVersions`, or the hifi UI components. Sanitization happens once, at import time in the new `plugin-import.jsx` pipeline, before data is persisted to IndexedDB (not at render time) — persisted data is the sanitized **raw** JSON shape, not pre-adapted app-schema objects, keeping `adaptSpells()` as the single normalization point that survives future schema changes.

**Major components:**
1. `plugin-store.jsx` (new) — thin promise-wrapped IndexedDB CRUD (put/get/list/delete pack), no external dependency
2. `plugin-import.jsx` (new) — import pipeline: read file/fetch URL → parse → validate → sanitize (DOMPurify) → dry-run `adaptSpells()` → persist → fire `hifi-plugins-changed` event
3. `spells-data-loader.jsx` (modified) — source-dispatch in `loadVersion()`, mutable `SPELL_VERSIONS` populated with SRD + IDB packs at boot
4. `PluginManager` UI (new) — install/list/remove panel, same inline-rendered-sibling pattern as `CharacterEditor`
5. `sw.js` (modified, last) — precache list drops the 4 removed JSONs, keeps only the SRD file; IndexedDB is never SW-mediated

### Critical Pitfalls

1. **Unsanitized `dangerouslySetInnerHTML` (4 existing sinks, including the print portal)** — sanitize once at import time with an explicit DOMPurify allowlist (no defaults, no SVG/MathML profile); every render site must read only post-sanitized data, never sanitize per-render.
2. **DOMPurify default config isn't safe enough (mXSS via SVG/MathML)** — configure `USE_PROFILES: {html: true}` plus an explicit tag/attribute allowlist scoped to what spell descriptions actually use; pin and update the CDN version like the project already does for React/Babel.
3. **Trusting `JSON.parse` output structurally (malformed/oversized/prototype-polluting packs)** — validate required fields (reject, don't silently coerce), cap import file size before parsing, explicitly strip/reject `__proto__`/`constructor`/`prototype` keys, and parse off the main thread for non-trivial pack sizes.
4. **IndexedDB writes assumed to always succeed/persist (Safari 7-day eviction, quota rejection)** — wrap every write in try/catch for `QuotaExceededError`, call `navigator.storage.persist()` as best-effort only, and treat export/re-import as a first-class recovery path rather than a nice-to-have.
5. **Migration silently orphans existing users' prepared/bookmarked spell references** when the 4 bundled JSONs are removed — preserve unresolved references (never delete them), surface them as "install a pack for this" rather than letting them silently vanish from the character sheet.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Plugin Storage Foundation
**Rationale:** Everything downstream (import, manage UI, dynamic version selector) reads/writes through this layer; it has zero dependents yet and is independently testable via devtools console.
**Delivers:** `plugin-store.jsx` (IndexedDB CRUD: putPack/getPack/getSpells/listPacks/deletePack), with `QuotaExceededError` handling and `navigator.storage.persist()` call wired in from the start (not bolted on later).
**Addresses:** IndexedDB storage table-stakes requirement.
**Avoids:** Pitfall 4 (assumed-successful IndexedDB writes / Safari eviction) — must be handled in this phase, not retrofitted.

### Phase 2: SRD Pack + Plugin Engine (Import Pipeline)
**Rationale:** The import pipeline and the SRD data extraction are independent of each other but both gate the loader integration; sanitization must ship in the same phase as import per Pitfall 1/2, not deferred to polish.
**Delivers:** `spells-srd-en.json` (CC-BY subset extraction) in parallel with `plugin-import.jsx` (file/URL read → parse → schema validation → size cap → `__proto__`/prototype-pollution key rejection → DOMPurify sanitization with explicit allowlist → `adaptSpells()` dry-run → `putPack()`).
**Uses:** DOMPurify 3.4.12 (CDN+SRI) from STACK.md.
**Avoids:** Pitfalls 1, 2, 3 (unsanitized sinks, weak sanitizer config, unvalidated/oversized/polluting JSON).

### Phase 3: Loader Integration (Source-Dispatch)
**Rationale:** Highest-risk step — touches the most load-bearing existing code (`spells-data-loader.jsx`). Sequenced after storage and SRD data exist so it can be verified end-to-end immediately; must be validated against zero-packs-installed behavior before plugin import UI exists.
**Delivers:** `SPELL_VERSIONS` becomes a runtime-built array (SRD static entry + N IDB entries appended at boot), `loadVersion()` gains `source: 'fetch'|'idb'` dispatch through the shared `adaptSpells()` call, boot-order fallback chain for stale `versionKey` preferences.
**Implements:** Architecture Pattern 1 (Source-Dispatch in the Existing Loader).

### Phase 4: Plugin Manager UI + Dynamic Version Selector
**Rationale:** Thinnest layer — pure UI wiring against already-tested `importPack()`/`pluginStore` functions from Phases 1-3; comes last among the "build" phases so there's a stable API surface to wire against.
**Delivers:** Install (file picker/URL field) / list / remove panel (inline-rendered sibling in App, matching `CharacterEditor`'s pattern); dynamic version selector reading installed packs instead of 4 hardcoded entries; CC-BY attribution panel with edition-correct verbatim text.
**Addresses:** Manage UI, dynamic version selector, and CC-BY attribution table-stakes features from FEATURES.md.

### Phase 5: Decommissioning + Migration
**Rationale:** Irreversible/legally-motivated step — must happen last, after the SRD-pack + BYOD replacement path is proven end-to-end, per both ARCHITECTURE.md's suggested build order and PITFALLS.md's explicit warning against treating git-history-removal as the actual compliance mechanism.
**Delivers:** `sw.js` precache list update (drop 4 JSONs, keep SRD only), removal of the 4 bundled copyrighted JSONs from repo, one-time migration pass that detects and preserves (never silently drops) existing users' prepared/bookmarked spell references that no longer resolve against SRD + installed packs.
**Avoids:** Pitfalls 5 and 6 (silent reference orphaning during migration; false sense of compliance from git-history scrubbing alone).

### Phase Ordering Rationale

- Storage before import before loader-integration before UI: each layer is independently testable and the highest-risk change (loader integration touching existing production code) is de-risked by having storage and data already verified.
- Decommissioning is deliberately last and separate from the SRD pack phase: FEATURES.md's dependency graph confirms "decommission requires both a working SRD replacement AND a working import path," and PITFALLS.md confirms this is also the phase most likely to silently break existing users if rushed.
- Sanitization is folded into the import-pipeline phase (not a later "security hardening" phase) because PITFALLS.md is explicit that deferring it is the exact failure pattern that leaves sinks unsanitized.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Decommissioning + Migration):** the migration-detection logic for existing `localStorage` character data is novel to this codebase (no existing versioned-migration pattern to copy) and touches legal/compliance framing — worth a `--research-phase` pass on the exact detection/preservation UX.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Storage):** IndexedDB promise-wrapper pattern is fully specified in ARCHITECTURE.md with working code.
- **Phase 2 (Import/SRD):** DOMPurify config and validation pipeline are fully specified in ARCHITECTURE.md and PITFALLS.md with working code and an explicit checklist.
- **Phase 3 (Loader Integration):** Source-dispatch pattern and boot-order handling are fully specified in ARCHITECTURE.md with working code and explicit trade-off notes.
- **Phase 4 (UI):** Mirrors the existing `CharacterEditor` pattern already in the codebase; no new architectural questions.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Grounded directly in existing `index.html` CDN+SRI pattern; only one new dependency, cross-checked against jsDelivr/npm |
| Features | MEDIUM | Cross-referenced across 3+ comparable systems (Foundry, 5etools, Obsidian); SRD attribution text specifically is HIGH (verified via official WotC PDF filename/URL + 3 independent secondary sources quoting it verbatim) |
| Architecture | HIGH | Grounded directly in `spells-data-loader.jsx`, `sw.js`, `v10-hifi.jsx` source reads; no novel tech, standard web-platform APIs |
| Pitfalls | MEDIUM | Web-search findings cross-checked against MDN, WebKit's own blog, DOMPurify's repo, PortSwigger, and official WotC SRD PDFs; no official docs/SDK exists for this exact combination |

**Overall confidence:** HIGH

### Gaps to Address

- **Pack export/backup was scoped out of the MVP in FEATURES.md but PITFALLS.md flags it as the primary recovery mechanism for Safari's 7-day storage eviction.** Recommend flagging this tension explicitly during roadmap/requirements review — either pull a minimal export into Phase 1/4 scope, or explicitly document the accepted data-loss risk for users who don't reopen the browser-tab version of the app within 7 days.
- **CSP addition is recommended in PITFALLS.md as a defense-in-depth layer** (the app currently has none) but isn't mentioned in STACK.md or ARCHITECTURE.md as an existing plan. Worth a scoping decision — likely a low-cost addition to Phase 2 or Phase 4, not a separate phase.
- **The primary WotC SRD legal PDF could not be text-extracted directly** — attribution strings rest on triangulation across three independent secondary sources rather than direct primary-source extraction. High confidence via corroboration, but worth a final verbatim-text diff against the official PDF before shipping the attribution panel (Phase 4).
- **File-size cap and Web Worker off-main-thread parsing (Pitfall 3) are recommended but not yet sized** — no concrete byte threshold is proposed in any research file; this needs a concrete number decided during Phase 2 planning, not left as "non-trivial."

## Sources

### Primary (HIGH confidence)
- `spells-data-loader.jsx`, `sw.js`, `v10-hifi.jsx` (read in full/grepped) — existing codebase, grounds all architecture and integration claims
- `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`, `.planning/REQUIREMENTS.md` — existing project decisions and known issues
- jsDelivr package page for `dompurify` (3.4.12) — version/license confirmation
- MDN: IndexedDB API, Storage quotas and eviction criteria, StorageManager.persist()
- WebKit blog: Updates to Storage Policy (7-day cap)
- DOMPurify GitHub (cure53) and its allowlist wiki
- PortSwigger: What is prototype pollution?

### Secondary (MEDIUM confidence)
- Foundry VTT: Module Development / Package Management / Compendium Packs docs — manifest schema, update mechanism, conflict resolution
- 5etools Community Wiki: Plutonium Importing / Homebrew Adding Content — file/URL import UX, unique-source-tag convention
- Obsidian community plugins docs — manage-UI UX model
- a5esrd.com CC-BY compliance guide, EN World forum SRD attribution thread, Roll20 SRD 5.2 explainer — SRD 5.1/5.2 attribution text triangulation
- Pragmatic Web Security: dangerouslySetInnerHTML XSS, mXSS via DOMPurify namespace confusion bypass writeup

### Tertiary (LOW confidence)
- AboveVTT Chrome Web Store listing — used only to rule out relevance (weak analog, no independent pack format)
- General empty-state/onboarding UX pattern — not tied to a specific citable domain source, treated as universal pattern

---
*Research completed: 2026-07-18*
*Ready for roadmap: yes*
