# Recommended Changes

Review of the current PoC (Vue 3 + Vite, client-only, `localStorage`-backed). Ordered roughly by severity.

## Bugs

### 1. Card list breaks after the first page load (critical)
`src/composables/useCardDatabase.js:11-18` — `saveCards()` persists the wrapped shape
`{ cards: [...] }`, but `loadCards()` reads it back as `cards.value = JSON.parse(saved)`,
assigning the *wrapper object* to `cards.value` instead of `JSON.parse(saved).cards`.

- 1st visit (no `localStorage` entry): fetches `/cards.json`, sets `cards.value` to the
  array correctly, then calls `saveCards()`.
- Every visit after that: `cards.value` becomes `{ cards: [...] }`, not an array. Every
  `cards.value.find/.filter` call throughout `useCalculator.js`, `Battlefield.vue`, and
  `CardEditor.vue` then throws, and the app is unusable until `Reset` is clicked (which
  itself calls `loadCards()` again and re-triggers the bug).

Fix: `cards.value = JSON.parse(saved).cards`.

### 2. Hardcoded creature list ignores custom cards added via the Card Editor
`src/composables/useCalculator.js:98` — `calculateProwess` only evaluates prowess for a
fixed array (`Sokka, Tenacious Tactician`, `Narset, Enlightened Exile`,
`Veyran, Voice of Duality`), and their base power/toughness are hardcoded in a chain of
`if`/`else if` (lines 111-114). A card added through `CardEditor.vue` with a `prowess`
effect (which the UI explicitly supports selecting) will never appear in `prowessResults`,
and has no base P/T defined. This makes the "Add Card" feature non-functional for its
main use case (custom prowess creatures).

Fix: derive the creature list and base P/T from `cards.value` (e.g. add a
`basePower`/`baseToughness` field to card definitions and iterate all in-play cards with
a `prowess` effect targeting `self`, rather than a fixed name list).

### 3. `isAlly()` hardcodes specific card names
`src/composables/useCalculator.js:45-49` — ally detection is `name.includes('ally')` plus
two hardcoded exceptions (`'Sokka, Tenacious Tactician'`, `'Wartime Protestors'`). Any
new ally creature added via the editor whose name doesn't contain "ally" won't be
recognized. This should be a data-driven flag (e.g. `isAlly: true` on the card, or a
`creatureType` field) rather than a name-based heuristic embedded in calculator logic.

### 4. `allyEnters` effect type is defined but never implemented
`public/cards.json:57` — `Wartime Protestors` has an `allyEnters` effect with
`counterAmount`/`gainsHaste`, but `useCalculator.js` only switches on `prowess`,
`tokenOnCast`, `triggerDoubler`, `tokenDoubler`, `anthem`, and `magecraft`. This effect is
silently a no-op. Either implement it or remove it from the seed data until it is.

### 5. Anthem bonuses ignore `effect.targets`
`src/composables/useCalculator.js:183-199` (`anthemBonus`) sums `power`/`toughness` from
every in-play `anthem` effect regardless of its `targets` value (`all` / `tokens` /
`allies`). Two consequences:
- A "tokens only" anthem (e.g. `Intangible Virtue`) is folded into the same total as an
  "all creatures" anthem, and that combined total is then applied uniformly to
  `allyTokenFinalStats` (`useCalculator.js:201-208`), which is only correct by
  coincidence (ally tokens happen to be both tokens and allies).
- Conversely, an "all creatures" anthem is never applied to `prowessResults` /
  `combatProwessResults`, so Sokka/Narset/Veyran's displayed final P/T don't reflect an
  active anthem even though they should.

Fix: filter/apply anthem effects per-target rather than summing them into one blind total.

## Design issues worth addressing

### 6. Cards are keyed by `name` everywhere, with no stable id
`inPlay[card.name]`, `choiceSelections[cardName]`, and the `:key="card.name"` in
`v-for` loops all use the display name as an identity key
(`useBattlefield.js`, `Battlefield.vue`, `CardEditor.vue`). Renaming a card orphans any
saved battlefield/choice state, and two cards with the same name (easy to create via the
Add Card form, which has no uniqueness check) will silently collide. A generated `id`
field per card would make this robust.

### 7. Silent `localStorage` failure handling
`useBattlefield.js:7-16` and `useCardDatabase.js:9-24` swallow all `localStorage`/JSON
errors (`catch {}` / `catch (e) { console.error(...) }` then reset to empty). Corrupted
or quota-exceeded storage fails silently from the user's perspective — the app just loses
state with no indication why. Worth at least a visible toast/log the user can see, since
this is the only persistence layer in the app.

### 8. `importCards` performs no shape validation
`useCardDatabase.js:54-66` only checks `data.cards` is an array; it doesn't validate
individual card/effect shapes. A malformed paste (e.g. an effect missing `type`) will
import successfully and then throw inside `useCalculator.js` on the next render. Consider
validating each card/effect against the known effect schema before accepting the import,
and surfacing a specific error instead of `alert('Invalid JSON')`.

### 9. No tests, linting, or CI
There is no test runner, ESLint/Prettier config, or CI workflow in the repo. Given bug #1
above is exactly the kind of regression a couple of unit tests around
`useCardDatabase`'s load/save round-trip would have caught immediately, adding a minimal
Vitest setup for the composables (`useCalculator` in particular, since it's the core
scoring logic) would pay for itself quickly.

## Minor / polish

- `public/cards.json` is only ever read once (first run) and then shadowed by
  `localStorage` indefinitely (see #7/#8 context) — there's no way for a user to pick up
  new default cards shipped in a future `cards.json` update without manually clicking
  "Reset", which also wipes any cards they've added. Consider versioning the seed data
  (e.g. a `schemaVersion` field) and merging/prompting on mismatch instead of full
  overwrite-or-nothing.
- Icon-only buttons (combat counter arrows, chevrons) have no `aria-label`/`title`,
  hurting screen-reader usability.
- `index.html` has no favicon.
