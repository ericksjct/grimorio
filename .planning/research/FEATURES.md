# Feature Research

**Domain:** BYOD content-plugin system for a D&D 5e spellbook PWA (comparable to VTT module systems, TTRPG homebrew JSON ecosystems, and note-taking plugin marketplaces)
**Researched:** 2026-07-18
**Confidence:** MEDIUM (cross-referenced across 3+ independent comparable systems; SRD attribution text is HIGH — confirmed via official WotC PDF filename/URL plus three independent secondary sources quoting it verbatim)

## Comparable Systems Surveyed

| System | What it is | Relevance to this milestone |
|---|---|---|
| **Foundry VTT modules/compendia** | Desktop/server VTT with a first-party module manifest format (`module.json`), install-by-URL or from a curated hub, auto-update via manifest polling | Closest analog for manifest schema (`meta` block), update/versioning UX, and name-based conflict resolution on import |
| **5etools homebrew JSON + Plutonium** | Community JSON schema for 5e content (draft-07 JSON Schema), imported via file upload or URL, rendered by 5etools' own viewer; Plutonium is a Foundry module that also consumes these JSONs | Directly comparable to this project's own JSON+manifest plan — same file/URL import UX, same "unique source tag" convention to avoid collisions |
| **Obsidian community plugins** | In-app browse → install → enable → update flow, gated behind an explicit "Restricted mode" opt-in toggle | Best model for the *manage UI* (list installed, enable/disable, update-check button) and for "safe by default, opt-in to 3rd-party code" framing (relevant given this project sanitizes HTML from imported packs) |
| **AboveVTT / Shard** (D&D Beyond browser extensions) | Overlay extensions that read the user's own paid D&D Beyond content in-browser; no independent plugin/pack format of their own | Weak analog — they piggyback on D&D Beyond's licensed data rather than accepting arbitrary user-supplied packs. Confirms there's no "install packs from strangers" precedent in the D&D Beyond ecosystem; only Foundry/5etools have that pattern. Low weight in this research. |
| **D&D Beyond Homebrew** | First-party homebrew creator + a publish/subscribe model (Hero/Master tier can publish; others "add to their library") | Useful negative example: publishing requires a paid tier and a moderated central catalog — out of scope for a local-only offline PWA with no backend |

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = the plugin system feels incomplete or unsafe.

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Manifest metadata: name, author, version, license/source | Every comparable system (Foundry `module.json`, 5etools homebrew "source" tag) requires this minimum before content is even loaded. Users need to know what they installed and who to credit/report to. | LOW | Already decided in PROJECT.md: schema = existing spell JSON + a `meta` header. Add `name`, `author`, `version`, `license` (free text, not enforced), `source` (unique short tag, mirrors 5etools convention to avoid spell-ID collisions) |
| Install via file upload | Baseline for any BYOD system; this project already plans this | LOW | Read file client-side, validate against schema, sanitize HTML, write to IndexedDB |
| Install via URL | Foundry and Plutonium both support this as the primary distribution path (packs live on GitHub/Gist, users paste a raw URL) | LOW-MEDIUM | `fetch()` the URL client-side; same validation/sanitization pipeline as file upload. Needs CORS-tolerant hosting guidance in user-facing docs (raw GitHub URLs work; some hosts don't send CORS headers) |
| List installed packs (name, version, spell count, source) | Table stakes for any "manage installed content" screen (Obsidian's Installed Plugins list, Foundry's Module Management screen) | LOW | Simple list view reading pack metadata from IndexedDB |
| Uninstall / remove a pack | Obsidian, Foundry, Plutonium all support one-click removal; users need an escape hatch, especially for mis-imported or copyrighted files | LOW | Delete IndexedDB record; must also handle characters that reference now-missing spells (see Pitfalls/Dependencies below) |
| Duplicate/conflict handling when the same spell exists in two packs | Foundry resolves this at compendium-export time with an explicit "overwrite vs. keep both" toggle; 5etools avoids it structurally by requiring a unique `source` tag per brew, so the same spell name from two sources is two distinct records, not a collision | LOW-MEDIUM | Recommended approach: adopt the 5etools pattern — namespace every imported spell by `(source, name)`, not `name` alone. No merge UI needed if identity includes source. Surface duplicates only as a "you have 2 versions of Fireball installed (SRD, MyPack)" info note in the browser, not a blocking conflict |
| Built-in free pack pre-installed (no dead-on-first-open state) | Every comparable system either ships bundled reference content (Foundry ships no content but the store front-loads a "5e SRD" free pack under the OGL/CC-BY; 5etools bundles the SRD-derived core data by default) — a totally empty app on first load reads as broken | LOW (data already exists, just needs the manifest header + CC-BY subset filtering) | Directly matches PROJECT.md's planned SRD pack — this is the mechanism that prevents an empty-state problem, not a separate empty-state UI |
| Empty-state / onboarding screen when zero packs installed | General UX table stakes for any "bring your own content" app (not proven by a single citable domain source, but universal pattern — e.g. Obsidian's Restricted Mode screen, browser extension stores' "no extensions" state) | LOW | Given the built-in SRD pack ships pre-installed, true zero-pack state should be rare — but must still be handled gracefully if a user removes even the SRD pack (explain what a pack is + link to import). LOW confidence citation (general UX principle, not a domain-specific finding) |
| Version shown per pack + per spell dataset in the existing version selector | Existing app already has a version selector (2014/2024 × PT-BR/EN); milestone requirement is "versões dinâmicas no seletor" | LOW-MEDIUM | Extend selector to enumerate installed pack `meta.version` + `meta.source` instead of 4 hardcoded entries |
| CC-BY attribution notice visible in the app | Legally required by the SRD license the moment SRD content is embedded — see dedicated section below | LOW | Static footer/about-panel text, not a feature to build so much as a compliance requirement |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required for the milestone, but valuable and cheap given existing architecture.

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| XSS sanitization on import (already decided) | 5etools/Foundry both trust their ecosystem's authors implicitly and have had homebrew-JSON-as-attack-vector concerns raised in their communities; this project sanitizing on ingest by default is stricter than either comparable system does out of the box | LOW-MEDIUM | Already a locked decision in PROJECT.md — whitelist tags on `description` HTML at import time, not at render time |
| Offline-first pack storage (IndexedDB, no server round-trip) | Foundry requires a running server; 5etools/Plutonium require the 5etools site or Foundry to be open. A fully offline, installable PWA that still supports arbitrary user content is a differentiator no comparable tool offers | LOW (architecture already exists) | This is the app's existing core value extended to plugins, not new work — worth naming explicitly in the roadmap as the reason this milestone matters |
| "Unique source tag" enforced at import, not just convention | 5etools relies on brew authors manually picking a unique `source` string (community convention, not enforced) — collisions do happen in practice per the wiki's own guidance ("use a unique json source name") | LOW | Cheap to actually validate at import time (reject/warn if `source` collides with an already-installed pack) rather than trusting the author, closing a gap the comparable systems leave open |
| Update-check via manifest URL re-fetch (semver compare) | Matches Foundry's model (poll the same URL, compare version strings) without needing a package registry | MEDIUM | Only worth building if packs are expected to be updated post-install; if most user packs are static files created once, this can be deferred — flag as a P2, not P1 |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems, given this project's constraints (no backend, no build step, offline-first, local-only).

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| Central pack marketplace/catalog (like D&D Beyond's publish-and-browse homebrew, or a Foundry-Hub-style directory) | "Users should be able to discover packs without hunting for URLs" | Requires a backend, moderation, and hosting — directly violates the project's locked "no backend, no accounts" constraint (PROJECT.md Out of Scope) | Point users to community conventions instead: a simple `docs/` page or README section listing known-good pack URLs, maintained as documentation, not app infrastructure |
| Automatic silent updates of installed packs | Feels convenient, matches auto-updating apps | Silently rewriting a user's imported content (which may be hand-edited homebrew) without consent risks destroying local edits and violates the "your data, your control" BYOD premise | Manual "check for updates" action (mirrors Obsidian's explicit button, not Foundry's more automatic background check) — user reviews and confirms before overwrite |
| Full compendium-style overwrite/merge UI (Foundry's "overwrite existing docs with same name?" dialog) | Looks more polished, avoids "duplicate spell" clutter | Overkill complexity for a spellbook browser; Foundry needs it because it manages arbitrary document types (actors, items, scenes) with cross-references — this app only manages spells, and source-namespacing (see Table Stakes) already avoids true collisions without a merge dialog | Namespace by `(source, name)` at the data layer; no interactive merge step needed |
| Bundling more than the free SRD content by default "to be helpful" | Users want more spells pre-loaded so the app isn't sparse on first launch | Directly re-creates the exact copyright problem this milestone exists to solve (PROJECT.md: "protection... platform does not distribute protected content") | Ship only the CC-BY subset; make import fast/easy enough (file or URL, two clicks) that adding a full 2024 PHB pack the user already owns is trivial |
| Plugin sandboxing / arbitrary JS in packs (true "plugin" execution, not just data) | The word "plugin" evokes Obsidian-style executable plugins | Massive security surface (arbitrary code execution client-side) for zero benefit — this project's packs are pure data (spell JSON), not code | Keep packs strictly data-only; the existing HTML-sanitization decision already draws this boundary correctly |

## Feature Dependencies

```
Manifest metadata (name/author/version/license/source)
    └──requires──> Existing spell JSON schema (validated, already audited per PROJECT.md decision)

Install via file/URL
    └──requires──> Manifest metadata (to know what was just installed)
    └──requires──> IndexedDB storage (already decided — localStorage quota too small)
    └──requires──> XSS sanitization (already decided — must run before persisting HTML descriptions)

Duplicate/conflict handling (source-namespacing)
    └──requires──> Manifest metadata (source tag must exist and be unique)

Dynamic version selector
    └──requires──> Manifest metadata (version field) + Install via file/URL (there must be something to list)

Manage UI (list/install/remove)
    └──requires──> Manifest metadata + Install via file/URL + IndexedDB storage

Built-in SRD pack
    └──requires──> Manifest metadata (SRD pack needs the same header as user packs — dogfoods the format)
    └──enhances──> Empty-state onboarding (pre-installed pack means true empty state is rare, not eliminated)

CC-BY attribution notice
    └──requires──> Built-in SRD pack (attribution is only legally required once SRD content ships)

Decommission of 4 bundled copyrighted JSONs
    └──requires──> Built-in SRD pack (must have a working default before removing the old defaults)
    └──requires──> Install via file/URL (existing users need a path to restore their own copies of the removed content)
    └──conflicts with──> Anti-feature "bundle more than SRD" (the whole point is removing non-free content, not replacing it with more)

Update-check via manifest URL (differentiator, P2)
    └──requires──> Manifest metadata (version field) + Install via URL (need a stable URL to re-poll)
```

### Dependency Notes

- **Everything requires manifest metadata first.** This is the foundation phase — it must land before install flows, the manage UI, or the version selector, because all of them read `meta.name/author/version/source`.
- **Duplicate handling requires manifest metadata's `source` field specifically**, and should be validated (uniqueness check) at import time, not left as an unenforced convention like 5etools does.
- **Decommissioning the 4 bundled JSONs is the last dependency in the chain** — it requires both a working built-in replacement (SRD pack) AND a working import path (so existing users aren't stranded), confirming the roadmap order implied by PROJECT.md's own phrasing ("SRD embutido" then "descomissionamento").
- **CC-BY attribution is a hard prerequisite gate, not a nice-to-have**, on shipping the SRD pack — see next section.

## SRD CC-BY-4.0 Attribution Requirements (Concrete)

Two SRD versions are relevant to this project's 2014/2024 dual-edition support, and WotC treats them as **separate documents with separate attribution strings** — do not reuse the 5.1 string for 5.2 content or vice versa.

**SRD 5.1 (2014 rules) — required attribution text, verbatim:**
> "This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode."

**SRD 5.2 (2024 rules) — required attribution text:**
> "This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd." Licensed under CC-BY-4.0.

**Additional WotC-specific rules (from SRD 5.1 legal section, cross-confirmed by EN World forum discussion and a5esrd's compliance guide):**
- "Please do not include any other attribution regarding Wizards other than that provided above." — i.e., don't add extra WotC branding/thanks beyond the exact required sentence.
- You *may* separately state the work is "compatible with fifth edition" or "5E compatible" — this is a permitted trademark-adjacent claim distinct from the CC attribution itself.
- CC-BY-4.0 itself (not just WotC's SRD-specific ask) requires, per license section 3(a): attribution of the licensor, a copyright notice if supplied, a link to the license, and an indication if changes were made to the material.

**Practical implementation for this app:**
- Since the app supports both 2014 and 2024 rule sets, the SRD pack(s) need **edition-specific attribution strings** — if both an SRD 5.1-derived pack and an SRD 5.2-derived pack ship, both attribution blocks must appear (whichever pack is active/installed), not a merged/paraphrased one.
- Attribution must be **visible in the shipped app** (an About/Credits panel or footer is standard practice across CC-BY-licensed SRD tools reviewed — a5esrd, Tribality, and Roll20's SRD 5.2 explainer all place it in an about/legal page, not buried in a README only).
- Do not imply endorsement by Wizards of the Coast; do not use WotC/D&D logos or trade dress (this is a trademark, not copyright, restriction, but it travels with the same CC-BY compliance conversation and should not be conflated with "SRD content is CC-BY so anything D&D-branded is fine").
- **Confidence: HIGH for the attribution string text and the "SRD 5.1 vs 5.2 are separate licensed documents" fact** — corroborated independently by a5esrd.com (community CC-BY compliance guide), EN World forum thread quoting WotC's own SRD PDF, Roll20's official SRD 5.2 explainer, and D&D Beyond's own community posts. Direct extraction from the official WotC PDF (`media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf`) was attempted but the tool could not parse the PDF's text layer — the citation above rests on the three independent secondary sources agreeing verbatim, which satisfies the multi-source verification bar even without the primary PDF's raw text.
- **Not legal advice** — this is a documentation summary sufficient to inform a roadmap/attribution-panel copy, not a substitute for review by someone qualified if there's ambiguity about a specific pack's content mix (e.g., a user-imported pack that blends SRD and non-SRD text is the user's compliance problem, not this app's, as long as the app's own bundled SRD pack is correctly attributed).

## MVP Definition

### Launch With (v2.0 milestone)

Minimum viable product for this milestone specifically (per PROJECT.md's stated target features) — what's needed to validate BYOD works and legally decommission the bundled JSONs.

- [ ] Manifest metadata schema (`meta`: name, author, version, license, source) — everything else depends on it
- [ ] Install via file upload — core BYOD mechanism
- [ ] Install via URL — core BYOD mechanism, matches Foundry/Plutonium expectations
- [ ] IndexedDB storage for installed packs — already decided, required by quota constraints
- [ ] XSS sanitization on import — already decided, required before any HTML is persisted/rendered
- [ ] Source-namespaced spell identity (no true "conflict" state needed if this is done right)
- [ ] Manage UI: list installed packs, remove a pack
- [ ] Dynamic version selector reading installed packs instead of 4 hardcoded entries
- [ ] Built-in SRD pack (CC-BY EN subset), pre-installed by default
- [ ] CC-BY attribution panel/footer with edition-correct required text
- [ ] Migration path + removal of the 4 bundled copyrighted JSONs from the repo/site

### Add After Validation (v2.x)

- [ ] Update-check via manifest URL re-fetch (semver compare) — only valuable once packs are actually being updated post-release; premature before any pack has a v2
- [ ] "You have 2 versions of X installed" informational note in spell browser — nice polish once source-namespacing ships, not required for it to function correctly
- [ ] Import validation error messages tuned from real user-submitted malformed packs (needs real usage data first)

### Future Consideration (defer)

- [ ] Central pack directory/catalog page (documentation-only, not app infrastructure) — explicitly an anti-feature as in-app infrastructure; a plain docs page could be considered later once there's an actual community of packs to list
- [ ] PT-BR SRD pack — WotC's official SRD is English-only; a PT-BR CC-BY pack would require either a community translation effort or waiting for an official one. Out of scope until that source material exists
- [ ] Pack export/backup (download an installed pack back out as a file) — not requested in PROJECT.md; only relevant once users are hand-editing packs, which isn't in scope this milestone

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| Manifest metadata schema | HIGH | LOW | P1 |
| Install via file | HIGH | LOW | P1 |
| Install via URL | HIGH | LOW-MEDIUM | P1 |
| IndexedDB storage | HIGH | LOW (decided) | P1 |
| XSS sanitization | HIGH (safety) | LOW-MEDIUM (decided) | P1 |
| Source-namespaced identity | MEDIUM-HIGH | LOW | P1 |
| Manage UI (list/remove) | HIGH | LOW | P1 |
| Dynamic version selector | HIGH | LOW-MEDIUM | P1 |
| Built-in SRD pack | HIGH | LOW (data exists) | P1 |
| CC-BY attribution panel | HIGH (legal) | LOW | P1 |
| Decommission bundled JSONs | HIGH (the whole point) | MEDIUM (repo history cleanup) | P1 |
| Update-check via manifest URL | MEDIUM | MEDIUM | P2 |
| Duplicate-spell info note | LOW-MEDIUM | LOW | P2 |
| Central pack directory (docs page) | LOW-MEDIUM | LOW (if just a doc) | P3 |
| PT-BR SRD pack | MEDIUM | HIGH (blocked on source material) | P3 |
| Pack export/backup | LOW | LOW-MEDIUM | P3 |

**Priority key:**
- P1: Must have for this milestone's launch
- P2: Should have, add once P1 is validated in real use
- P3: Nice to have, deferred — some blocked on external factors (official PT-BR SRD, community pack ecosystem existing)

## Competitor Feature Analysis

| Feature | Foundry VTT | 5etools + Plutonium | This project's approach |
|---|---|---|---|
| Manifest fields | `id`, `title`, `description`, `version`, `authors[]`, `compatibility{min,max}` — id/title/description/version required | Freeform per-brew, convention-driven; requires a unique `source`/`json` key per the wiki's own guidance, not schema-enforced | `meta{name, author, version, license, source}` — validate `source` uniqueness at import time (stricter than 5etools' convention-only approach) |
| Install methods | Curated package browser (registry) + manual manifest URL entry | File upload, URL, or pull from the community `homebrew` GitHub repo | File upload + URL only — no registry/browser (matches this app's no-backend constraint) |
| Conflict resolution | Explicit "overwrite by name?" toggle at compendium export/import time | Implicit — avoided via unique source tags, not resolved via UI | Adopt 5etools' approach: identity = `(source, name)`, no merge UI needed |
| Update mechanism | Poll stable manifest URL, compare semver via `isNewerVersion` helper | Manual re-import; Plutonium re-fetches on demand from configured sources | Deferred to P2: manual re-fetch-and-compare, mirroring Foundry's semver logic but user-triggered (not automatic), consistent with Obsidian's explicit "check for updates" button rather than silent background updates |
| Built-in default content | None bundled by Foundry core; the store separately offers a free 5e SRD content module | 5etools bundles core (non-SRD, fair-use) reference data by default | Bundle CC-BY SRD subset only, pre-installed — the legally clean equivalent of Foundry's separate "free SRD module" offering |
| Sandbox/security model | Trusts installed modules fully (can run arbitrary JS) | Trusts homebrew JSON renderers; JSON itself isn't code but rendered HTML fields exist | Stricter than both: packs are data-only (no JS), and HTML description fields are sanitized on import |

## Sources

- [Introduction to Module Development | Foundry VTT](https://foundryvtt.com/article/module-development/) — manifest field requirements (MEDIUM confidence, official docs via unverified single websearch snippet, but internally consistent and cross-referenced by Foundry Wiki)
- [Package Management | Foundry Virtual Tabletop](https://foundryvtt.com/article/package-management/) — manifest URL / update-check mechanism (MEDIUM)
- [Compendium Packs | Foundry Virtual Tabletop](https://foundryvtt.com/article/compendium/) — name-based conflict resolution on export/import (MEDIUM)
- [FeaturePlutonium: Importing — 5etools Community Wiki](https://wiki.5e.tools/index.php/FeaturePlutonium:_Importing) — file/URL/community-repo import options (MEDIUM)
- [Homebrew: Adding Content — 5etools Community Wiki](https://wiki.5e.tools/index.php/Homebrew:_Adding_Content) — unique source-tag convention (MEDIUM)
- [GitHub — TheGiddyLimit/homebrew](https://github.com/TheGiddyLimit/homebrew) — community homebrew JSON repo structure (MEDIUM)
- [Community plugins — Obsidian Help](https://obsidian.md/help/community-plugins) — browse/install/enable/update UX flow, restricted-mode-by-default framing (MEDIUM)
- [AboveVTT — Chrome Web Store](https://chromewebstore.google.com/detail/abovevtt/ipcjcbhpofedihcloggaichibomadlei) — confirms overlay-extension model has no independent pack format (LOW-MEDIUM, used only to rule out relevance)
- [Sharing and Publishing Homebrew Content – D&D Beyond](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747210455828-Sharing-and-Publishing-Homebrew-Content) — official D&D Beyond support doc on paid-tier publish/subscribe homebrew model (MEDIUM, official support source)
- [How to Use Creative Commons — Advanced 5E System Reference Document (a5esrd.com)](https://a5esrd.com/how-to-use-creative-commons) — SRD 5.1 attribution text, verbatim quote (MEDIUM-HIGH, community compliance guide directly quoting WotC)
- [D&D General - How To Use Creative Commons — EN World forum](https://www.enworld.org/threads/how-to-use-creative-commons.695456/) — independent corroboration of SRD 5.1 attribution text and "no other Wizards attribution" rule (MEDIUM)
- [D&D SRD 5.2 – What You Need to Know — Roll20](https://pages.roll20.net/dnd-srd) — SRD 5.2 attribution text and CC-BY-vs-OGL simplicity framing (MEDIUM, official Roll20/WotC partner content)
- [System Reference Document 5.1 Legal Information (official PDF)](https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf) — primary source; located and cited but text extraction failed in-session, relied on corroborating secondary sources above (confidence for the attribution string: HIGH via triangulation)
- [SRD v5.2.1 - System Reference Document — D&D Beyond](https://www.dndbeyond.com/srd) — SRD 5.2 canonical location, confirms 5.1/5.2 are separate documents (MEDIUM-HIGH, official first-party source)
- [System Reference Document 5.2 Legal Information (official PDF)](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.pdf) — primary source location for SRD 5.2 attribution text (referenced, not directly parsed)

---
*Feature research for: BYOD spell-plugin system, D&D 5e spellbook PWA*
*Researched: 2026-07-18*
