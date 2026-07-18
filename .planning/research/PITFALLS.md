# Pitfalls Research

**Domain:** BYOD content-plugin system for an existing client-side PWA (spell data import)
**Researched:** 2026-07-18
**Confidence:** MEDIUM (web-search findings cross-checked against MDN, WebKit's own blog, DOMPurify's repo, PortSwigger, and the official WotC SRD PDFs — no official docs/SDK for this exact combination exists, so nothing here reaches HIGH)

## Critical Pitfalls

### Pitfall 1: Sanitizing on import but not on render (or vice versa) — the codebase already has 4 unsanitized `dangerouslySetInnerHTML` sinks

**What goes wrong:**
`v10-hifi.jsx` renders `descHtml`/`upgradeHtml` via `dangerouslySetInnerHTML` in four places (spell card, side panel, detail screen, print sheet) with **zero sanitization today**. That's safe only because the 4 bundled JSON files are first-party. The instant a plugin can inject `description`/`descHtml`, every one of those four sinks becomes an XSS entry point — including the print portal, which runs in a *different* context (`window.open`/print window) and may not even be covered by the app's normal CSP.

**Why it happens:**
Teams sanitize once (usually at import) and assume it's covered forever, then a new render path gets added later that reads the same field without re-checking, or the sanitizer is applied to `description` but a sibling field (`upgradeHtml`, `higherLevels`, a future `notes` field) ships unsanitized because it "looked like plain text."

**How to avoid:**
- Sanitize **at import time**, once, with DOMPurify configured to an explicit tag/attribute allowlist (`b, i, em, strong, p, ul, ol, li, br, table/thead/tbody/tr/td/th` — whatever the current spell descriptions actually use, nothing else). Do NOT allow `<svg>`, `<style>`, `<img>`, or any `on*` attributes.
- Store only the sanitized HTML in IndexedDB — never store raw untrusted HTML "to sanitize later at render," that's the pattern that gets forgotten.
- Grep for every `dangerouslySetInnerHTML` call at plan/build time and confirm each one only ever receives a field that passed through the shared sanitizer. Treat this as one shared `sanitizeHtml(str)` utility, not four copy-pasted DOMPurify calls.
- The print portal (`hifi-print-request`) reads from the same stored data — confirm it also only touches post-sanitized fields; don't assume "it's just for printing" makes it safe.

**Warning signs:**
`grep dangerouslySetInnerHTML` finds a sink whose input didn't pass through the one shared sanitizer function; a new field added to the plugin manifest starts getting rendered raw "because it's short."

**Phase to address:**
Plugin engine / import phase (the phase that builds the manifest ingest + IndexedDB storage) — sanitization must ship in the same phase as import, not deferred to a "polish" pass.

---

### Pitfall 2: DOMPurify default config is not enough — SVG/MathML and mutation XSS (mXSS) slip through unconfigured sanitizers

**What goes wrong:**
DOMPurify's default profile allows SVG and MathML (useful for some apps, irrelevant and risky for spell text). Known bypass classes exist where a sanitizer approves markup that the browser's DOM parser later *reinterprets* differently (mutation XSS) — e.g. SVG `<animate href="javascript:...">`, or CDATA sections that look inert to the sanitizer but get reparsed into executable content once inserted into the live DOM.

**Why it happens:**
Developers install DOMPurify, call `DOMPurify.sanitize(html)` with no config, and assume "sanitized" means "safe for this specific content type." A generic sanitizer defends against generic HTML; it doesn't know spell descriptions never legitimately contain SVG.

**How to avoid:**
- Configure DOMPurify explicitly: `USE_PROFILES: { html: true }` only (excludes SVG/MathML), plus an explicit `ALLOWED_TAGS`/`ALLOWED_ATTR` allowlist scoped to what spell descriptions actually use.
- Pin and update the DOMPurify version — mXSS fixes ship as patch releases; an old pinned version (this project pins CDN versions with SRI hashes for React/Babel, so the same habit will likely apply here) can reintroduce a fixed bypass.
- Add a Content-Security-Policy as a second layer (the app already has no CSP per `CONCERNS.md` — this milestone is a good forcing function to add one, since untrusted HTML is now in scope).

**Warning signs:**
`DOMPurify.sanitize(x)` called with no second argument (no config object) anywhere in the codebase.

**Phase to address:**
Plugin engine / import phase — same as Pitfall 1, same shared sanitizer function.

---

### Pitfall 3: Trusting `JSON.parse` output structurally without validating it, letting malformed/oversized/malicious packs corrupt state or hang the tab

