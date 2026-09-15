# v1.02 — Mantra role layout

The legacy single-role rules use repeated IDs, !important, a 28 px width,
50% radius and hidden overflow. They clipped groups of Mantra circles.

Role geometry now has one owner in `styles/roles.css`, in the
`mantra-role-layout` cascade layer. Its important declarations beat legacy
unlayered important declarations without another specificity escalation.
Obsolete group/list overrides were removed from both Mantra stylesheets.
Classic roles and auction rules are unchanged.

Lists reserve 84 px for three 26 px circles and two 3 px gaps. Extra roles
wrap instead of shrinking or overflowing into the player name. Purchases and
previously auctioned players use two text lines on narrow layouts. The
listone owner has its own line. Card roles and club names use separate lines.
The role observer also covers manual assignment and roster player previews.

Validation: JavaScript syntax and git diff checks passed. Existing 9 debug
and bidding regression tests passed. Browser visual verification was blocked:
the remote browser could not open local HTTP or data-URL previews. No live
rooms were used. Do not treat this as a completed visual acceptance test.

Visual acceptance still required at 320, 390, 768 and 1440 px in light/dark:
- My roster, team roster, all rosters: 1, 2, 3 and 4 roles; long names.
- Player listone: available and owned players; long owner names and values.
- Auctioneer list, already auctioned, nomination and manual assignment.
- Purchase management with price and restore controls.
- Player/auctioneer cards in READY, bidding and sealed modes; roster preview.
- Every token must be square, entirely inside its allocated area, and separate
  from other tokens and adjacent text. Classic PDCA must remain unchanged.
