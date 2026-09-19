# Fluo DEV v1.06 — 19 settembre 2026

Branch: `dev-fluo-app-20260919`, based on the approved entry experiment at `003b8af`.
Production/main is not changed. The prior DEV commit remains available for rollback.

## Presentation ownership

`styles/matchday.css` owns the internal visual system in a named CSS layer. Its
important declarations take precedence over the unlayered legacy styles, without
adding another specificity ladder. Existing auction state visibility remains in
the existing styles; the new layer controls management tabs and filter disclosure.
`styles/entry-matchday.css` owns access screens. `scripts/theme-palettes.js` remains
the single palette source. Keep new visual fixes in these canonical files.

The viewport determines the auctioneer layout at 760 CSS pixels, on initial load,
session restoration and breakpoint changes. Resizing calls presentation helpers;
it does not rejoin a room, write a bid or restart a timer. Stored device mode is
metadata, not a preference. Game state, input nodes and filter selections persist.

## Verification

- JavaScript syntax checks and CSS parser passed.
- 67 DOM regression checks: all nine list disclosures, stable search node/query,
  active filter indicators, Mantra all/none results, management tab persistence,
  desktop/mobile switching, live/preparing state dispatch, chooser removal.
- Browser: public home → role → Banditore enters the existing room form directly;
  the active element is BODY, not an input.
- Browser UI fixture: management tabs retain timer value 47; search and filter
  button are adjacent; opening/closing filters leaves focus on the button;
  Mantra selections change results while preserving the search query.
- Visual inspection of desktop management, lists and both auction dashboards in
  dark and light palettes. Corrected light-theme player name contrast.

No authenticated live auction or physical-phone test was performed. The browser
provided no viewport emulation. Automatic breakpoint behavior was checked in the
DOM harness; narrow-screen CSS still needs the user's device trial before release.

## Reproduce UI checks

Install `linkedom@0.18.12` and `css-tree@3.1.0` in a temporary dependency directory.
Run from the repository root with `NODE_PATH` pointing to that directory's
`node_modules`:

```
node qa/matchday-regression.cjs
node qa/build-matchday-fixture.cjs
```

`qa/matchday-preview.html` is a standalone visual fixture generated from actual
markup and styles. It loads the real theme/filter/management helpers, uses clearly
fictional data and omits the app client, authentication, PWA and database scripts.
Its CSP blocks connections and form submission. It is not an auction simulator.
