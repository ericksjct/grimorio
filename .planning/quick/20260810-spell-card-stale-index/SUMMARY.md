---
type: quick-summary
slug: spell-card-stale-index
status: complete
completed: 2026-08-10
---

# Summary

Fixed spell cards opening the wrong spell after the list was filtered.

**Files:** `v10-hifi.jsx`, `scripts/check-spell-card-callback-identity.tests.ps1`

**Cause:** `HifiSpellCard`'s `React.memo` comparator ignores function props, but
both call sites passed inline arrows capturing the index into `filtered`. Cards
that survived a filter change never re-rendered, so they kept a stale index
(and a stale `liveChar` in the prepared toggle).

**Change:** callbacks now have stable identity (`useCallback` + a ref holding
`{ filtered, liveChar, update }`) and receive the spell as an argument; the card
forwards `s` on both click and ribbon toggle.

**Verified:** Playwright run over the 7 "flame" results — each card opens its
own spell on desktop and mobile; ribbon toggle intact. Static check added and
confirmed to fail on the pre-fix file.
