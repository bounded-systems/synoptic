# Hermetic CSS — a deterministic cascade

**Goal:** the computed (resolved) value of every element is a *pure, deterministic
function of the declared atoms* — no dependence on source order, specificity accidents,
or ambient inheritance. This is the hermetic-build philosophy applied to CSS, and it's
what makes our `resolved → derivable` proof type actually hold: a `derivable` claim MUST
recompute to the same value, which requires a deterministic cascade.

## The modern cascade tools (grounded)

| Tool | Does | Spec · status |
|---|---|---|
| `@layer` (cascade layers) | **explicit, deterministic cascade order** — kills specificity wars & source-order accidents | **CSS Cascade 5** · CR — w3.org/TR/css-cascade-5/ |
| `all: revert` / `unset` / `initial` | **reset to a known baseline** — no ambient inheritance leaking in | **CSS Cascade 4** · CR — w3.org/TR/css-cascade-4/ |
| `@scope` | **subtree isolation** (donut scope) — styles don't leak in or out | **CSS Cascade 6** · WD — w3.org/TR/css-cascade-6/ |
| `@property { inherits: false }` | **controlled inheritance** for custom properties | **CSS Properties & Values** · CR — w3.org/TR/css-properties-values-api-1/ |
| `:where()` | **zero specificity** — predictable, non-escalating | **Selectors 4** · WD — w3.org/TR/selectors-4/ |

## The hermetic recipe (what our CSS projection SHOULD emit)

1. **Reset the boundary** — `all: revert` (or `initial`) at each projected component root,
   so nothing ambient inherits in. The element starts from a known baseline.
2. **Order in layers** — emit rules into named `@layer`s (`reset, tokens, base,
   components, utilities`), so the cascade order is *declared*, not accidental. No `!important`,
   no specificity escalation.
3. **Scope each component** — `@scope` (or a scoping convention) so a component's rules
   can't leak past its subtree.
4. **Zero-specificity selectors** — author with `:where()` so specificity is uniform and
   overrides are explicit (via layer order), not implicit (via selector weight).
5. **Declare, don't inherit** — `@property inherits:false` for tokens that shouldn't cascade.

## Why it closes the proof loop

```
declared atoms  ──(deterministic cascade: layers + scope + reset)──▶  resolved value
                                                                       proofType: DERIVABLE ✓
```
With a hermetic cascade, `resolve(declared) → computed` is a **pure function**: re-run it
and get the same atoms, byte-for-byte. That's exactly what `derivable` promises and what
`verify-artifact`/the merkle roots assume. A non-hermetic cascade would make the resolved
atoms non-reproducible — the claim would be `derivable` in name only. So hermetic CSS
isn't a style preference; it's what makes the value layer's proof types **true**.

## Containment — the browser declaring a bounded scope (CSS Contain 1 · REC)

`contain: layout | style | paint | size` is the browser-native way to **declare that a
subtree is a self-contained, independent unit** — its internals don't affect the outside,
and nothing ambient leaks in. This is the *enforcement* the hermetic recipe was missing,
and it's the bounded-systems ethos down to the pixel:

```
bounded authority  →  bounded scopes (pages, components, queries)  →  bounded rendering (contain)
```

A **contained subtree is, at once:**
- a **hermetic** unit — isolation, browser-enforced (not just convention);
- a **component** boundary — our projected component = a contained subtree;
- an **audit partition** cell — auditable in isolation, matching the MECE partition;
- a **scope** — pairs with `@scope`/`@layer`/`all: revert` for full determinism.

Values: `layout` (independent layout), `style` (scoped counters/quotes), `paint` (clip to
box), `size` (box size independent of contents); `content` = layout+paint+style;
`strict` = all. `content-visibility: auto` additionally skips off-screen rendering
(performance + the CRT critical-render path).

**So our CSS projection emits `contain` on each component root** — the boundary the model
already declares (a component, a query scope) becomes a boundary the *browser* enforces.
The bound is no longer a claim we make; it's a fact the runtime keeps.
