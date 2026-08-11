---
status: testing
phase: 03-srd-pack-import-pipeline
source: [03-VERIFICATION.md]
started: 2026-08-11T23:52:24Z
updated: 2026-08-11T23:52:24Z
---

## Current Test

number: 1
name: Theme sweep — app and pack-docs.html across 6 themes x light/dark
expected: |
  App boots clean in all 12 combinations, import dialog and pack-docs.html render
  correctly, no CSP violation and no console error. pack-docs.html tables scroll
  horizontally in a narrow window instead of clipping.
awaiting: user response

## Tests

### 1. Theme sweep — app and pack-docs.html across 6 themes x light/dark
expected: App boots clean in all 12 combos (Catppuccin, Solarized, Nord, Monokai, Parchment, Daylight x light/dark); no CSP console violation; import dialog legible with contrast on buttons/fields; pack-docs.html follows the saved theme and its two tables scroll horizontally instead of clipping.
result: [pending]

### 2. Print output with a prepared spell
expected: Print sheet renders unchanged from pre-phase behavior. The print sheet runs in a separate document context, so it is a distinct render path from the main app.
result: [pending]

### 3. Form-state retention after a rejected import
expected: After a rejected import (bad JSON / schema-invalid / blocked-key), the form fields stay filled and the inline error message clears on the next input change.
result: [pending]

### 4. CORS-refused URL — on-screen message and toast
expected: Pasting a URL from a host without permissive CORS shows the specific "could not fetch — download and upload instead" message inline, not a generic error, plus the global toast. The underlying `.code === 'fetch-failed'` path was already proven with a Node harness; what is unverified is the rendering of that message in a real browser.
result: [pending]

### 5. Hostile payload through the 4 live render sinks
expected: A spell whose description carries `<img onerror=...>` plus an inline `<script>` opens in the card, side panel, and detail screen, and prints, with no `alert` firing and no execution in the console — across all four `dangerouslySetInnerHTML` sinks.
result: [blocked]
blocked_by: No UI path exists to render a spell from an imported pack in this phase. `spells-data-loader.jsx` still carries a hardcoded 4-entry `SPELL_VERSIONS` and has no `pluginStore` reference; that dispatch is Phase 4 (SRD-03) scope. Test 5 becomes runnable once Phase 4 lands. Partial coverage already obtained: the human ran step 17 on 2026-08-11 and confirmed the STORED description came back as `"<p>Texto normal antes.</p><p>Texto normal depois.</p>"` — the payload was stripped at import, before the write, so no sink can receive it. That covers the underlying risk by substitution but does NOT count as watching the four sinks not execute.

### 6. REQUIREMENTS.md tracking metadata
expected: Checkboxes and the Traceability table reflect Phase 3 completion. PKG-02, PKG-03, PKG-04, PKG-05 and SRD-01 currently still show `[ ]` / `Pending`; only PKG-01 shows Complete.
result: [pending]
note: Not a functional defect — the code is complete and behaviorally verified for all 6 IDs. `gsd-tools query phase.complete` updates REQUIREMENTS.md traceability automatically when the phase is marked complete, so this closes on its own at phase completion and needs no manual edit.

## Summary

total: 6
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 1

## Gaps
