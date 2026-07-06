# Colors as a constraint system — the forces, and the values they fill

A palette is not a list you pick. It's a **Sudoku**: a board, a few givens, and a set of
constraints that *force* the rest. You don't fill the board — the **constraints** do. This is
the capstone of [[color-model]]: values are coordinates, constraints are forces, a palette is
the equilibrium.

## The board and the cells

- **Board** — the perceptual color space, OKLCh: `(L, C, H, α)`. Four axes.
- **Cells** — each `(node-signature × color-property)` declaration: a slot that must hold a
  color. `body × color`, `card × background-color`, `link × color`, …
- **Values** — oklch typed objects `{colorSpace, l, c, h, alpha}` that fill the cells.

## The forces, and what each does to the values

Every constraint is a *pressure* on which value can sit in a cell. Each is a pinned, grounded
object ([[constraints]], [[color-properties]]):

| force | what it does to values | Sudoku analog |
|---|---|---|
| **JND** | quantizes the board — values within 1 JND are the *same*; a value must be ≥ 1 JND from its neighbors to count | digits are discrete (1–9), not a continuum |
| **Gamut** | a value must be realizable: `C ≤ ceiling(L, H)`; the ceiling is a lens, pinched at the L extremes | the edges of the board |
| **Degeneracy** | α = 0 → one transparent; C = 0 → hue gone; L = 0/100 → black/white | pre-filled corners, no freedom |
| **Contrast** *(coupling)* | a *text* cell's value must clear its tier (4.5 / 7 / 3 : 1) against its *bg* cell — a relation **between** cells | the row/column rule — two related cells can't be too close |
| **CVD** *(coupling)* | two cells that must be *told apart* can't rely only on hue on a confusable axis — the distinction must survive on **lightness** (color-vision deficiency, ~1/12 men, deletes hue channels, keeps lightness) | a second "these two can't collide" rule, on a channel the first didn't cover |
| **Powerless** | C < JND → the hue is noise → collapse to neutral | you can't write a digit no one can read |

**Contrast is the coupling force** — like Sudoku's rows and columns, it's a relation *between*
cells, not a property of one. It forces the L axis into **bands with a moat**: text here,
surface there, nothing between.

## The equilibrium is the palette

Apply all the forces at once and the free space collapses:
- **JND** → the board is ~**8,149 cells**, not infinite.
- **Gamut + Contrast compound**: AAA needs a wide L-moat, and the gamut's chroma ceiling is
  *lowest at exactly the L-extremes the moat forces you to* — so accessible palettes are
  **muted, banded, few**. The forces don't just limit color; they *mute* it.
- **Powerless + Degeneracy** collapse the boundaries.

## The givens, and the forced fill

As in Sudoku, almost everything is *forced*; you only choose the **givens**:

- **The givens = the hue axioms.** H is the one free axis — no gamut cost, no contrast cost.
  You choose ~2 hues. That is the *entire* free decision.
- **Everything else is forced.** Once the hues are set, the forces fill the rest: contrast
  forces the L bands; gamut caps C at each L; JND snaps to the grid; **the derivations
  (`oklch(from axiom …)`) ARE the forced completions** — a tint is not chosen, it is *the value
  the forces put in that cell*.

`derive-palette` finding 42 colors → **16 axioms + 26 derivations** is literally this: 16
givens, 26 forced cells.

## Why it has (nearly) one solution

A well-constrained Sudoku has a unique solution; a well-constrained palette nearly does.
Tighten the forces — AAA over AA, a coarser JND, fewer hues — and the free space shrinks toward
a point. **The restrained, muted look of an accessible palette isn't a style — it's the
equilibrium the forces settle into.** You don't design the palette. You choose the hues and let
the constraints solve it.

## The system, one line

**Values are coordinates; constraints are forces; a palette is the equilibrium.** The forces
(JND, gamut, degeneracy, contrast, powerless) — each a pinned grounded object — act on the
values (oklch atoms) across the cells (node × property), and what fills the board is not chosen
but *forced*, from a handful of hue givens.

**Colors don't fill the constraints. The constraints fill the colors.**
