# Epic — deploy the color work + design system to prod (both public sites)

Beads is not configured for this checkout (`prx beads` → no `.beads/`), so this stands in as
the epic. Convert to `bd` tasks in the execution session.

## Ground truth (from reconnaissance, 2026-07-06)
- **Design system EXISTS + is mature** — `bounded-systems/brand` v1.4.0 (npm-published, mint
  provenance). `@layer baobab` + `@property` typed tokens, Style Dictionary from `tokens.json`,
  semantic palette (forest/paper/ink/clay/amber + grade-* + on-dark), spacing/radius/control
  scales. Colors are **HEX**, not oklch.
- **a11y tooling EXISTS + exceeds ours** — `token-a11y.yml` (APCA/CVD/non-text/typography) +
  active branch `feat/check-contrast-dogfood-baobab` wiring **baobab** `checkContrast()`.
  Our `contrast.mjs` is WCAG-ratio only. **baobab is the checker; don't reinvent it.**
- **synoptic is the THEORY** — `spec/color-model.md`, the oklch/JND grounding, AAA-by-
  construction, the pinned scale, `proof/Contrast.lean`, and the blog. Complementary, not a
  replacement for brand or baobab.
- Both sites are **generated** (bounded.tools, robertdelanghe.dev — hermetic Nix); the
  `palette` plugin consumes `@bounded-systems/brand`'s tokens.css.

## Tasks (dependency order)
1. **[P0 context]** Reconcile the theory with the product. Decide what (if anything) the
   color-model work contributes to brand: e.g. migrate hex tokens → oklch (grounded,
   gamut/powerless-clean), and add AAA-by-construction as a brand *constraint* baobab can check
   — WITHOUT duplicating baobab. Land on the active `feat/check-contrast-dogfood-baobab` branch
   or a fresh one, respecting Style Dictionary (edit `tokens.json`, not the generated css).
2. **[brand]** If oklch migration is in scope: `tokens.json` hex → oklch, regenerate via
   Style Dictionary, ensure `token-a11y` + baobab checks stay green. PR → review → merge.
3. **[synoptic]** Publish the blog as a generated route (`blog/colors-are-coordinates.*`)
   through `build-site.mjs`, styled from the brand tokens (not the vendored copy).
4. **[bounded.tools]** Bump `@bounded-systems/brand`; add the blog route. PR + CI.
5. **[robertdelanghe.dev]** Same. PR + CI.
6. **[GATE ×2]** Prod deploys — CI green → **human approves** → live. NOT self-approved.

## Guardrails
- Reuse, don't reinvent: brand (tokens) + baobab (a11y) are the products; synoptic is theory.
- Style Dictionary owns the generated css — edit `tokens.json`.
- Respect the active branch; don't clobber in-progress contrast work.
- Prod deploys are gated; the agent prepares PRs, the human approves the gate.

## P0 reconcile — DONE (read-only audit of the real brand palette, 2026-07-06)

Ran the color-model tools on brand's actual tokens + its `contrast.contract.json`. Findings:
- **Exact duplicate**: `color-paper` == `color-card-alt` == `#EDEAE1` (two names, one color).
- **7 powerless hues** (sub-JND tint, name a hue the eye can't see): `color-paper`,
  `color-forest-tint`, `color-on-forest`, `color-clay-tint`, `grade-aspirational-bg`,
  `grade-aspirational-on-dark`, `color-card-alt`.
- **15 near-duplicate pairs** (ΔEOK < 0.02).
- brand's contract targets **AA (4.5:1)**, not AAA — our "AAA by construction" aimed higher
  than the product's own bar.
- The colors ARE bounded.tools' palette (`color-forest`→oklch 41.69/.0817/166; `color-ink`→
  oklch 23.84/.0204/162.6) — confirmed the site derives from brand.

**Conclusion — what the theory contributes (and what it must NOT duplicate):**
- **Contrast = baobab's job** (APCA/CVD/non-text > our WCAG-ratio). Do not reinvent.
- **Unique contribution = color HYGIENE** baobab doesn't cover: powerless-hue detection,
  near-dupe/exact-dupe merge, gamut — plus oklch grounding. Composes with baobab.

**Concrete first brand PR (execution session):** a color-hygiene check — dedupe
`color-paper`/`color-card-alt`, flag the 7 powerless tints — edited in `tokens.json` (Style
Dictionary source), on the active `feat/check-contrast-dogfood-baobab` branch, kept green
through `token-a11y`. Small, real, non-duplicative. Then blog route → site bumps → gated deploy.

## Palette route — engine DONE, per-site config PENDING (both sites)

`build-site.mjs` now has `render: "palette"` (v0.19.0) — verified. To publish the palette on a
site, add ONE page to that site's `synoptic.config.json` → `build.pages`:

```json
{ "id": "palette", "title": "Palette", "route": "palette", "render": "palette",
  "query": { "type": "PropertyValue", "where": { "additionalType": "color" } } }
```

Then the site generates `/palette/` from ITS OWN brand tokens (bounded.tools →
@bounded-systems/brand; robertdelanghe.dev → @bdelanghe/brand), Merkle-rooted, in the grounded
form. **Do this in BOTH repos** (bounded.tools.git, robertdelanghe.dev) as PRs → CI → gated
prod deploy. The standalone `blog/palette.html` (gen-palette-page) is the static preview; the
route is the production form.
