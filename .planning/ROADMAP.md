# Roadmap: Grimório do Jogador

## Overview

v2.0 "Plugins BYOD" turns the app from "app with embedded data" into "shell + plugins": the four copyrighted spell JSONs stop shipping with the app, replaced by a free CC-BY SRD pack plus a bring-your-own-data plugin engine (file/URL import, IndexedDB storage, sanitized HTML, dynamic version selector). The five phases below follow the dependency chain the data itself imposes: storage must exist before anything can be imported into it, a validated/sanitized import pipeline must exist before the loader can trust IndexedDB as a source, the loader must dispatch across sources before a manager UI has anything real to manage, and the old copyrighted datasets can only be decommissioned once the SRD replacement + import path are proven end-to-end (irreversible step, deliberately last).

## Milestones

- ✅ **Pre-milestone maintenance** — Phase 1 (animation verification, closed 2026-07-17)
- 🚧 **v2.0 Plugins BYOD** — Phases 2-6 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Animation Verification & Polish** - Confirm the already-implemented menu/filter/panel animations work correctly everywhere they were built for
- [ ] **Phase 2: Plugin Storage Foundation** - IndexedDB persistence layer for spell packs, with persistent-storage request and export/backup
- [ ] **Phase 3: SRD Pack & Import Pipeline** - Users install a validated, sanitized pack from file or URL; SRD content exists as a real pack
- [ ] **Phase 4: Loader Integration (Source-Dispatch)** - The loader natively reads SRD + any installed packs through one dispatch point, no hardcoded 4-dataset list
- [ ] **Phase 5: Plugin Manager UI & Version Selector** - Install/list/remove UI, dynamic version selector, duplicate-spell notes, empty state, CC-BY attribution
- [ ] **Phase 6: Decommissioning & Migration** - Remove the 4 protected JSONs from site/repo; migrate existing users without silently dropping references

## Phase Details

<details>
<summary>✅ Pre-milestone maintenance (Phase 1) - CLOSED 2026-07-17</summary>

### Phase 1: Animation Verification & Polish
**Goal**: The menu/filter/panel/editor open-close animations shipped from the ingested SPEC work correctly on every surface they were built for — every desktop and mobile interaction, every theme, reduced-motion users, and keyboard-only users.
**Depends on**: Nothing (first phase)
**Requirements**: ANIM-01, ANIM-02, ANIM-03, ANIM-04
**Success Criteria** (what must be TRUE):
  1. User can open/close the desktop character menu, filter dropdowns, "+ mais" filter menu, character editor, and side detail panel and see smooth, glitch-free animations in every one of the 6 themes (light/dark)
  2. User can open/close the mobile character sheet, fullscreen editor, and spell detail screen and see smooth, glitch-free animations in every theme
  3. A user with `prefers-reduced-motion: reduce` enabled sees all of the above happen instantly, with no flicker or flash of mid-transition state
  4. A keyboard-only user can open every animated menu/dropdown/panel/editor, close it with Escape, and see focus return correctly to the triggering element
**Plans**: Ad hoc (10 implementation tasks shipped in git history `e733b1c`..`463fb7d`, no formal PLAN.md tracked)
**UI hint**: yes
**Status**: Complete — manual cross-theme/reduced-motion/keyboard verification confirmed by user 2026-07-17.

</details>

### Phase 2: Plugin Storage Foundation
**Goal**: Spell packs (bundled or user-imported) persist reliably in the browser across reloads and restarts, with best-effort protection against silent data loss.
**Depends on**: Nothing new (first phase of this milestone; no functional dependency on Phase 1)
**Requirements**: STOR-01, STOR-02, STOR-03
**Success Criteria** (what must be TRUE):
  1. A pack written to storage is still present, unchanged, after a full page reload or browser restart (STOR-01)
  2. The app requests persistent storage on load, visible as a granted/requested persistent quota in the browser's storage devtools panel (STOR-02)
  3. An installed pack can be exported back to a downloaded JSON file, content-identical to what's stored (STOR-03)
  4. A storage write that fails (e.g., quota exceeded) fails cleanly — no partial writes, no crash, no silent data loss
**Plans**: TBD