**What goes wrong:**
Three distinct failure modes get conflated as "just parse the JSON":
1. **Prototype pollution** — `JSON.parse` itself does *not* pollute `Object.prototype` (a `__proto__` key in JSON just becomes a normal own property), but the existing `adaptSpell()`/normalization pattern in this codebase (direct property copies, `??` fallbacks, spreads) is exactly the shape that becomes dangerous if it's ever changed to a generic deep-merge/`Object.assign` over untrusted keys. A plugin manifest with a `__proto__`, `constructor`, or `prototype` key merged carelessly can pollute the global prototype.
2. **Malformed/partial JSON** — a truncated download, a hand-edited pack, or a wrong-format file throws inside `JSON.parse` or produces an object missing expected fields; `adaptSpell()` already silently defaults missing fields to `''`/`0` per `CONCERNS.md`, so a bad pack won't crash, it'll silently render broken spells.
3. **Huge files** — nothing bounds import file size; a multi-hundred-MB "spell pack" (malicious or just a mistake) synchronously blocks the main thread during `JSON.parse` and can blow past IndexedDB's own soft/hard quota checks (see Pitfall 4).

**Why it happens:**
The existing `adaptSpell()` pattern was built for trusted, hand-curated data (`CONCERNS.md` already flags it has no schema validation) and BYOD inherits that same lenient path without anyone deciding to re-harden it.

**How to avoid:**
- Add a real import validation pass distinct from `adaptSpell()`'s normalization: reject (don't silently coerce) a pack that's missing `meta` or has a `spells` array with items missing required fields (`name`, `level`, `school`).
- Cap import file size before calling `JSON.parse` (check `File.size` from the file picker, or `Content-Length`/a byte cap while streaming a URL import) — reject with a clear message rather than hanging the tab.
- Explicitly strip/reject `__proto__`, `constructor`, `prototype` as top-level or nested keys in the manifest before any merge/assign step touches parsed plugin data.
- Run `JSON.parse` + validation off the main thread if pack size is non-trivial (`CONCERNS.md` already flags synchronous parse-blocking for the 4 bundled 700KB files; a Web Worker was already the recommended fix there — reuse it for plugin import too).

**Warning signs:**
An import "succeeds" but spells render with blank names/levels; the tab freezes for multiple seconds during import of a large file; no upper bound exists in code on accepted file size.

**Phase to address:**
Plugin engine / import phase.

---

### Pitfall 4: Assuming IndexedDB writes succeed and persist — especially on Safari

**What goes wrong:**
Two separate assumptions fail independently:
1. **Eviction:** Safari (13.1+/iOS 13.4+) deletes all script-writable storage — including IndexedDB — for any origin not visited by the user in 7 days of active browser use. A player who installs a plugin, doesn't open the *browser tab* version of the app for a week (even if they use the installed PWA occasionally — but if they're using the browser-tab version, not the home-screen-installed PWA, they're exposed), comes back to find their imported spell packs silently gone.
2. **Quota rejection:** IndexedDB writes can fail (`QuotaExceededError`) exactly like the localStorage writes `CONCERNS.md` already flags as unhandled — a large pack import can exceed available quota, especially on mobile Safari (starts at ~1GB but is influenced by device free space) or in private/incognito modes (much smaller quota, sometimes near-zero).

**Why it happens:**
IndexedDB "feels" unlimited compared to localStorage's ~5-10MB, so teams skip the same error handling they'd (hopefully) add for localStorage. Eviction is invisible in normal dev testing (nobody leaves a tab untouched for 7 days mid-sprint).

**How to avoid:**
- Wrap every IndexedDB write (plugin install) in error handling that catches `QuotaExceededError` and surfaces a clear message, not a silent failure — this project already has the exact same unhandled bug for `localStorage` per `CONCERNS.md`; don't reintroduce it in the new storage layer.
- Call `navigator.storage.persist()` after a plugin install, but treat it as best-effort — Chromium auto-grants/denies via opaque heuristics (PWA install status is one factor) with no prompt, Firefox prompts the user, Safari support is partial. Never gate core functionality on persistence being granted.
- Because eviction is real and largely out of the app's control, ship "export my plugins/characters" and "re-import" as a first-class recovery path, not a nice-to-have — treat storage as reconstructable-from-source (the SRD pack can always be re-fetched; user-imported packs need the user's original file kept somewhere, or a clear warning that losing the app data means losing the import until they re-import it manually).
- Test explicitly on Safari/iOS, not just Chrome — this is the browser where both eviction and quota behavior diverge most from Chromium's.

