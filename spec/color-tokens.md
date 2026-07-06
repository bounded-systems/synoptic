# Color tokens — the decision (typed objects, CAS-named, no roles)

Brand's color tokens are **not** hex values with invented semantic names. Each color is
**one typed object** — the CSS Typed OM internal representation
(drafts.css-houdini.org/css-typed-om/#css-internal-representation), == our
`spec/value/color.schema.json`, == DTCG structured color:

```json
"oklch-41_69-0_0817-166_22-1": {
  "$type": "color",
  "$value": { "colorSpace": "oklch", "l": 41.69, "c": 0.0817, "h": 166.22, "alpha": 1 }
}
```

**That object is the source of truth.** Everything else is a *projection* of it:
- CSS custom property — `--oklch-41_69-0_0817-166_22-1: oklch(41.69% 0.0817 166.22 / 1);`
- Typed OM (native) — `element.computedStyleMap().get(prop)` ⇢ the same `{l,c,h,alpha}`
- CAS name — the object inlined (`oklch-l-c-h-alpha`) — content address, dedups by meaning
- ΔEOK / contrast — computed from `l,c,h` directly, no re-parsing
- a derivation (tint/shade/fade/step) — a per-axis transform *on the object*

Rules:
- **No roles** — `--forest`/`--ink`/`--paper` are removed. Roles (if ever needed) are an
  optional thin alias layer, a *derived claim*, never the source.
- **No hex, no invented names** — a color is its coordinates.
- **Deduped** — identical values are one atom (brand's 53 named colors → 31 atoms;
  `paper`==`card-alt` collapse). Powerless (sub-JND) hues neutralize.
- **Derived, not flat** — the 31 reduce to a few oklch axioms + relative-color/color-mix
  derivations (`derive-palette`); only axioms are magic.

Emit: `tokens.json` holds the typed objects (CAS-named) → the generator serializes CSS
`oklch()` + a DTCG `tokens.json`. Same object, three surfaces. Grounded: CSS Typed OM
(internal representation) · CSS Color 4 (oklch) · DTCG (structured color) · spec/color-model.md.
