# Color properties — the keys, and the constraint each one derives

A color declaration is `merkle(keyAtom, valueAtom)`. The **value atom** is the color's oklch
coordinate (grounded, [[color-model]]); the **key atom is the full CSS property name** —
`color`, `background-color`, `border-top-color` — never an invented role (`fg`/`bg`). Same
discipline on both sides: no invented names.

The point of using the property name: **the accessibility constraint is *derived from the
property*, not hand-labelled.** The property tells you which WCAG SC applies and therefore the
ratio. Machine form: `spec/color-properties.json`.

## The color-valued properties → their constraint tier

The *set* of color keys is derivable from **webref** (which properties accept `<color>` in
their value grammar); the *tier* is grounded in **WCAG 2.2**.

| property (key) | tier | WCAG SC | ratio |
|---|---|---|---|
| `color`, `-webkit-text-fill-color`, `-webkit-text-stroke-color` | **text** | 1.4.3 · 1.4.6 | AA 4.5 / large 3 · AAA 7 / large 4.5 |
| `background-color` | **ground** | — | the reference text is measured *against* |
| `border-*-color` (physical + logical), `column-rule-color` | **non-text** | 1.4.11 | 3:1 (when it conveys boundary/state) |
| `outline-color` | **non-text** | 1.4.11 (+ 2.4.7 / 2.4.11) | 3:1 — focus indicator |
| `text-decoration-color`, `text-emphasis-color` | **non-text** | 1.4.11 (+ 1.4.1 if sole link cue) | 3:1 |
| `caret-color`, `accent-color` | **non-text** | 1.4.11 | 3:1 (UI parts) |
| `fill`, `stroke` (meaningful graphics) | **non-text** | 1.4.11 | 3:1 |
| `stop-color`, `flood-color`, `lighting-color`, decorative uses | **exempt** | 1.4.3 (incidental) | none |

## The constraint is a claim on a *pairing*, derived from the key

The color atom is **context-free** — `oklch-91_13-…` is just a light teal, neither accessible
nor not. The constraint attaches to the **declaration pairing**, and its tier is a *function of
the property name*:

```
constraint( color-atom  ON  background-color-atom )
   tier   = tierOf("color")            → text        (1.4.6)
   ratio  = 7:1 at AAA
   verify = contrast(fg, bg) ≥ 7:1
```

Swap the key and the same machinery derives a different rule — `border-top-color` → `non-text`
→ 3:1. Nobody typed "fg needs 7:1"; it falls out of `color` being text-valued.

## What reads it

- **baobab / `contrast`** look up the property in `color-properties.json`, get the tier, and
  check the pairing at the target level (AA/AAA). No role labels.
- **`css-project`** already CAS's key ⊕ value; this makes the key the *property name* and lets
  each declaration carry its derived constraint as a claim (proofType `derivable` — the tier
  derives from the property + the SC).
- A pairing that fails is a **claim that doesn't hold** — surfaced, not hidden.

## Grounding

- **Property set** — webref (`@webref/css`), the `<color>`-accepting properties; specs: CSS
  Color 4, CSS Backgrounds 3, CSS Logical 1, CSS UI 4, CSS Text Decoration 4, SVG 2, Filter
  Effects 1.
- **Tiers** — WCAG 2.2 · SC 1.4.3 (Contrast Minimum) · 1.4.6 (Contrast Enhanced) · 1.4.11
  (Non-text Contrast) · 1.4.1 (Use of Color) · 2.4.7 / 2.4.11 (Focus Visible / Appearance):
  https://www.w3.org/TR/WCAG22/
- See [[color-tokens]] (the value side) and [[color-model]] (the whole model).