**Warning signs:**
No `try/catch` around `IDBObjectStore.put()`/transaction completion in the plugin storage code; no call to `navigator.storage.persist()`/`persisted()` anywhere; QA only ever tested in Chrome desktop.

**Phase to address:**
Plugin storage phase — the phase that builds the IndexedDB layer. Pair with the migration phase so eviction-recovery UX (export/re-import) ships alongside, not as a later fix.

---

### Pitfall 5: Migration silently orphans existing users' prepared-spell/bookmark references when the 4 embedded JSONs are removed

**What goes wrong:**
Prepared spells and bookmarks are currently stored per-character, almost certainly keyed by spell name/id against the bundled JSON (per `v11-character-editor.jsx`'s character serialization). Once the 4 protected JSONs are removed from distribution and replaced with an SRD subset + user-installed plugins, every existing user's `localStorage` character data references spells that may no longer resolve to anything at all (SRD subset is a *subset*, not equivalent — plenty of prepared non-SRD spells will vanish) unless the user also happens to import an equivalent plugin.

**Why it happens:**
Migration work tends to focus on "does the new system work for new data" and treats existing `localStorage` state as something that'll "just still be there" — but the *referenced dataset itself* is changing shape and size (2014/2024 × PT/EN full sets → SRD-only + optional plugins), which is a different and easy-to-miss failure mode from a plain schema migration.

**How to avoid:**
- Before removing the 4 JSONs from the deploy, write a one-time migration/detection pass: on first load post-upgrade, check each character's prepared/bookmarked spell references against the now-available dataset (SRD + installed plugins); flag/mark any that no longer resolve instead of silently dropping them from the UI.
- Show the user what's now "missing" (spell name still shown, greyed out, with a note like "not in an installed pack — install the pack that includes this spell") rather than making prepared spells silently disappear from their sheet.
- Never delete the unresolved references from stored character data during migration — keep them (they still have the spell name/id even if the description can't render) so that if the user later imports a matching plugin, the reference re-resolves automatically without them having to re-prepare everything by hand.
- This is exactly the kind of case `CONCERNS.md` already flags generically ("Character Serialization/Deserialization... Add version number to stored character format... Add migration function") — this milestone is where that generic advice becomes concrete and urgent.

**Warning signs:**
QA only tests migration on a fresh/empty character list; no test exists loading an existing `localStorage` snapshot from before the milestone and checking what its prepared-spell list renders as after upgrade.

**Phase to address:**
Decommissioning/migration phase (the phase removing the 4 JSONs) — must ship *after* the plugin engine and SRD pack are live, and must include the detection/preservation logic above, not just "delete the files and see what breaks."

---

### Pitfall 6: Believing "we removed the files from git" means the protected spell JSONs are gone

**What goes wrong:**
Rewriting history (`git filter-repo`/BFG) to strip the 4 protected JSONs only prevents *new* clones/fetches of the rewritten origin from getting them. It does not touch: any existing local clone or fork (including on GitHub, if the repo is/was public), CI caches, anyone's downloaded zip, or GitHub's own cached diffs/blobs of the old commits until GC runs (and even then, forks keep their own copies indefinitely). Since this project's decision log explicitly frames the removal as a *copyright* protection measure, an incomplete belief that "deleting from git = deleting everywhere" is a false sense of compliance, not an actual fix.

**Why it happens:**
`git rm` + commit "feels" like deletion because the working tree and default branch view look clean; the distributed nature of git (every clone is a full copy of history) is easy to forget when working from a single primary remote.

**How to avoid:**
- Treat "these 4 files were ever committed to a public repo" as **permanent** — the fix is architectural (BYOD: don't ship the files going forward) not historical (don't rely on scrubbing git history as the compliance mechanism).
- If rewriting history anyway (to shrink repo size / remove from casual future browsing), still do it — it's good hygiene — but communicate internally that it is not the compliance boundary. The compliance boundary is "the app no longer distributes the files from this point forward" and "the SRD pack + BYOD replaces them."
- If the repo has any existing forks (check GitHub's fork list before this milestone ships), note that those forks retain the files regardless of what happens to the origin; nothing in this project's control fixes that.
- Don't spend milestone budget on aggressive history-rewriting tooling (BFG, filter-repo, force-push coordination) as if it were the actual deliverable — the real deliverable is the BYOD architecture change itself.

**Warning signs:**
A task/requirement phrased as "remove the JSONs from git history" treated as the actual protection mechanism, rather than as optional cleanup after the architectural fix (BYOD) is what actually matters.

**Phase to address:**
Decommissioning phase — scope it as "stop distributing going forward + optional history cleanup for hygiene," not "history cleanup = the fix."

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|--------------------|-----------------|------------------|
| Sanitize only `description`, skip `descHtml`/`upgradeHtml`/future rich fields | Faster to ship | Silent XSS hole the moment a plugin uses the un-sanitized field | Never — route all rich-text plugin fields through one shared sanitizer |
| Skip `navigator.storage.persist()` call entirely | One less API to wire up | Higher chance of silent data loss on Safari/low-storage devices | Only acceptable if export/import is solid enough that loss is a minor annoyance, not data loss |
| Use `DOMPurify.sanitize(html)` with default config | Zero config effort | SVG/MathML and mXSS vectors remain open | Never for this project — always pass an explicit tag/attr allowlist |
| Drop unresolved prepared-spell references silently during migration | Cleaner-looking character sheet post-migration | Users lose prepared spells with no explanation, erodes trust right at the moment they need trust in the new system | Never — always preserve + surface as "install a pack for this" |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|--------------------|
| DOMPurify (new dependency) | Loaded with default config, or loaded once but only wired into one of the four render sites | One shared `sanitizeSpellHtml()` util, explicit allowlist, called at import time before IndexedDB write, all four render sites read pre-sanitized data only |
| IndexedDB | Assuming writes always succeed like a simple `localStorage.setItem` | Wrap every write in try/catch for `QuotaExceededError`; surface failure to the user, don't fail silently like the existing `localStorage` bug |
| `navigator.storage.persist()` | Treating a `true` return as a permanent guarantee | Best-effort only; still design for eviction (export/import) regardless of the result |
| URL-based plugin import (fetch from user-provided URL) | No size cap before/while streaming the response | Check `Content-Length` if present, cap streamed bytes regardless, reject oversized responses before `JSON.parse` |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Rendering plugin `description`/`descHtml` via `dangerouslySetInnerHTML` without sanitization | Full XSS — attacker-crafted pack can run arbitrary JS in the app's origin, reading/writing every character in `localStorage`/IndexedDB (CONCERNS.md already flags localStorage as fully readable by any injected script) | Sanitize once at import with a strict allowlist; never widen the allowlist without re-auditing all four render sites |
| Generic deep-merge of parsed plugin JSON into existing app state/config | Prototype pollution via `__proto__`/`constructor`/`prototype` keys | Explicitly block those three key names in any merge/assign path touching untrusted JSON; prefer explicit field-by-field copying (as `adaptSpell()` already does) over generic deep merge |
| No CSP currently configured (per `CONCERNS.md`) while adding an untrusted-HTML-rendering feature | Removes a defense-in-depth layer exactly when the app starts rendering less-trusted content | Add a CSP (even a modest one restricting script-src to self + the already-pinned CDN origins) as part of this milestone, not a future one |
| No file-size cap on plugin import | DoS via giant file freezing the tab, or quota exhaustion | Reject oversized files before parse; parse off main thread for larger-than-trivial packs |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|--------------|-------------------|
| Import fails with a raw JS error / console-only message | User has no idea why their pack didn't load, abandons the feature | Validate and surface specific, actionable errors ("this file is missing a `meta` section", "this file is too large") |
| Prepared spells vanish post-migration with no explanation | User thinks the app broke or their data was lost | Show a clear "N prepared spells need a pack" state pointing at what to install |
| Plugin install has no visible size/storage feedback | User imports packs until storage silently fails | Show a running storage-used indicator; warn before hitting quota, not after |

## "Looks Done But Isn't" Checklist

- [ ] **HTML sanitization:** Looks done if `DOMPurify.sanitize()` appears anywhere in the import path — verify it's called with an explicit tag/attribute allowlist (not defaults) and that *all four* `dangerouslySetInnerHTML` sites (including the print portal) only ever read post-sanitized fields.
- [ ] **Import validation:** Looks done if `JSON.parse` is wrapped in try/catch — verify there's also a schema check (required fields present), a file-size cap, and explicit `__proto__`/`constructor`/`prototype` key rejection before any merge step.
- [ ] **IndexedDB storage:** Looks done if plugins install and appear in the UI — verify write failures (`QuotaExceededError`) are caught and surfaced, and that `navigator.storage.persist()` is called (even though it's best-effort).
- [ ] **Migration:** Looks done if the app loads without errors after the JSONs are removed — verify by testing against an actual pre-milestone `localStorage` snapshot with prepared/bookmarked spells from outside the SRD subset, and confirming those references are preserved/flagged, not silently dropped.
- [ ] **CC-BY attribution:** Looks done if a credits line exists somewhere — verify the exact required attribution string is used verbatim per SRD version (5.1 vs 5.2 have different required text), that any modifications made to the SRD text are noted, and that the required warranty/liability disclaimer is present.
- [ ] **Repo cleanup:** Looks done if `git filter-repo` ran and the files are gone from `git log`/GitHub UI — verify the team understands this is hygiene only, not the actual compliance boundary (see Pitfall 6), and check whether any forks of the repo exist that still carry the files.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| XSS shipped via an unsanitized render site | HIGH | Patch the sink immediately, force-invalidate cached service-worker app shell so all users get the fix, audit whether any user actually imported a malicious pack (can't know for sure — client-side only, no telemetry) |
| Safari evicted a user's imported plugins | LOW–MEDIUM | If export/import shipped: user re-imports their saved file. If not: user must re-download/re-source the original pack — this is why export/import must ship alongside plugin storage, not after |
| Migration silently dropped prepared-spell references before the fix above shipped | MEDIUM | Cannot recover the reference itself once localStorage no longer has it (already overwritten) — only fixable going forward for users who haven't hit the migration yet; underscores why this needs to be right on first ship, not iterated on |
| Protected JSONs already pushed to a public repo before BYOD ships | HIGH (effectively unrecoverable for past exposure) | Ship BYOD to stop future distribution; optionally rewrite history for hygiene; accept and document that historical exposure cannot be undone |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|----------------|
| Unsanitized `dangerouslySetInnerHTML` sinks (#1, #2) | Plugin engine / import phase | Grep confirms all `dangerouslySetInnerHTML` call sites (spell card, side panel, detail screen, print portal) only receive output of the one shared sanitizer; manual test importing a pack containing `<img onerror=alert(1)>`, `<svg><animate href="javascript:alert(1)">`, and `<style>` payloads confirms none execute |
| Import validation / prototype pollution / oversized files (#3) | Plugin engine / import phase | Manual test importing: truncated JSON, JSON with `__proto__` key, a file above the size cap, a manifest missing `meta` — each produces a clear rejection, none corrupt app state |
| IndexedDB quota/eviction (#4) | Plugin storage phase | Manual test on Safari/iOS: install a plugin, verify `persist()` is called; simulate quota exhaustion (or test on a device with low free space) and confirm a clear error instead of silent failure |
| Migration orphaning prepared-spell references (#5) | Decommissioning/migration phase | Load a real pre-milestone `localStorage` export with non-SRD prepared spells, run through migration, confirm references are preserved/flagged rather than dropped |
| CC-BY attribution correctness | SRD pack phase | Diff the shipped attribution text against the verbatim required strings for the SRD version(s) actually used; confirm modifications are noted if the SRD text was adapted |
| Git-history-removal-as-compliance misunderstanding (#6) | Decommissioning phase | Phase scope explicitly states BYOD architecture is the compliance boundary; history rewrite (if done) is labeled hygiene-only in the phase notes |

## Sources

- [DOMPurify GitHub](https://github.com/cure53/dompurify) — sanitizer config, mXSS mitigation
- [From SVG and back: mutation XSS via namespace confusion for DOMPurify < 2.2.2 bypass](https://vovohelo.medium.com/from-svg-and-back-yet-another-mutation-xss-via-namespace-confusion-for-dompurify-2-2-2-bypass-5d9ae8b1878f)
- [Preventing XSS in React (Part 2): dangerouslySetInnerHTML — Pragmatic Web Security](https://pragmaticwebsecurity.com/articles/spasecurity/react-xss-part2.html)
- [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [WebKit blog: Updates to Storage Policy (7-day cap)](https://webkit.org/blog/14403/updates-to-storage-policy/)
- [MDN: StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)
- [PortSwigger: What is prototype pollution?](https://portswigger.net/web-security/prototype-pollution)
- [MDN: JavaScript prototype pollution](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Prototype_pollution)
- [SRD 5.1 official CC license PDF (Wizards of the Coast)](https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf)
- [SRD 5.2.1 (D&D Beyond)](https://www.dndbeyond.com/srd)
- [GitHub Docs: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- `.planning/codebase/CONCERNS.md` — existing unsanitized `localStorage`, unhandled quota errors, unvalidated `?build=` payload, no schema validation on spell data (internal codebase analysis, 2026-07-17)
- `v10-hifi.jsx` (read directly, 2026-07-18) — confirmed 4 unsanitized `dangerouslySetInnerHTML` call sites at lines 333, 340, 649, 970, 979

---
*Pitfalls research for: BYOD content-plugin system, Grimório do Jogador v2.0*
*Researched: 2026-07-18*
