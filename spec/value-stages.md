# CSS value stages — the cascade as a derivation chain

Grounded in **CSS-CASCADE-5** (declared → specified → computed → used) + **CSSOM**
(resolved). Each stage is *derived from* the previous by a named cascade step — so the
value pipeline is a derivation, and maps directly onto the proof ladder.

```
declared value    the author's value, per matching declaration        AXIOM / GROUNDED  (the source)
  ↓ cascade + inheritance + initial-value substitution
specified value   the winning value for the element                   derivable
  ↓ resolve relative units, keywords, references
computed value    absolutised (em→px, custom props resolved, …)       derivable
  ↓ layout
used value        after layout (percentages resolved to px, …)        derivable
  ↓ serialize (CSSOM)
resolved value    what getComputedStyle() returns                     derivable  ← WE EXTRACT THIS
```

## Consequences for our atoms

- **What `css-project`/`css-extract` capture is the RESOLVED value** (CSSOM term for
  what `getComputedStyle` returns) — not the declared value. Every extracted atom is
  therefore **`derivable`**: recompute it by running the cascade over the declared values.
- **The declared values are the axioms.** A complete "declare all leaves" captures the
  *declared* values (from the source CSS) as the axiom set; the resolved atoms we extract
  are `derived-from` them via the cascade. Two extraction fronts, one proof ladder.
- **Initial values are claims too.** From the CSS Color 4 property index:
  `color`'s initial value is **`CanvasText`** (a <system-color>, not black) — so the
  default text color is a semantic key; `opacity` initial `1`, clamped `[0,1]`. The
  initial value is a `grounded` claim (basis: the property's spec definition).

## Why this matters

Our whole extraction is honest about its proof type: **resolved values are `derivable`,
never axioms.** You never *declare* `rgb(22,34,28)` as truth — it's what the cascade
computed from `--color-ink` (declared) applied to `color` (whose initial is `CanvasText`).
The atom store already models this: `body.fg → alias-of/derived-from → --color-ink`
(declared) → its value. The cascade is just the derivation function.