### Phase 3: SRD Pack & Import Pipeline
**Goal**: Users can install a spell pack of their choosing — their own file or a compatible URL — into the app, with every pack validated and its HTML sanitized before anything renders; the built-in SRD content exists as a real, importable pack.
**Depends on**: Phase 2
**Requirements**: PKG-01, PKG-02, PKG-03, PKG-04, PKG-05, SRD-01
**Success Criteria** (what must be TRUE):
  1. A pack author can read a published JSON Schema + docs page describing the manifest and spell format, and validate their own pack file against it before sharing it (PKG-01)
  2. User can pick a pack JSON file from their device and have it installed into the app (PKG-02)
  3. User can enter a compatible URL (raw.githubusercontent/Gist/jsDelivr) and have the pack fetched and installed, with CORS limitations explained in the UI (PKG-03)
  4. Malformed JSON, oversized files, schema-invalid content, a duplicate `source` value, or `__proto__`/`constructor`/`prototype` keys are all rejected with a clear message before anything is written to storage (PKG-04)
  5. Every spell description from an imported pack passes through DOMPurify sanitization before it can reach any `dangerouslySetInnerHTML` sink — raw imported HTML is never rendered (PKG-05)
  6. A generated SRD pack (CC-BY EN subset) exists as a file conforming to the same pack schema and installs cleanly through the same pipeline (SRD-01)
**Plans**: TBD
**UI hint**: yes

### Phase 4: Loader Integration (Source-Dispatch)
**Goal**: The app's spell-loading engine natively supports both the bundled SRD pack and any number of user-installed packs from one dispatch point, with no hardcoded 4-dataset list.
**Depends on**: Phase 3
**Requirements**: SRD-03
**Success Criteria** (what must be TRUE):
  1. On first launch, with zero prior installs, the SRD pack is already loaded and its spells are immediately browsable — first open is never empty (SRD-03)
  2. The SRD pack and any packs already sitting in IndexedDB (installed via Phase 3's pipeline) both load at boot through the same dispatch path, with no separate per-source logic
  3. A previously-selected version preference that no longer resolves (e.g., points at a pack that's gone) still boots into a working version instead of a blank or broken state
**Plans**: TBD

### Phase 5: Plugin Manager UI & Version Selector
**Goal**: Users can see and manage everything they've installed in one place, the version selector reflects reality instead of a fixed list, and the built-in SRD content carries correct legal attribution.
**Depends on**: Phase 4
**Requirements**: MGMT-01, MGMT-02, MGMT-03, MGMT-04, MGMT-05, SRD-02
**Success Criteria** (what must be TRUE):
  1. User can see a list of installed packs with name, version, spell count, and source (MGMT-01)
  2. User can remove an installed pack; prepared/bookmarked spells that referenced it disappear from the active list without crashing, and come back if the pack is reinstalled (MGMT-02)
  3. The version selector enumerates whatever packs actually exist in storage at that moment, growing and shrinking as packs are installed/removed, instead of a fixed list of 4 (MGMT-03)
  4. When two installed packs share a spell, the UI shows an informative note (e.g., "2 versões de Bola de Fogo: SRD, MeuPack") instead of blocking install or silently merging (MGMT-04)
  5. With zero packs installed, the empty state explains what a pack is and links directly to import (MGMT-05)
  6. The app displays the verbatim CC-BY attribution text matching the exact SRD edition bundled (5.1 or 5.2), including notes on any modifications to the source text (SRD-02)
**Plans**: TBD
**UI hint**: yes

### Phase 6: Decommissioning & Migration
**Goal**: The four copyrighted spell datasets are fully removed from the live site and repo HEAD, and every existing user's prepared/bookmarked spells transition safely with nothing silently lost.
**Depends on**: Phase 5
**Requirements**: MIGR-01, MIGR-02, MIGR-03
**Success Criteria** (what must be TRUE):
  1. An existing user's prepared/bookmarked spells that still resolve (against SRD or their installed packs) work exactly as before after the update (MIGR-01)
  2. An existing user's prepared/bookmarked spells that no longer resolve against any installed pack are flagged as unresolved in the UI, never silently dropped (MIGR-01)
  3. The 4 protected JSON files are gone from the deployed site and repo HEAD, and the service worker precache list contains only the SRD file (MIGR-02)
  4. An existing user's first visit after the update shows clear, actionable guidance on how to import their own pack to restore full spell content (MIGR-03)
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 (done) → 2 → 3 → 4 → 5 → 6. Decommissioning (Phase 6) is deliberately last — irreversible, and gated on the SRD pack + import path (Phases 3-5) working end-to-end first.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Animation Verification & Polish | Pre-milestone | ad hoc | Complete | 2026-07-17 |
| 2. Plugin Storage Foundation | v2.0 | 0/TBD | Not started | - |
| 3. SRD Pack & Import Pipeline | v2.0 | 0/TBD | Not started | - |
| 4. Loader Integration (Source-Dispatch) | v2.0 | 0/TBD | Not started | - |
| 5. Plugin Manager UI & Version Selector | v2.0 | 0/TBD | Not started | - |
| 6. Decommissioning & Migration | v2.0 | 0/TBD | Not started | - |
