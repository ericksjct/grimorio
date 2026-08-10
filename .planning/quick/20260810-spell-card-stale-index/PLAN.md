---
type: quick
slug: spell-card-stale-index
created: 2026-08-10
---

# Quick: spell card opens the wrong spell after filtering

Searching "flame" and clicking the 1st result opened the 4th ("Chama Contínua").

## Root cause

`HifiSpellCard` (v10-hifi.jsx:548) is `React.memo`'d with a custom comparator
that deliberately ignores function props. Both call sites (desktop grid,
mobile list) passed an inline arrow capturing `i` — the index into the current
`filtered` array:

```jsx
onClick={() => setSelectedIdx(prev => (prev === i ? null : i))}
```

Cards are keyed by spell, so a spell that survives a filter change keeps its
component instance. Since the comparator ignores `onClick`, those cards do not
re-render, and they keep the arrow captured from the *unfiltered* render.
Instrumented proof: after searching "flame", clicking card 0 ("Chama Sagrada")
fired with `i=6, len=391` — its index in the full 391-spell list. Only the last
card had a fresh closure.

`onTogglePrepared` had the same defect one level worse: it captured `liveChar`,
so a card that did not re-render after a character switch would prepare the
spell on the previous character.

## Fix

Make the memo comparator's assumption true: card callbacks get a stable
identity and receive the spell as an argument.

- `HifiSpellCard`: `onClick(s)` / `onTogglePrepared(s)`.
- Desktop + mobile: `onCardOpen` / `onCardPrepare` via `useCallback`, reading
  `{ filtered, liveChar, update }` from a ref at click time; index resolved
  from the live `filtered` array.
- Comparator comment rewritten as an explicit contract.

## Verification

- Playwright: clicking each of the 7 "flame" results opens that exact spell
  (counter 1/7 … 7/7), desktop and mobile; ribbon toggle still flips.
- `scripts/check-spell-card-callback-identity.tests.ps1` guards the contract
  (verified to fail against the pre-fix file).
