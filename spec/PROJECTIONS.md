# Projections — one graph, aligned surfaces

Every output is a **projection of the one graph**: `project(claim subset) → surface`.
Markdown, JSON-LD, HTML, DTCG, the sitemap — all derive from the same atoms + claims, so
they can't drift. **CSS aligns the same way**: it's `project(design atoms +
selector→declaration claims) → CSS`, a projection like the others, not a separate
hand-authored asset. That's what makes the render path align with Markdown and JSON-LD.

| Surface | Projection of… | Claim subset | Grounded in |
|---|---|---|---|
| **JSON-LD** `/json.ld` | the graph itself | all nodes + links | JSON-LD 1.1 (REC) |
| **Markdown** `/*.md` | content | `is-a` content claims (strings) | CommonMark |
| **HTML** page | content + design | content + `selector→declaration` | CSS Cascade 5 · Syntax 3 |
| **CSS** stylesheet | design | design atoms + `selector→declaration` claims | CSS Syntax 3 · Cascade 5 · Selectors 3 |
| **DTCG** export | tokens | `is-a token` claims | DTCG 2025.10 |
| **sitemap** | pages | `is-a page` claims | sitemaps.org 0.9 |

## Why they align by construction

- **Same atoms.** A color used in the HTML, named in the CSS, exported to DTCG, and
  listed in JSON-LD is **one value atom** (canonical oklch) — the surfaces reference it,
  they don't re-encode it. Change the atom, every surface moves together.
- **Same structure.** A CSS rule is `selector → declarations` = **a query binding
  key-value atoms** — identical to a projected HTML component (context → declarations) and
  to a page (query → content). One shape, three renderings.
- **Same proof types.** Declared values are axioms; the resolved CSS, the rendered HTML,
  and the DTCG export are all `derivable` from them via their projection function (the
  cascade, the template, the DTCG serializer).

## The CSS render path, aligned

```
graph (content atoms + design atoms + selector→declaration claims)
  ├─ project → JSON-LD   (the graph)
  ├─ project → Markdown  (content claims)
  ├─ project → CSS       (design atoms + selector→declaration claims)   ← the render path
  ├─ project → HTML      (content + the projected CSS)
  └─ project → DTCG      (token claims)
```

So CSS stops being a separate authored file and becomes **the design projection of the
graph** — the same source the Markdown and JSON-LD come from. Later, CRT/critical CSS is
just a *sub-projection*: `project(design claims for above-the-fold selectors) →
inline <style>` (CSS Style Attributes).
